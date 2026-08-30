#!/usr/bin/env node
/**
 * Fail the build when a locale file gains a value that is still English.
 *
 * ── WHY THIS EXISTS ──
 *
 * CLAUDE.md records it as the fourth shape-not-substance failure:
 *
 *     locales/ar/indicators.json — all 20 name.* keys present
 *                                — Arabic: every value is the English string
 *
 * A missing key is loud: i18next warns and the raw key appears on screen. A key
 * whose value is the English string is silent. It renders, it looks finished,
 * `tsc` is happy, and counting keys — which is the obvious check — says 100%.
 *
 * The check is therefore on the VALUE, not the key. It cannot be satisfied by
 * adding a key, only by translating one.
 *
 * ── WHY A BASELINE RATHER THAN ZERO ──
 *
 * There are already 226 of these. Failing on the first one would mean either
 * translating all 226 in the same commit as an unrelated change, or turning the
 * check off — and a check that is off is worse than no check, because it looks
 * like coverage.
 *
 * So the baseline is a debt figure that may fall and must never rise. New work
 * cannot add an untranslated string; existing debt is visible in the build
 * output every time, with the file that owns it.
 *
 * Lower a number here when you translate something. Never raise one.
 *
 * ── WHAT IT CANNOT SEE ──
 *
 * Reference-table labels. `label_ar` is null for 138 of the 204 rows in the 26
 * ref_ tables — every one of the 18 original tables, none of the 8 that 0075
 * added. Those are database rows, not files, so this script cannot reach them
 * and no build check will. It is OQ-32.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const locales = join(here, '..', 'src', 'locales')

/** Untranslated values per file. May fall. Must never rise. */
const BASELINE = {
  'auth.json': 0,
  'common.json': 0,
  'errors.json': 0,
  'forms.json': 71,
  'indicators.json': 42,
  'nav.json': 0,
  'portal.json': 0,
  'public.json': 0,
  'survey.json': 113,
}

/**
 * Values that are legitimately identical in both languages: proper nouns,
 * indicator codes, symbols. Listed explicitly so "it is the same word" has to
 * be an argued exception rather than an assumption.
 */
const ALLOWED_IDENTICAL = new Set(['Enabel', 'EU', 'SHM', 'JOD', 'M&E'])

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

let failed = false
let total = 0
const lines = []

for (const file of readdirSync(join(locales, 'en')).sort()) {
  if (!file.endsWith('.json')) continue
  const en = flatten(JSON.parse(readFileSync(join(locales, 'en', file), 'utf8')))
  let ar
  try {
    ar = flatten(JSON.parse(readFileSync(join(locales, 'ar', file), 'utf8')))
  } catch {
    console.error(`check-untranslated: no Arabic file for ${file}`)
    failed = true
    continue
  }

  const untranslated = Object.keys(en).filter((k) => {
    const v = en[k]
    if (typeof v !== 'string') return false
    // Values with no letters at all — numbers, punctuation, a bare "%" — carry
    // no language and cannot be translated.
    if (!/\p{L}/u.test(v)) return false
    if (ALLOWED_IDENTICAL.has(v.trim())) return false
    return ar[k] === v
  })

  const missing = Object.keys(en).filter((k) => !(k in ar))
  const n = untranslated.length
  total += n

  const budget = BASELINE[file]
  if (budget === undefined) {
    lines.push(`  ${file}: ${n} untranslated — NOT IN THE BASELINE, add it`)
    failed = true
  } else if (n > budget) {
    lines.push(
      `  ${file}: ${n} untranslated, baseline ${budget} — ${n - budget} NEW:\n` +
        untranslated.slice(0, 10).map((k) => `      ${k}`).join('\n'),
    )
    failed = true
  } else if (n < budget) {
    lines.push(`  ${file}: ${n} untranslated, baseline ${budget} — lower the baseline to ${n}`)
    failed = true
  } else if (n > 0) {
    lines.push(`  ${file}: ${n} untranslated (at baseline)`)
  }

  if (missing.length) {
    lines.push(`  ${file}: ${missing.length} key(s) missing from Arabic: ${missing.slice(0, 5).join(', ')}`)
    failed = true
  }
}

if (failed) {
  console.error('check-untranslated: FAILED\n' + lines.join('\n'))
  process.exit(1)
}

console.log(
  `check-untranslated: ${total} values still identical to English, all within baseline.` +
    (lines.length ? '\n' + lines.join('\n') : ''),
)
