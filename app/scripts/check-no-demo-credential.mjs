/**
 * Fails `npm run build` if a demo credential could reach a production bundle.
 *
 * Demo mode signs the app in automatically. A password compiled into client
 * JavaScript is not a secret -- anyone who opens the bundle holds a real
 * session against a database of national ID numbers, and rotating it does not
 * help because the replacement is equally readable.
 *
 * `import.meta.env.DEV` already makes the branch dead code in a production
 * build, but "inert because of a second condition" is not enough on its own for
 * something with that blast radius. This makes it mechanical and loud.
 *
 * Three things are refused:
 *   1. a VITE_DEMO_PASSWORD with a value in any file a production build loads
 *   2. any VITE_DEMO_PASSWORD mentioned in .env.production at all
 *   3. a password literal hardcoded back into src/demo/demoMode.ts
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const RED = '\x1b[41m\x1b[97m'
const DIM = '\x1b[2m'
const OFF = '\x1b[0m'

function fail(title, lines) {
  console.error('')
  console.error(`${RED} BUILD BLOCKED — ${title} ${OFF}`)
  console.error('')
  for (const l of lines) console.error(`  ${l}`)
  console.error('')
  console.error(`  ${DIM}Demo mode is a development feature. See src/demo/demoMode.ts.${OFF}`)
  console.error('')
  process.exit(1)
}

/* 1 + 2. Env files a production build would read. `.env.local` is NOT in this
   list: Vite does not load it for a production build, and it is gitignored. */
for (const name of ['.env', '.env.production', '.env.production.local']) {
  const path = join(appDir, name)
  if (!existsSync(path)) continue
  const text = readFileSync(path, 'utf8')
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) continue
    const m = /^VITE_DEMO_PASSWORD\s*=\s*(.*)$/.exec(trimmed)
    if (!m) continue
    const value = (m[1] ?? '').replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '')
    if (value !== '') {
      fail('a demo credential is set for a production build', [
        `${name}:${i + 1}  VITE_DEMO_PASSWORD is set`,
        '',
        'This value would be compiled into the JavaScript bundle and be',
        'readable by anyone who opens it. Remove the line entirely.',
      ])
    }
  }
}

/* 3. The literal creeping back into the source. */
const demoFile = join(appDir, 'src', 'demo', 'demoMode.ts')
if (existsSync(demoFile)) {
  const text = readFileSync(demoFile, 'utf8')
  // A password assignment with a non-empty string literal on the right. An
  // `import.meta.env` read or an empty-string fallback is fine.
  const hardcoded = /password\s*:\s*['"`][^'"`\s]{3,}['"`]/.exec(text)
  if (hardcoded) {
    fail('a password literal is hardcoded in demoMode.ts', [
      `src/demo/demoMode.ts  ${hardcoded[0].slice(0, 40)}...`,
      '',
      'The demo password must come from import.meta.env, never from source.',
      'Source is committed, and this repository is public.',
    ])
  }
}
