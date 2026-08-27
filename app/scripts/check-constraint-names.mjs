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
 */
import { readFileSync } from 'node:fs'
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

console.log(`check-constraint-names: ${claimed.length} names, all present in the schema.`)
