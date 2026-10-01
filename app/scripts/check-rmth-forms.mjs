#!/usr/bin/env node
/**
 * Fail the build when a key the Ramtha screens will ask for at runtime is
 * missing in either locale.
 *
 * ── WHY THIS EXISTS ──
 *
 * The first `src/rmth/labels.ts` carried a comment saying this script failed
 * the build if a field's label was missing in either language -- and the
 * script did not exist. That is the register's own shape, in the file that
 * cites the register: a comment vouching for a behaviour somewhere else,
 * written in good faith, false on the day it was written.
 *
 * Every lookup in `labels.ts` builds its key from a variable --
 * t(`forms.${fid}.fields.${f.id}.label`) -- so `tsc` cannot see any of them,
 * and none of them passes a `defaultValue` (there is no sensible generic
 * fallback for a field label on a data-entry form; the right answer is the
 * key, written). `check-untranslated` compares the values of keys that exist,
 * so a key never written is invisible to it.
 *
 * ── THE SUBSTANCE THIS VERIFIES ──
 *
 * Rewritten on 1 October 2026 for the seven forms of
 * RMTH_Forms_and_Calculations_v2.xlsx, on check-khld-forms.mjs's pattern. It
 * walks the generated definitions -- the structure the screens actually
 * render -- and asserts that every key they will ask for exists, non-empty,
 * in BOTH locales:
 *
 *   - each form's title and short name
 *   - every field's label, and both answers of every Yes - No field
 *   - the sidebar group of every form's page, from the definitions
 *   - the keys a screen builds from a CODE: a refusal's rule (rmth_<field>_
 *     <rule>, 0177 / 0178), a named table constraint, an open definition's
 *     item and choice (0179), the cumulative figure beside C1.2 (0180)
 *
 * Options of the ref_rmth_* lists are NOT checked here: those labels are rows
 * in the database (label_en / label_ar, 0176), not locale keys.
 *
 * It fails when a form, a field or a Yes - No answer is added and the locale
 * files are not regenerated alongside it (python supabase/ramtha/gen_forms.py).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '..', 'src')

const LOCALES = ['en', 'ar']

/** Read the generated definitions without a TS toolchain: the export is one JSON object literal. */
function readExport(name) {
  const text = readFileSync(resolve(src, 'rmth/forms.generated.ts'), 'utf8')
  // `export const NAME = {` or `export const NAME: Type = {`
  const open = text.search(new RegExp(`export const ${name}\\b`))
  if (open === -1) fail(`rmth/forms.generated.ts has no ${name} export`)
  const start = text.indexOf('{', text.indexOf('= ', open))
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
  if (end === -1) fail(`rmth/forms.generated.ts: ${name} is not a closed object literal`)
  return JSON.parse(text.slice(start, end))
}

function readLocale(loc) {
  return JSON.parse(readFileSync(resolve(src, `locales/${loc}/rmth.json`), 'utf8'))
}

/** A key path; `dashboard.unique.C1.2` keeps the code's dot as one segment. */
function get(obj, path) {
  const segs = path.startsWith('dashboard.unique.') ? ['dashboard', 'unique', path.slice('dashboard.unique.'.length)] : path.split('.')
  let cur = obj
  for (const seg of segs) {
    if (cur === null || typeof cur !== 'object' || !(seg in cur)) return undefined
    cur = cur[seg]
  }
  return cur
}

const problems = []
function need(locales, path, why) {
  for (const [loc, data] of Object.entries(locales)) {
    const v = get(data, path)
    if (typeof v !== 'string' || v.trim() === '') problems.push(`${loc}: ${path} — ${why}`)
  }
}

function fail(msg) {
  console.error(`check-rmth-forms: ${msg}`)
  process.exit(2)
}

const FORMS = readExport('RMTH_FORMS')
const INDICATOR_FORMS = readExport('RMTH_INDICATOR_FORMS')
const locales = Object.fromEntries(LOCALES.map((l) => [l, readLocale(l)]))

let fieldCount = 0
let answerCount = 0
for (const [fid, def] of Object.entries(FORMS)) {
  const base = `forms.${fid}`
  for (const k of ['title', 'short']) need(locales, `${base}.${k}`, `form ${fid} header`)
  for (const f of def.fields ?? []) {
    fieldCount++
    need(locales, `${base}.fields.${f.id}.label`, `field label (${fid}.${f.id}, ${f.kind})`)
    if (f.kind === 'bool') {
      for (const a of ['true', 'false']) {
        answerCount++
        need(locales, `${base}.fields.${f.id}.opts.${a}`, `answer "${a}" of ${fid}.${f.id}`)
      }
    }
  }
}
// a source chip points at a form that exists
for (const [code, fids] of Object.entries(INDICATOR_FORMS)) {
  for (const fid of fids) if (!FORMS[fid]) problems.push(`RMTH_INDICATOR_FORMS.${code} names ${fid}, which is not a form`)
}

// The keys the screens build from a code. Each list is the closed set the
// screen can produce: the groups from the definitions; the rules from the
// refusals the database names (RmthFormScreen's RULES, 0177 / 0178); the
// items and choices from rmth_threshold (0179) and RmthThresholds' CHOICES.
const groups = [...new Set(Object.values(FORMS).map((d) => d.group))]
const STATIC = {
  'nav.group': [...groups, 'definitions'],
  nav: ['thresholds'],
  objective: ['impact', 'so1', 'so2', 'so3'],
  'form.rule': ['required', 'not_applicable', 'not_registered', 'deleted', 'future', 'in_use', 'none_exclusive',
    'not_surveyed', 'specify', 'locked', 'person_deleted'],
  'form.constraint': ['rmth_participation_once_per_activity', 'rmth_feedback_once_per_activity',
    'rmth_activity_end_after_start', 'rmth_followup_first_placement_by_followup', 'rmth_followup_continuous_by_followup',
    'rmth_followup_income_months_of_six', 'rmth_activity_contact_hours_positive', 'rmth_activity_sessions_positive',
    'rmth_beneficiary_year_of_birth_four_digits', 'national_id_format'],
  'thresholds.item': ['sustained_engagement', 'short_term_intensive', 'regular_income', 'programmes_or_sessions'],
  'thresholds.choice.f02_counting_reading': ['programmes', 'sessions'],
  'dashboard.unique': ['C1.2'],
}
for (const [prefix, keys] of Object.entries(STATIC)) {
  for (const k of keys) need(locales, `${prefix}.${k}`, 'a key a screen builds from a code')
}

if (problems.length) {
  console.error('check-rmth-forms: keys the Ramtha screens will ask for at runtime and will not find.\n')
  for (const p of problems.slice(0, 60)) console.error(`  ${p}`)
  if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`)
  console.error(`\n${problems.length} missing. These are built from variables, so tsc cannot see them and`)
  console.error('check-untranslated cannot either — it compares the values of keys that exist.')
  console.error('Regenerate with: python supabase/ramtha/gen_forms.py')
  process.exit(1)
}

console.log(
  `check-rmth-forms: OK — ${Object.keys(FORMS).length} forms, ${fieldCount} fields, ` +
    `${answerCount} Yes - No answers, present in ${LOCALES.join(' and ')}.`,
)
