#!/usr/bin/env node
/**
 * Fail the build when errors.ts names a constraint or index that does not exist.
 *
 * ── WHY THIS EXISTS ──
 *
 * `CONSTRAINT_MESSAGES` maps a Postgres constraint name to a readable message.
 * A key that matches nothing is INVISIBLE: the error still surfaces, it just
 * falls through to the generic "something went wrong" text. Nothing throws,
 * no test fails, and the only symptom is a user getting a useless message.
 *
 * Three have been caught this way so far, all plausible, none real:
 *
 *     person_national_id_format        (actual: national_id_format)
 *     training_enrolment_unique        (actual: training_enrolment_person_id_session_id_key)
 *     exhibition_registration_unique   (actual: exhibition_registration_exhibition_id_person_id_key)
 *
 * The third one had been wrong for as long as the map existed, so every
 * duplicate market registration produced the generic message instead of
 * "this producer is already registered".
 *
 * Same class of failure as the migration-file check: the failure mode is
 * silence, so the guard has to be automatic.
 *
 * ── REGENERATING THE NAME LIST ──
 *
 * supabase/.constraint_names is committed, and comes from one query against
 * the linked project:
 *
 *   select string_agg(name, E'\n' order by name) from (
 *     select conname as name from pg_constraint c
 *       join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'
 *     union
 *     select i.relname from pg_index x
 *       join pg_class i on i.oid = x.indexrelid
 *       join pg_class t on t.oid = x.indrelid
 *       join pg_namespace n on n.oid = t.relnamespace
 *      where n.nspname = 'public' and x.indisunique
 *   ) all_names;
 *
 * Re-run it after any migration that adds or renames a constraint. If this
 * check fails on a name you just created, the list is stale -- regenerate it
 * rather than deleting the key.
 *
 * ── THE SECOND THING IT CHECKS: EMBED HINTS ──
 *
 * Migration 0113 gave every scoped child table a composite foreign key
 * `(parent_id, municipality_id)` beside its single-column one. PostgREST
 * then sees TWO relationships between the two tables and refuses every
 * embed across them with PGRST201 -- HTTP 300, "more than one relationship
 * was found". Nine embeds in src/data crossed such a pair, and from 13 to
 * 15 September 2026 the partners list, the training completions, the
 * contribution log, the exhibition registrations, the initiatives and the
 * linkage match all answered "no records yet" to a coordinator whose
 * records were there. Nothing threw; the refusal rendered as an empty state.
 *
 * Each of those embeds now names the relationship it means, with the FK's
 * constraint name: `market_linkage!market_linkage_initiative_id_fkey ( … )`.
 * That ties the app to a constraint name, which is exactly the thing this
 * script exists to verify -- so every `!word` hint anywhere in src/ that is
 * not PostgREST's own `inner`/`left` is checked against the same snapshot.
 * Rename a foreign key and the build fails here, rather than a screen going
 * quietly empty. Confirmed to fail on a misspelt hint, with and without a
 * `_fkey` suffix, not by reading it.
 *
 * ── THE THIRD: THE AMBIGUITY ITSELF ──
 *
 * A hint check only sees hints. The trap is the embed with NO hint across a
 * pair the schema joins twice -- the next composite key would recreate it.
 * The last section reads supabase/.foreign_keys (every foreign key, child,
 * parent, name, columns), resolves the base table of every `.select(...)`
 * in src/, walks each embed and its nested embeds, and fails on any that
 * crosses a two-key pair without naming a key. Confirmed to fail four ways
 * before it was trusted: a top-level hint removed, a nested hint removed, a
 * composite key added to the snapshot on a pair embedded by column, and one
 * added on a pair embedded by name from a dynamic base.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

const known = new Set(
  readFileSync(join(root, 'supabase', '.constraint_names'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean),
)

const source = readFileSync(join(here, '..', 'src', 'data', 'errors.ts'), 'utf8')

// Just the CONSTRAINT_MESSAGES object. TRIGGER_MESSAGES matches on message text
// rather than names, so it cannot be checked this way.
const block = source.match(/const CONSTRAINT_MESSAGES[^{]*\{([\s\S]*?)\n\}/)
if (!block) {
  console.error('check-constraint-names: could not find CONSTRAINT_MESSAGES in errors.ts')
  process.exit(2)
}

const claimed = [...block[1].matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:/gim)].map((m) => m[1])

if (claimed.length === 0) {
  console.error('check-constraint-names: parsed CONSTRAINT_MESSAGES but found no keys')
  process.exit(2)
}

const missing = claimed.filter((name) => !known.has(name))

if (missing.length > 0) {
  console.error('\ncheck-constraint-names: FAIL\n')
  console.error('errors.ts maps these names, and the database has no such constraint or index:\n')
  for (const name of missing) {
    // Offer the closest real name rather than just refusing -- the usual cause
    // is a plausible guess, and the real one is normally recognisable.
    const near = [...known]
      .filter((k) => {
        const stem = name.replace(/_(unique|key|check|format)$/, '')
        return k.startsWith(stem.slice(0, Math.max(8, stem.indexOf('_') + 1)))
      })
      .slice(0, 3)
    console.error(`  ${name}`)
    if (near.length) console.error(`      did you mean: ${near.join(', ')}`)
  }
  console.error(
    '\nA key that matches nothing is not a harmless typo: the error still\n' +
      'surfaces, it just falls through to the generic message and nobody finds\n' +
      'out. Read the real name from pg_constraint / pg_class.\n' +
      '\nIf you just added this constraint, supabase/.constraint_names is stale --\n' +
      'regenerate it with the query in this script\'s header.\n',
  )
  process.exit(1)
}

// ── embed hints ─────────────────────────────────────────────────────────────

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry) && entry !== 'database.ts') out.push(full)
  }
  return out
}

const hints = []
for (const file of walk(join(here, '..', 'src'))) {
  const text = readFileSync(file, 'utf8')
  // Every `!word` inside a select string that is not PostgREST's own `inner`
  // or `left`. Matching only names shaped like `_fkey` was tried first and
  // let a misspelt hint through, because the misspelling did not end in
  // `_fkey` either -- a check that only recognises correct-looking input
  // cannot catch incorrect input.
  for (const m of text.matchAll(/[a-z_]+!([a-z_][a-z0-9_]*)(?=[!\s(])/g)) {
    if (m[1] === 'inner' || m[1] === 'left') continue
    hints.push({ file: file.slice(join(here, '..').length + 1), name: m[1] })
  }
}

const badHints = hints.filter((h) => !known.has(h.name))
if (badHints.length > 0) {
  console.error('\ncheck-constraint-names: FAIL\n')
  console.error('these PostgREST embed hints name a foreign key the database does not have:\n')
  for (const h of badHints) console.error(`  ${h.file}: !${h.name}`)
  console.error(
    '\nAn embed hint that matches nothing is refused by PostgREST (PGRST200), and\n' +
      'a refused embed renders as an empty list. Read the real name from\n' +
      'pg_constraint, or regenerate supabase/.constraint_names if it is stale.\n',
  )
  process.exit(1)
}

// ── embed ambiguity ─────────────────────────────────────────────────────────
//
// The hint check above catches a hint that names nothing. This catches the
// trap itself: an embed with NO hint across a pair of tables the schema joins
// by two foreign keys. supabase/.foreign_keys is the schema's own list
// (child, parent, constraint, columns), regenerated with:
//
//   select string_agg(line, E'\n' order by line) from (
//     select c.conrelid::regclass::text || ' ' || c.confrelid::regclass::text
//            || ' ' || c.conname || ' ' ||
//            (select string_agg(a.attname, ',' order by k.ord)
//               from unnest(c.conkey) with ordinality as k(attnum, ord)
//               join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum)
//       from pg_constraint c join pg_namespace n on n.oid = c.connamespace
//      where c.contype = 'f' and n.nspname = 'public') x;
//
// Regenerate it after any migration that adds a foreign key. The check is
// static and reads the snapshot; a composite key added tomorrow is caught the
// day the snapshot is regenerated, not before -- the same limit as
// .constraint_names, and the reason the migration definition-of-done says to.
//
// How an embed is judged, following PostgREST's own rules:
//
//   relation(...)              the table name; ambiguous when the pair
//                              (base, relation) or (relation, base) has more
//                              than one foreign key
//   relation!fk_name(...)      resolved, if fk_name is one of that pair's keys
//   relation!column(...)       resolved, if exactly one of the pair's keys
//                              uses that column
//   column_name(...)           embedding by the FK column; resolved the same
//                              way as a column hint
//   alias:...                  an alias changes the JSON key, not the rule
//
// The base of a nested embed is the relation that encloses it.

const fks = readFileSync(join(root, 'supabase', '.foreign_keys'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [child, parent, name, cols] = l.split(' ')
    return { child, parent, name, cols: cols.split(',') }
  })

/** Every key between two tables, in either direction. */
function keysBetween(a, b) {
  return fks.filter((k) => (k.child === a && k.parent === b) || (k.child === b && k.parent === a))
}
const tables = new Set(fks.flatMap((k) => [k.child, k.parent]))

/** Split a select body on top-level commas. */
function splitTop(s) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map((x) => x.trim())
}

/** One entry of a select: { relation, hints, alias, inner } or null for a plain column. */
function parseEmbed(entry) {
  const m = entry.match(/^(?:([a-z_][a-z0-9_]*)\s*:\s*)?([a-z_][a-z0-9_]*)((?:!\s*[a-z_][a-z0-9_]*)*)\s*\(([\s\S]*)\)\s*$/)
  if (!m) return null
  const hints = (m[3].match(/[a-z_][a-z0-9_]*/g) ?? []).filter((h) => h !== 'inner' && h !== 'left')
  return { alias: m[1] ?? null, relation: m[2], hints, inner: m[4] }
}

const problems = []

function checkSelect(base, body, where) {
  for (const entry of splitTop(body)) {
    const e = parseEmbed(entry)
    if (!e) continue
    // A relation position holding an FK column of the base names one key --
    // provided only one key of the base uses that column. A composite key
    // that includes the same column makes the column name ambiguous too;
    // the first version of this test counted single-column keys only and let
    // exactly that case through.
    const byColumn = fks.filter((k) => k.child === base && k.cols.includes(e.relation))
    let target = null
    if (byColumn.length === 1 && byColumn[0].cols.length === 1) {
      target = byColumn[0].parent
    } else if (byColumn.length > 1) {
      target = byColumn[0].parent
      problems.push(
        `${where}: ${base} -> ${e.relation}(...) embeds by column, and ${byColumn.length} foreign keys use ` +
          `that column (${byColumn.map((k) => k.name).join(', ')})`,
      )
    } else if (tables.has(e.relation)) {
      target = e.relation
      const keys = keysBetween(base, target)
      if (keys.length > 1) {
        const resolved = e.hints.some(
          (h) => keys.some((k) => k.name === h) || keys.filter((k) => k.cols.includes(h)).length === 1,
        )
        if (!resolved) {
          problems.push(
            `${where}: ${base} -> ${e.relation}(...) has ${keys.length} foreign keys ` +
              `(${keys.map((k) => k.name).join(', ')}) and no hint saying which`,
          )
        }
      }
    }
    // Recurse with the embedded relation as the base, when it is known.
    if (target && tables.has(target)) checkSelect(target, e.inner, where)
  }
}

/**
 * The select strings in a file, each with the table it is read from.
 *
 * `.from('x').select(<arg>)` where the argument is a string literal, a
 * file-level constant, a `+` of those, or something else -- in which case
 * every string literal inside the argument is checked on its own, and a
 * function called in it contributes the string literals of its body. A
 * `.from(<expression>)` has no static base; its embeds are checked against
 * every table the relation could be joined to, which is stricter, not looser.
 */
function selectsIn(text) {
  const consts = new Map()
  for (const m of text.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(`[^`]*`|'(?:[^'\\]|\\.)*')/g)) {
    consts.set(m[1], m[2].slice(1, -1))
  }
  const fnBodies = new Map()
  for (const m of text.matchAll(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)[^{]*\{/g)) {
    let depth = 1
    let i = m.index + m[0].length
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++
      if (text[i] === '}') depth--
      i++
    }
    fnBodies.set(m[1], text.slice(m.index + m[0].length, i))
  }
  const literalsOf = (expr) =>
    [...expr.matchAll(/`([^`]*)`|'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1] ?? m[2])

  const out = []
  for (const m of text.matchAll(/\.from\(\s*('([a-z_][a-z0-9_]*)'|[^)]*)\s*\)/g)) {
    const base = m[2] ?? null
    const after = text.slice(m.index, m.index + 2500)
    const sel = after.match(/\.select\(\s*/)
    if (!sel) continue
    let depth = 1
    let i = sel.index + sel[0].length
    const argStart = i
    while (i < after.length && depth > 0) {
      if (after[i] === '(') depth++
      if (after[i] === ')') depth--
      i++
    }
    const arg = after.slice(argStart, i - 1)
    const parts = arg.split('+').map((p) => p.trim())
    let resolved = ''
    let ok = true
    for (const p of parts) {
      if (/^`[^`]*`$/.test(p) || /^'(?:[^'\\]|\\.)*'$/.test(p)) resolved += p.slice(1, -1)
      else if (consts.has(p)) resolved += consts.get(p)
      else ok = false
    }
    const strings = ok ? [resolved] : literalsOf(arg)
    if (!ok) {
      for (const call of arg.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) {
        if (fnBodies.has(call[1])) strings.push(...literalsOf(fnBodies.get(call[1])))
      }
    }
    for (const s of strings) out.push({ base, select: s, line: text.slice(0, m.index).split('\n').length })
  }
  return out
}

let embedsSeen = 0
for (const file of walk(join(here, '..', 'src'))) {
  const text = readFileSync(file, 'utf8')
  const rel = file.slice(join(here, '..').length + 1)
  for (const { base, select, line } of selectsIn(text)) {
    const where = `${rel}:${line}`
    embedsSeen += splitTop(select).filter((x) => parseEmbed(x)).length
    if (base) checkSelect(base, select, where)
    else {
      // No static base: judge each embed against every table it could hang
      // off. An embed that is ambiguous from any of them must carry a hint.
      for (const entry of splitTop(select)) {
        const e = parseEmbed(entry)
        if (!e || !tables.has(e.relation)) continue
        const bases = [...new Set(fks.filter((k) => k.child === e.relation || k.parent === e.relation).flatMap((k) => [k.child, k.parent]))]
        for (const b of bases) if (b !== e.relation) checkSelect(b, entry, `${where} (base unknown, as ${b})`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error('\ncheck-constraint-names: FAIL\n')
  console.error('these embeds cross a pair of tables joined by more than one foreign key, and do not say which:\n')
  for (const p of problems) console.error(`  ${p}`)
  console.error(
    '\nPostgREST refuses such an embed with PGRST201 (HTTP 300), and the refusal\n' +
      'renders as an empty list -- nine screens read "no records yet" for two days\n' +
      'after 0113 added composite keys. Name the key: relation!<constraint>( ... ).\n' +
      'If the snapshot is stale, regenerate supabase/.foreign_keys with the query\n' +
      'in this script.\n',
  )
  process.exit(1)
}

console.log(
  `check-constraint-names: ${claimed.length} names, all present in the schema; ` +
    `${hints.length} embed hint(s) name a real foreign key; ${embedsSeen} embed(s) checked, ` +
    `none crosses a two-key pair unhinted (${fks.length} foreign keys in the snapshot).`,
)
