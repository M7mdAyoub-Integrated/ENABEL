#!/usr/bin/env node
/**
 * Fail the build when a Ramtha form field has no label in either locale.
 *
 * ── WHY THIS EXISTS ──
 *
 * `src/rmth/labels.ts` was written with a comment saying this script fails the
 * build if a field's label is missing in either language — "so these dynamic
 * keys are covered by a check, which CLAUDE.md's register says a dynamic key
 * must be". The script did not exist. That is the register's own shape, in the
 * file that cites the register: a comment vouching for a behaviour somewhere
 * else, written in good faith, false on the day it was written.
 *
 * Every lookup in `labels.ts` builds its key from a variable —
 * t(`forms.${fid}.fields.${f.key}.label`) — so `tsc` cannot see any of them,
 * and none of them passes a `defaultValue` (there is no sensible generic
 * fallback for a field label on a data-entry form; the right answer is the key,
 * written). `check-untranslated` compares the values of keys that exist, so a
 * key never written is invisible to it. A missing one renders as the literal
 * string `forms.c12.fields.met_criteria.label` on an enumerator's screen.
 *
 * ── THE SUBSTANCE THIS VERIFIES ──
 *
 * Not "rmth.json has keys", and not "en and ar agree" — on `searchPlaceholder.os`
 * they agreed and were both equally missing. It walks the generated form
 * definitions, which are the structure the screens actually render, and asserts
 * that every key those screens will ask for at runtime exists in BOTH locales:
 *
 *   - the six header keys of each form
 *   - every section heading
 *   - every field label
 *   - every option of every select/multi field, and of every select/multi part
 *   - every column heading of a `parts`, `grid`, `services` or `deliveries` field
 *
 * It fails when a form is added, a field is added to a form, or an option is
 * added to a list, and the locale file is not regenerated alongside it.
 *
 * Options that come from a `ref_*` table are NOT checked here: those labels are
 * rows in the database (label_en/label_ar), not locale keys, and OQ-46 tracks
 * their Arabic. Only inline `options` lists are the locale file's job.
 *
 * ── CONFIRMED BY MAKING IT FAIL ──
 *
 * Not by reading it. Deleting `forms.a12.fields.reference.label` from en,
 * deleting one entry of an inline option list from ar, and adding a field to a
 * form definition without regenerating the locales each produce a non-zero exit
 * naming the key. Restoring each returns it to zero.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '..', 'src')

const LOCALES = ['en', 'ar']

/** Read the generated definitions without a TS toolchain: the file is one JSON object literal. */
function readForms() {
  const text = readFileSync(resolve(src, 'rmth/forms.generated.ts'), 'utf8')
  const open = text.indexOf('export const RMTH_FORMS = ')
  if (open === -1) fail('rmth/forms.generated.ts has no RMTH_FORMS export')
  const start = text.indexOf('{', open)
  // Walk to the matching brace. The generator emits JSON, so there are no
  // braces inside strings that a depth count would trip on — but count quotes
  // anyway rather than trusting that.
  let depth = 0
  let inStr = false
  let esc = false
  let end = -1
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c.charCodeAt(0) === 92) esc = true // backslash
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) { end = i + 1; break }
    }
  }
  if (end === -1) fail('rmth/forms.generated.ts: RMTH_FORMS is not a closed object literal')
  return JSON.parse(text.slice(start, end))
}

function readLocale(loc) {
  return JSON.parse(readFileSync(resolve(src, `locales/${loc}/rmth.json`), 'utf8'))
}

function get(obj, path) {
  let cur = obj
  for (const seg of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(seg in cur)) return undefined
    cur = cur[seg]
  }
  return cur
}

const problems = []
function need(locales, path, why) {
  for (const [loc, data] of Object.entries(locales)) {
    const v = get(data, path)
    if (typeof v !== 'string' || v.trim() === '') {
      problems.push(`${loc}: ${path} — ${why}`)
    }
  }
}

function fail(msg) {
  console.error(`check-rmth-forms: ${msg}`)
  process.exit(2)
}

const FORMS = readForms()
const locales = Object.fromEntries(LOCALES.map((l) => [l, readLocale(l)]))

// Fields whose options are ref_* rows in the database, not locale keys.
const optionsAreLocaleKeys = (d) => Array.isArray(d.options) && d.options.length > 0

// Field types that render a column heading per part/column.
const COLUMNAR = new Set(['parts', 'grid', 'services', 'deliveries'])

let fieldCount = 0
let optionCount = 0

for (const [fid, def] of Object.entries(FORMS)) {
  const base = `forms.${fid}`
  // `short` is the sidebar label; without it the rail renders the raw key.
  for (const k of ['title', 'short', 'indicator', 'who', 'when', 'calc', 'disaggregation']) {
    need(locales, `${base}.${k}`, `form ${fid} header`)
  }
  for (const section of def.sections ?? []) {
    need(locales, `${base}.sections.${section.key}`, `section heading of ${fid}`)
    for (const f of section.fields ?? []) {
      fieldCount++
      need(locales, `${base}.fields.${f.key}.label`, `field label (${fid}.${f.key}, ${f.type})`)

      if (optionsAreLocaleKeys(f)) {
        for (const opt of f.options) {
          optionCount++
          need(locales, `${base}.fields.${f.key}.opts.${opt}`, `inline option "${opt}" of ${fid}.${f.key}`)
        }
      }

      if (COLUMNAR.has(f.type)) {
        const parts = f.parts ?? []
        for (const [i, part] of parts.entries()) {
          // The FIRST part of a `parts` field inherits the field's own label --
          // that is the generator's convention and PartView's documented
          // fallback (`L.part(...) || L.label(f)`). Every OTHER part is a
          // separate control on screen and must have its own heading.
          //
          // This exemption is narrow on purpose. It was nearly the check's
          // undoing: the fallback it relies on could not fire, because
          // parseMissingKeyHandler returns the key and a key is truthy, so all
          // nine of these rendered raw. labels.ts now tests i18n.exists first.
          // If that fallback is ever removed, delete this branch too.
          if (!(f.type === 'parts' && i === 0)) {
            need(locales, `${base}.fields.${f.key}.parts.${part.column}`, `column heading ${part.column} of ${fid}.${f.key}`)
          }
          if (optionsAreLocaleKeys(part)) {
            for (const opt of part.options) {
              optionCount++
              need(
                locales,
                `${base}.fields.${f.key}.partOpts.${part.column}.${opt}`,
                `inline option "${opt}" of column ${part.column} in ${fid}.${f.key}`,
              )
            }
          }
        }
      }
    }
  }
}

if (problems.length) {
  console.error('check-rmth-forms: keys the Ramtha screens will ask for at runtime and will not find.\n')
  for (const p of problems.slice(0, 60)) console.error(`  ${p}`)
  if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`)
  console.error(
    `\n${problems.length} missing. These are built from variables, so tsc cannot see them and`,
  )
  console.error('check-untranslated cannot either — it compares the values of keys that exist.')
  console.error('Regenerate with: python supabase/ramtha/gen_forms.py')
  process.exit(1)
}

console.log(
  `check-rmth-forms: OK — ${Object.keys(FORMS).length} forms, ${fieldCount} fields, ` +
    `${optionCount} inline options, present in ${LOCALES.join(' and ')}.`,
)
