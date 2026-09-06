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

/* 1 + 2. Env files a production build would read.

   `.env.local` USED TO BE EXCLUDED, with the comment "Vite does not load it for
   a production build, and it is gitignored". The second half is true. The first
   half is false: Vite loads `.env.local` in every mode except `test` -- only
   `.env.[mode].local` is mode-specific.

   Measured on 2026-09-03, on a real `npm run build` with this check passing:

     dist/assets/index-*.js
       ({BASE_URL:`/`,DEV:!1,MODE:`production`,...,VITE_DEMO_PASSWORD:`<real>`,...})

   Vite inlines `import.meta.env` as one object literal, so the password is
   emitted even though DEMO_MODE is `DEMO_MODE_REQUESTED && import.meta.env.DEV`
   and the branch it guards is dead code. Dead code still carries its constants.

   A git-connected Netlify build was never affected -- `.env.local` is gitignored
   so it is not on the build server. A LOCAL build uploaded by drag-and-drop was,
   which is how this was found.

   `.env.local` is still NOT in the list below, for a different and better
   reason than the old one: a password there is CORRECT during development, and
   failing the build on it would mean nobody could ever produce a local
   production build. The danger is not the file, it is the artefact -- so the
   guard is check 4, which looks at the bundle. */
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

/* 4. The bundle itself.
 *
 * Checks 1-3 all reason ABOUT the build: which files Vite reads, what the
 * source says. Every one of them passed while the password sat in
 * dist/assets/index-*.js, because the reasoning in check 1 was wrong about
 * Vite. So this one stops reasoning and looks at the artefact.
 *
 * It only runs when a build is already present, which is the case in the one
 * place it matters -- immediately after `vite build`, and before anyone
 * uploads dist/ anywhere. It is not a substitute for 1-3: those fail BEFORE a
 * bad bundle is written, this one fails if a bundle was somehow written
 * anyway.
 *
 * Runs only with `--bundle`, which `postbuild` passes. Without that gate it
 * also runs in the PRE-build pass, where the only dist/ on disk is the
 * PREVIOUS build's -- so a clean rebuild is blocked by the artefact it is
 * about to replace, and the fix ("rebuild without the password") can never
 * succeed. That is a check that cannot be satisfied, which is worse than none.
 */
const distDir = join(appDir, 'dist', 'assets')
if (process.argv.includes('--bundle') && existsSync(distDir)) {
  const { readdirSync } = await import('node:fs')
  for (const f of readdirSync(distDir).filter((n) => n.endsWith('.js'))) {
    const text = readFileSync(join(distDir, f), 'utf8')
    const m = /VITE_DEMO_PASSWORD\s*:\s*(["'`])((?:(?!\1).)*)\1/.exec(text)
    if (m && m[2] !== '') {
      fail('a demo credential is compiled into the built bundle', [
        `dist/assets/${f}  contains VITE_DEMO_PASSWORD with a value`,
        '',
        'Anyone who opens this file holds a real session against a database of',
        'national ID numbers. Do not upload this build anywhere.',
        '',
        'Rebuild with the variable emptied for the production build:',
        '  VITE_DEMO_PASSWORD= npm run build',
      ])
    }
  }
}
