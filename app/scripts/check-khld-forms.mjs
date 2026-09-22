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
 * It walks the generated form definitions, which are the structure the
 * screens actually render, and asserts that every key those screens will ask
 * for exists in BOTH locales:
 *
 *   - the thirteen header keys of each form (title, short, code, indicator,
 *     who, when, calc, disaggregation, definition, measures, unit, source,
 *     evidence -- the form screen shows five of them and the list two)
 *   - every section heading
 *   - every field label
 *   - both answers of every bool field, as its `options` list them
 *   - every part heading of a `parts` field -- ALL of them: unlike Ramtha's
 *     generator, Khalidiyah's writes a heading for the first part too
 *   - both answers of every bool part
 *   - the static keys the screens build from a code: the identifier types,
 *     the participation kinds, the milestone statuses and reasons, the
 *     attendance reasons, the unique-count wordings, the nav groups, the
 *     objective headings, the deleted-entity bands, the completion words
 *
 * Options that come from a `ref_khld_*` table are NOT checked here: those
 * labels are rows in the database (label_en / label_ar, seeded verbatim from
 * the sheets by 0141), not locale keys.
 *
 * ── CONFIRMED BY MAKING IT FAIL ──
 *
 * Not by reading it. Deleting `forms.f2.fields.id_number.label` from en,
 * deleting `partOpts.stall_free.false` from ar, and adding a field to a form
 * definition without regenerating the locales each produce a non-zero exit
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
  for (const k of ['title', 'short', 'code', 'indicator', 'who', 'when', 'calc', 'disaggregation', 'definition', 'measures', 'unit', 'source', 'evidence']) {
    need(locales, `${base}.${k}`, `form ${fid} header`)
  }
  for (const section of def.sections ?? []) {
    need(locales, `${base}.sections.${section.key}`, `section heading of ${fid}`)
    for (const f of section.fields ?? []) {
      fieldCount++
      need(locales, `${base}.fields.${f.key}.label`, `field label (${fid}.${f.key}, ${f.type})`)
      if (f.type === 'bool') {
        for (const opt of f.options ?? []) {
          optionCount++
          need(locales, `${base}.fields.${f.key}.opts.${opt}`, `answer "${opt}" of ${fid}.${f.key}`)
        }
      }
      for (const part of f.parts ?? []) {
        need(locales, `${base}.fields.${f.key}.parts.${part.column}`, `heading of part ${part.column} in ${fid}.${f.key}`)
        if (part.type === 'bool') {
          for (const opt of part.options ?? []) {
            optionCount++
            need(locales, `${base}.fields.${f.key}.partOpts.${part.column}.${opt}`, `answer "${opt}" of part ${part.column} in ${fid}.${f.key}`)
          }
        }
      }
    }
  }
}

// The keys the screens build from a code. Each list is the closed set the
// screen can produce, taken from the database's own values (0147, 0150) or
// the definition's codes -- so a value added on one side fails here on the other.
const STATIC = {
  'form.idType': ['label', 'national_id', 'unhcr_number'],
  'form.log': ['kind_campaign', 'kind_action_day', 'kind_activity', 'kind_market', 'kind_committee', 'kind_outreach'],
  'form.deleted': ['person', 'partner', 'enterprise', 'vendor'],
  'detail.milestone': ['established', 'partly_established', 'not_established', 'not_computable', 'reason_no_rule', 'reason_rule_not_evaluable', 'reason_items_missing', 'tally'],
  'detail.attendance': ['reason_not_checked', 'reason_not_yet', 'reason_not_possible', 'reason_repeat_count_missing'],
  'detail.completion': ['true', 'false'],
  'dashboard.unique': ['D2', 'H2'],
  'nav.group': ['impact', 'so1', 'so2', 'so3', 'so4', 'definitions'],
  objective: ['impact', 'so1', 'so2', 'so3', 'so4'],
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
