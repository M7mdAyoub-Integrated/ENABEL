/**
 * Fails `npm run build` if the development auth bypass is switched on.
 *
 * The bypass hands a working, fully-authorised session to anyone who opens the
 * page. `import.meta.env.DEV` already makes it inert in a production bundle,
 * but "inert because of a second condition" is not something to rely on alone
 * for a flag with that blast radius. This makes it loud and mechanical: the
 * build stops, with an instruction, before tsc even runs.
 *
 * Reads the .env files directly rather than process.env, because Vite loads
 * them itself and they are not in the shell environment at this point.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Every file Vite would load for a production build, in precedence order. */
const CANDIDATES = ['.env', '.env.production', '.env.production.local', '.env.local']

const RED = '[41m[97m'
const DIM = '[2m'
const OFF = '[0m'

const offenders = []

for (const name of CANDIDATES) {
  const path = join(appDir, name)
  if (!existsSync(path)) continue
  const text = readFileSync(path, 'utf8')
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) continue
    const match = /^VITE_AUTH_BYPASS\s*=\s*(.*)$/.exec(trimmed)
    if (!match) continue
    // Strip quotes and any trailing inline comment.
    const value = (match[1] ?? '')
      .replace(/\s+#.*$/, '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .toLowerCase()
    if (value === 'true' || value === '1' || value === 'yes') {
      offenders.push({ name, line: i + 1, value })
    }
  }
}

if (offenders.length > 0) {
  console.error('')
  console.error(`${RED} BUILD BLOCKED — auth bypass is enabled ${OFF}`)
  console.error('')
  for (const o of offenders) {
    console.error(`  ${o.name}:${o.line}  VITE_AUTH_BYPASS=${o.value}`)
  }
  console.error('')
  console.error('  This flag signs the app in automatically as a test user.')
  console.error('  It must never reach a build that anyone else can run.')
  console.error('')
  console.error(`  ${DIM}Set VITE_AUTH_BYPASS=false and build again.${OFF}`)
  console.error('')
  process.exit(1)
}

// A production env file should not mention it at all, even set to false --
// it has no business being in a file that ships.
for (const name of ['.env.production', '.env.production.local']) {
  const path = join(appDir, name)
  if (existsSync(path) && /VITE_AUTH_BYPASS/.test(readFileSync(path, 'utf8'))) {
    console.error('')
    console.error(`${RED} BUILD BLOCKED — VITE_AUTH_BYPASS present in ${name} ${OFF}`)
    console.error('')
    console.error('  This flag is development-only and belongs in .env.local, which is')
    console.error('  gitignored. Remove the line entirely from the production env file.')
    console.error('')
    process.exit(1)
  }
}
