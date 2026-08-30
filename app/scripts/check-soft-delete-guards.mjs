#!/usr/bin/env node
/**
 * Fail the build when a table that can be soft-deleted has no soft-delete guard.
 *
 * ── WHY THIS EXISTS ──
 *
 * `guard_soft_delete()` was specified in 05_ROLES_AND_RLS.md section 4 from the
 * start of the project and was never created. No function, no trigger, nothing
 * referencing it. Two people read that document as a description of the
 * database before anyone checked.
 *
 * The consequence was the most destructive gap in the schema: soft delete is an
 * UPDATE that sets `deleted_at`, so a data_entry account could delete any
 * person, partnership or session. Deleting a person removes them from A1.3,
 * B1.2, D0.1, E0.2 and every disaggregation, retroactively, in quarters already
 * reported.
 *
 * Migration 0069 built it and attached it to all 40 tables by walking the
 * catalogue. That walk runs ONCE. A table created afterwards carries
 * `deleted_at` and no guard, and nothing says so.
 *
 * ── WHAT THIS CHECKS, AND WHY IT IS NOT JUST A SNAPSHOT ──
 *
 * `supabase/.soft_delete_guards` is a committed snapshot: one line per table
 * carrying `deleted_at`, marked `guarded` or `UNGUARDED`. On its own that is a
 * weak check -- a snapshot of a passing state passes forever, and a table added
 * later simply is not in it.
 *
 * So this reads the MIGRATIONS as well. Every `create table` in
 * supabase/migrations that declares a `deleted_at` column must appear in the
 * snapshot. A new soft-deletable table therefore fails the build in the same
 * commit that introduces it, whether or not anyone remembered to regenerate the
 * snapshot.
 *
 * Two ways to fail, and both are real:
 *
 *   UNGUARDED in the snapshot   the trigger is genuinely missing
 *   in migrations, not listed   a new table, and the snapshot is stale
 *
 * ── REGENERATING THE SNAPSHOT ──
 *
 * One query against the linked project:
 *
 *   select string_agg(
 *            c.relname || ' ' ||
 *            case when exists (select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid
 *                               where t.tgrelid=c.oid and p.proname='guard_soft_delete'
 *                                 and not t.tgisinternal)
 *                 then 'guarded' else 'UNGUARDED' end,
 *            E'\n' order by c.relname)
 *   from pg_class c join pg_namespace n on n.oid=c.relnamespace
 *   where n.nspname='public' and c.relkind='r'
 *     and exists (select 1 from pg_attribute a where a.attrelid=c.oid
 *                  and a.attname='deleted_at' and not a.attisdropped);
 *
 * If this fails on a table you just created, attach the trigger in the same
 * migration, then regenerate. Do not add the line by hand -- the point of the
 * snapshot is that it came from the database.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const migrationsDir = join(root, 'supabase', 'migrations')

const snapshot = readFileSync(join(root, 'supabase', '.soft_delete_guards'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [table, state] = l.split(/\s+/)
    return { table, state }
  })

const unguarded = snapshot.filter((r) => r.state !== 'guarded')
const listed = new Set(snapshot.map((r) => r.table))

/**
 * Find every `create table [if not exists] [public.]<name> ( ... )` whose body
 * declares a `deleted_at` column.
 *
 * Deliberately naive about SQL: it looks at the text between the opening
 * parenthesis and the next `);` at the start of a line, which is how every
 * create table in this repo is written. A false positive fails the build and
 * gets looked at; a parser that tried to be clever would fail quietly.
 */
const declared = new Set()
for (const file of readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s*\(/gi
  let m
  while ((m = re.exec(sql)) !== null) {
    // Walk to the matching close paren rather than looking for "\n);". The
    // literal-terminator version found only 22 of 40 tables, because the
    // formatting varies -- and a scan that silently misses a table is exactly
    // the kind of check this project has been bitten by four times.
    let depth = 0
    let end = m.index + m[0].length - 1
    for (let i = end; i < sql.length; i++) {
      if (sql[i] === '(') depth++
      else if (sql[i] === ')') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (/\bdeleted_at\b/.test(sql.slice(m.index, end))) declared.add(m[1])
  }

  // Tables created through a `format(%I)` loop over a name array.
  //
  // This was the hole. The scan could only see literal `create table <name>`,
  // so 18 ref_* tables were invisible and the message said so -- and then 0075
  // added EIGHT more the same way and this check passed anyway, because a
  // stale snapshot cannot notice a table it has never heard of. It would have
  // passed just as happily if the triggers had been forgotten.
  //
  // The names are not really hidden: they sit in the `array[...]` literal that
  // drives the loop. Read them, and require the loop body to declare
  // deleted_at, which is what makes them soft-deletable in the first place.
  const loopRe = /array\s*\[([^\]]+)\]([\s\S]{0,2000}?)end\s+(?:loop|\$)/gi
  let lm
  while ((lm = loopRe.exec(sql)) !== null) {
    if (!/\bdeleted_at\b/.test(lm[2])) continue
    for (const q of lm[1].matchAll(/'([a-z0-9_]+)'/g)) declared.add(q[1])
  }

  // A table that was later dropped is not a gap. Files are read in filename
  // order -- which is migration order, enforced by check_migration_files.sh --
  // so a drop always follows the create it undoes.
  //
  // This is rare and should stay rare: CLAUDE.md forbids dropping anything
  // holding data. The one real case is ref_event_type, created by 0027 and
  // removed by 0029 when the OQ-12 form work was reverted.
  const dropRe = /drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi
  while ((m = dropRe.exec(sql)) !== null) declared.delete(m[1])
}

const missingFromSnapshot = [...declared].filter((t) => !listed.has(t)).sort()

if (unguarded.length > 0 || missingFromSnapshot.length > 0) {
  console.error('\ncheck-soft-delete-guards: FAIL\n')

  if (unguarded.length > 0) {
    console.error('These tables can be soft-deleted and have no guard_soft_delete trigger:\n')
    for (const r of unguarded) console.error(`  ${r.table}`)
    console.error(
      '\nSoft delete is an UPDATE that sets deleted_at. Without the trigger, any\n' +
        'role the update policy admits can remove a record from every indicator\n' +
        'it appears in, retroactively, including reported quarters.\n',
    )
  }

  if (missingFromSnapshot.length > 0) {
    console.error('These tables declare deleted_at in a migration but are not in the snapshot:\n')
    for (const t of missingFromSnapshot) console.error(`  ${t}`)
    console.error(
      '\nEither the table is new and needs the trigger attached in its own\n' +
        'migration, or the trigger is attached and supabase/.soft_delete_guards\n' +
        'is stale. Regenerate it with the query in this script\'s header --\n' +
        'do not add the line by hand.\n',
    )
  }
  process.exit(1)
}

/**
 * What the migration scan CANNOT see, said out loud.
 *
 * The 18 ref_* tables are created inside a plpgsql loop as
 * `create table if not exists public.%I (...)`, so their names exist only at
 * run time. The scan sees the template, not the tables.
 *
 * That is a real limit, not a rounding error: a new ref_* table added to that
 * loop would be invisible to the second check. The snapshot still covers it,
 * because the snapshot comes from the catalogue -- but only once someone
 * regenerates it.
 *
 * Printed every build rather than buried in a comment, because a check that
 * quietly covers less than it appears to is the thing this project keeps
 * getting caught by.
 */
const templated = readdirSync(migrationsDir).some((f) =>
  /create\s+table\s+if\s+not\s+exists\s+public\.%I/i.test(
    readFileSync(join(migrationsDir, f), 'utf8'),
  ),
)

console.log(
  `check-soft-delete-guards: ${snapshot.length} soft-deletable tables, all guarded; ` +
    `${declared.size} name-checked against migrations.` +
    (templated && snapshot.length > declared.size
      ? ` The remaining ${snapshot.length - declared.size} are built by format(%I)` +
        ` from a name array this scan could not read — the snapshot is the only` +
        ` check on those.`
      : ''),
)
