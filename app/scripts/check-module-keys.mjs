#!/usr/bin/env node
/**
 * Fail the build when a module id has no locale key in a group that is keyed by
 * module id.
 *
 * ── WHY THIS EXISTS ──
 *
 * CLAUDE.md's fifth shape-not-substance failure was a module wired end to end
 * with four of its locale keys never written, so a live screen rendered
 * `description.os` as literal text. The tenth was the safety net for it:
 * `parseMissingKeyHandler` threw away the `defaultValue`, so fourteen fallbacks
 * had never fired.
 *
 * The handler is fixed. It happens **not to be the thing that catches this**,
 * and the reason is worth stating: a `defaultValue` only helps at a call site
 * that passes one, and 128 of the app's dynamic-key call sites do not. There is
 * no sensible default for a column heading or a screen description — the right
 * answer is the key, written.
 *
 * So this was still live on 2026-09-01, and it was found the same way as the
 * other two — by opening the page:
 *
 *     searchPlaceholder.os — missing in BOTH locales since the coordination
 *     office shipped. ListScreen calls t(`forms:searchPlaceholder.${module}`)
 *     with no defaultValue, so the search box on /forms/os had the literal
 *     string `searchPlaceholder.os` in it, in English and in Arabic.
 *
 * Nothing could have said so. The key is built at runtime, so `tsc` cannot see
 * it. `check-untranslated` compares values of keys that EXIST, so a key that
 * was never written is invisible to it. Counting keys per file passes, because
 * the file has plenty of keys.
 *
 * ── THE SUBSTANCE THIS VERIFIES ──
 *
 * Not "the locale file has keys". Not "en and ar have the same keys" — they
 * did, both were equally wrong. It verifies that for every id in MODULE_IDS,
 * every group that is indexed by module id has an entry for it, in every
 * locale. It fails when a module is added and a group is forgotten, which is
 * the thing that actually happened, twice.
 *
 * Could this pass while the thing it checks is wrong? Only if a group indexed
 * by module id is not in GROUPS below. That list is the maintenance cost, and
 * it is why the check prints it on success.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', 'src')

/** Read MODULE_IDS from modules.ts rather than restating it here — a second
 *  copy of the list is exactly how one of them would go unchecked. */
const modulesTs = readFileSync(join(src, 'modules.ts'), 'utf8')
const idsMatch = modulesTs.match(/export const MODULE_IDS = \[([^\]]*)\] as const/)
if (!idsMatch) {
  console.error('check-module-keys: FAILED — could not find MODULE_IDS in src/modules.ts')
  process.exit(1)
}
const MODULE_IDS = [...idsMatch[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
if (MODULE_IDS.length === 0) {
  console.error('check-module-keys: FAILED — MODULE_IDS parsed as empty')
  process.exit(1)
}

/**
 * Locale groups whose keys ARE module ids.
 *
 * `columns` is checked for shape too: it holds an array per module, and its
 * length has to match `MODULES[id].columnCount` or the table renders a heading
 * row of a different width from its cells.
 */
const GROUPS = [
  ['forms.json', 'cta'],
  ['forms.json', 'description'],
  ['forms.json', 'searchPlaceholder'],
  ['forms.json', 'filterAll'],
  ['forms.json', 'columns'],
  ['forms.json', 'deleteNote'],
  ['nav.json', 'module'],
  ['nav.json', 'objective'],
]

const LOCALES = ['en', 'ar']

/** Retired modules keep their routes as redirects and render no screen. */
const RETIRED = new Set(['rg', 'ln', 'fu'])

const columnCounts = Object.fromEntries(
  [...modulesTs.matchAll(/^\s*([a-z]+): \{ id: '[a-z]+'.*?columnCount: (\d+)/gm)].map((m) => [
    m[1],
    Number(m[2]),
  ]),
)

const problems = []
let checked = 0

for (const locale of LOCALES) {
  const cache = {}
  for (const [file, group] of GROUPS) {
    cache[file] ??= JSON.parse(readFileSync(join(src, 'locales', locale, file), 'utf8'))
    const bag = cache[file][group]
    if (!bag) {
      problems.push(`${locale}/${file}: group "${group}" is missing entirely`)
      continue
    }
    for (const id of MODULE_IDS) {
      checked++
      const value = bag[id]
      if (value === undefined) {
        problems.push(`${locale}/${file}: ${group}.${id} — no key, so the screen renders "${group}.${id}"`)
        continue
      }
      if (group === 'columns') {
        const want = columnCounts[id]
        if (want !== undefined && Array.isArray(value) && value.length !== want) {
          problems.push(
            `${locale}/${file}: columns.${id} has ${value.length} headings but MODULES.${id}.columnCount is ${want}`,
          )
        }
      }
    }
  }
}

if (problems.length) {
  console.error(
    'check-module-keys: FAILED\n' +
      problems.map((p) => `  ${p}`).join('\n') +
      '\n\n  A module id with no key renders the raw key on screen. It is not a type\n' +
      '  error and it cannot be — t() takes a string. Write the key.',
  )
  process.exit(1)
}

console.log(
  `check-module-keys: ${checked} module/group pairs present across ${LOCALES.length} locales ` +
    `(${MODULE_IDS.length} modules${RETIRED.size ? `, ${RETIRED.size} retired but still keyed` : ''}).`,
)
