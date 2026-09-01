#!/usr/bin/env node
/**
 * Fail the build when the manual-entries screen's "entered somewhere else" map
 * disagrees with the router.
 *
 * ── WHY THIS EXISTS ──
 *
 * `ManualEntries.tsx` lists the five indicators that have a form, but not on
 * that screen. Each row says where to go. Rows used to carry `to: null`, which
 * rendered "Not built yet".
 *
 * "Not built yet" is a claim about the REST of the app, made on a screen that
 * cannot see the rest of the app, in copy that nothing tests. It went stale
 * twice:
 *
 *   - B1.2 said it throughout the session in which /forms/os was built.
 *   - D0.1, C1.3 and G0.4 said it the day after /forms/gd, /initiatives/:id
 *     and the contribution log on /forms/pn/:id went live. Three of five rows
 *     were false at once, and the DESCRIPTIONS beside them were already
 *     correct — the prose was updated and the map next to it was not.
 *
 * A comment warning about exactly this sat directly above the array, and it
 * drifted anyway, within a day. That is the whole argument for this file: a
 * warning is not a check.
 *
 * ── THE SUBSTANCE THIS VERIFIES ──
 *
 * Not "the array has five rows". Not "every row has a `to`" — a row pointing
 * at a route that does not exist would satisfy that and still be a dead link.
 *
 * It verifies, against the paths actually declared in App.tsx:
 *
 *   1. every `to` resolves to a declared route (dead link → fail);
 *   2. a `to` of `/forms/<m>` names a module that is in MODULE_IDS and is NOT
 *      retired (a retired module's route exists, but only to redirect away);
 *   3. `unbuilt: true` is only allowed when the route genuinely does not
 *      resolve. THIS IS THE ONE THAT MATTERS — it is the drift that happened,
 *      and it is the direction a check normally misses, because the wrong
 *      state is the ABSENCE of something rather than the presence of it.
 *
 * Confirmed to fail, not read: pointing D0.1 at /forms/gd while marking it
 * `unbuilt: true` fails rule 3; pointing it at /forms/zz fails rule 1;
 * pointing it at /forms/rg fails rule 2. Restored after each.
 *
 * ── WHAT IT DOES NOT COVER ──
 *
 * It does not check that the linked screen actually collects the indicator, or
 * that the row's prose describes it correctly. Prose is still prose. It only
 * guarantees the LINK and the BUILT/NOT-BUILT LABEL cannot contradict the
 * router.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

const fail = []

/* ── the router's declared paths ─────────────────────────────────────────── */

const appSrc = read('src/App.tsx')

// Every `path: '...'` literal. Includes the retired-module redirects, which are
// generated in a template literal and so are added separately below.
const declared = new Set(
  [...appSrc.matchAll(/\bpath:\s*'([^']+)'/g)].map((m) => m[1]),
)

// The generated redirect shapes: `/forms/${m}`, `/forms/${m}/new`, etc.
const retired = readList('src/modules.ts', 'RETIRED_MODULE_IDS')
for (const m of retired) {
  declared.add(`/forms/${m}`)
  declared.add(`/forms/${m}/new`)
  declared.add(`/forms/${m}/:id`)
  declared.add(`/forms/${m}/:id/edit`)
}

const modules = readList('src/modules.ts', 'MODULE_IDS')

if (modules.length === 0) fail.push('could not read MODULE_IDS from src/modules.ts')
if (retired.length === 0) fail.push('could not read RETIRED_MODULE_IDS from src/modules.ts')
if (declared.size === 0) fail.push('could not read any route path from src/App.tsx')

function readList(file, name) {
  const src = read(file)
  const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(src)
  if (!m) return []
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

/**
 * Does `path` resolve to a live screen?
 *
 * `/forms/<m>` is special: it matches the `/forms/:module` route for ANY
 * segment, so route-matching alone would call `/forms/zz` live. The module
 * registry is the authority there, and a retired module is not live because its
 * route exists only to redirect.
 */
function resolves(path) {
  const forms = /^\/forms\/([^/]+)$/.exec(path)
  if (forms) {
    const m = forms[1]
    return modules.includes(m) && !retired.includes(m)
  }
  return declared.has(path)
}

/* ── the ELSEWHERE array ─────────────────────────────────────────────────── */

const meSrc = read('src/routes/ManualEntries.tsx')
const arr = /const ELSEWHERE: ElsewhereRow\[\] = \[([\s\S]*?)\n\]/.exec(meSrc)
if (!arr) {
  fail.push('could not find `const ELSEWHERE: ElsewhereRow[] = [...]` in ManualEntries.tsx')
} else {
  const rows = [...arr[1].matchAll(/\{\s*code:\s*'([^']+)',\s*to:\s*'([^']+)'((?:\s*,\s*unbuilt:\s*true)?)\s*,?\s*\}/g)]

  // A row that does not parse is a row this check would silently skip, which is
  // the failure mode this whole file exists to avoid.
  const braces = (arr[1].match(/\{/g) ?? []).length
  if (rows.length !== braces) {
    fail.push(
      `ELSEWHERE has ${braces} row(s) but only ${rows.length} parsed. ` +
        `Every row must be { code: '...', to: '...' } with an optional ` +
        `\`, unbuilt: true\`. An unparsed row would be skipped silently.`,
    )
  }

  for (const [, code, to, unbuiltPart] of rows) {
    const unbuilt = unbuiltPart.trim().length > 0
    const live = resolves(to)

    if (unbuilt && live) {
      fail.push(
        `${code} is marked \`unbuilt: true\` but ${to} is a live route. ` +
          `The screen would show "Not built yet" for something that exists. ` +
          `Remove \`unbuilt: true\`.`,
      )
    }
    if (!unbuilt && !live) {
      const why = /^\/forms\/([^/]+)$/.test(to)
        ? retired.includes(to.split('/')[2])
          ? 'that module is retired and only redirects away'
          : 'that module is not in MODULE_IDS'
        : 'no such path is declared in App.tsx'
      fail.push(
        `${code} links to ${to}, which does not resolve — ${why}. ` +
          `Either point it at a live route, or add \`unbuilt: true\`.`,
      )
    }
  }

  if (rows.length > 0 && fail.length === 0) {
    const shown = rows.map(([, c, t2]) => `${c} -> ${t2}`).join(', ')
    console.log(`check-elsewhere-routes: ${rows.length} row(s) agree with the router (${shown})`)
  }
}

if (fail.length > 0) {
  console.error('\ncheck-elsewhere-routes FAILED\n')
  for (const f of fail) console.error('  - ' + f)
  console.error('')
  process.exit(1)
}
