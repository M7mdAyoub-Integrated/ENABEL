#!/usr/bin/env node
/**
 * Fail the build when a Khalidiyah screen will ask for a locale key at runtime
 * that is missing in either language.
 *
 * The same substance as check-rmth-forms.mjs, for the same reason: every
 * lookup in `src/khld/labels.ts` builds its key from a variable, so `tsc`
 * cannot see it, and `check-untranslated` compares the values of keys that
 * exist, so a key never written is invisible to it. A missing one renders as
 * the literal string `forms.f2.fields.id_number.label` on an enumerator's
 * screen (CLAUDE.md's register, rows ten and eleven).
 *
 * ── THE SUBSTANCE THIS VERIFIES ──
 *
 * It walks the generated form definitions (Khaldia_2_reviewed.xlsx, 23
 * forms), which are the structure the screens actually render, and asserts
 * that every key those screens will ask for exists in BOTH locales:
 *
 *   - the title and short name of each form
 *   - every field label, by Field ID
 *   - both answers of every bool field ('true', 'false')
 *   - the five answers of every likert field ('1'..'5')
 *   - the label of a record picker's added option (F160, F181)
 *   - the static keys the screens build from a code: the page groups, the
 *     objective headings, a volunteer registration's three statuses, the
 *     seven answers of the public registration, the two occasions, the
 *     second figures of the dashboard
 *
 * Options that come from a `ref_khld_*` table are NOT checked here: those
 * labels are rows in the database (label_en / label_ar, seeded verbatim from
 * the sheet by 0156-0157), not locale keys.
 *
 * ── CONFIRMED BY MAKING IT FAIL ──
 *
 * Not by reading it. Deleting `forms.form12.fields.F058.label` from en,
 * deleting `forms.form19.fields.F166.opts.3` from ar, and deleting
 * `volunteer.withdrawn` from en each produce a non-zero exit naming the key.
 * Restoring each returns it to zero.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '..', 'src')

const LOCALES = ['en', 'ar']

/** Read the generated definitions without a TS toolchain: the file is one JSON object literal. */
function readForms() {
  const text = readFileSync(resolve(src, 'khld/forms.generated.ts'), 'utf8')
  const open = text.indexOf('export const KHLD_FORMS = ')
  if (open === -1) fail('khld/forms.generated.ts has no KHLD_FORMS export')
  const start = text.indexOf('{', open)
  let depth = 0
  let inStr = false
  let esc = false
  let end = -1
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c.charCodeAt(0) === 92) esc = true
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
  if (end === -1) fail('khld/forms.generated.ts: KHLD_FORMS is not a closed object literal')
  return JSON.parse(text.slice(start, end))
}

function readLocale(loc) {
  return JSON.parse(readFileSync(resolve(src, `locales/${loc}/khld.json`), 'utf8'))
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
  console.error(`check-khld-forms: ${msg}`)
  process.exit(2)
}

const FORMS = readForms()
const locales = Object.fromEntries(LOCALES.map((l) => [l, readLocale(l)]))

let fieldCount = 0
let optionCount = 0

for (const [fid, def] of Object.entries(FORMS)) {
  const base = `forms.${fid}`
  for (const k of ['title', 'short']) need(locales, `${base}.${k}`, `form ${fid} header`)
  for (const f of def.fields ?? []) {
    fieldCount++
    need(locales, `${base}.fields.${f.id}.label`, `field label (${fid}.${f.id}, ${f.kind})`)
    const answers = f.kind === 'bool' ? ['true', 'false'] : f.kind === 'likert' ? ['1', '2', '3', '4', '5'] : []
    for (const opt of answers) {
      optionCount++
      need(locales, `${base}.fields.${f.id}.opts.${opt}`, `answer "${opt}" of ${fid}.${f.id}`)
    }
    if (f.extra) need(locales, `${base}.fields.${f.id}.extra`, `the added option of ${fid}.${f.id}`)
  }
}

// The keys the screens build from a code. Each list is the closed set the
// screen can produce, taken from the database's own values (0159, 0161) or
// the definition's -- so a value added on one side fails here on the other.
const groups = [...new Set(Object.values(FORMS).map((d) => d.group))]
const STATIC = {
  'nav.group': groups,
  objective: ['impact', 'so1', 'so2', 'so3', 'so4'],
  'detail.review': ['submitted', 'approved', 'rejected'],
  volunteer: ['registered', 'already_registered', 'withdrawn', 'not_eligible', 'not_open', 'cannot_verify', 'invalid'],
  'form.occasion': ['campaign', 'activity'],
  'dashboard.unique': ['A3', 'H1', 'H2'],
}
for (const [prefix, keys] of Object.entries(STATIC)) {
  for (const k of keys) need(locales, `${prefix}.${k}`, `a key a screen builds from a code`)
}

if (problems.length) {
  console.error('check-khld-forms: keys the Khalidiyah screens will ask for at runtime and will not find.\n')
  for (const p of problems.slice(0, 60)) console.error(`  ${p}`)
  if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`)
  console.error(`\n${problems.length} missing. These are built from variables, so tsc cannot see them and`)
  console.error('check-untranslated cannot either — it compares the values of keys that exist.')
  console.error('Regenerate with: python supabase/khalidiyah/gen_forms.py')
  process.exit(1)
}

console.log(
  `check-khld-forms: OK — ${Object.keys(FORMS).length} forms, ${fieldCount} fields, ` +
    `${optionCount} inline answers, present in ${LOCALES.join(' and ')}.`,
)
