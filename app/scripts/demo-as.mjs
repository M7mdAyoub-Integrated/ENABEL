#!/usr/bin/env node
/**
 * Switch which test account demo mode signs in as, in development only.
 *
 *   node scripts/demo-as.mjs superadmin@platform.test
 *   node scripts/demo-as.mjs admin@ramtha.test
 *   node scripts/demo-as.mjs admin@khalidiyah.test
 *   node scripts/demo-as.mjs admin@shm.test            (the default)
 *
 * Demo mode (src/demo/demoMode.ts) reads VITE_DEMO_EMAIL and
 * VITE_DEMO_PASSWORD from .env.local. The per-account passwords live in the
 * same file under SHM_TEST_PW_* — deliberately WITHOUT the VITE_ prefix, so
 * they can never reach a bundle. This script copies the chosen one into
 * VITE_DEMO_PASSWORD and sets VITE_DEMO_EMAIL; Vite restarts the dev server
 * when .env.local changes.
 *
 * Nothing is printed except which account is now selected. The file is
 * gitignored; this script never writes anywhere else.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ACCOUNTS = {
  // Renamed from coordinator@shm.test on 22 September 2026, through
  // manage-account's set_email by scripts/set-email.mjs.
  'admin@shm.test': 'SHM_TEST_PW_COORDINATOR',
  // Not a Sahel Horan account: its municipality is null and it switches
  // between all three. Renamed from superadmin@shm.test on 15 September 2026.
  'superadmin@platform.test': 'SHM_TEST_PW_SUPERADMIN',
  'admin@ramtha.test': 'SHM_TEST_PW_RAMTHA_ADMIN',
  // Created 21 September 2026 through manage-account by scripts/create-account.mjs.
  'admin@khalidiyah.test': 'SHM_TEST_PW_KHALIDIYAH_ADMIN',
}

const email = process.argv[2]
if (!email || !(email in ACCOUNTS)) {
  console.error(`usage: node scripts/demo-as.mjs <${Object.keys(ACCOUNTS).join('|')}>`)
  process.exit(2)
}

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
const get = (k) => {
  const l = lines.find((x) => x.startsWith(`${k}=`))
  return l ? l.slice(k.length + 1) : null
}
const set = (k, v) => {
  const i = lines.findIndex((x) => x.startsWith(`${k}=`))
  if (i >= 0) lines[i] = `${k}=${v}`
  else lines.push(`${k}=${v}`)
}

// The coordinator's password was only ever in VITE_DEMO_PASSWORD. Keep a copy
// under its own name the first time this runs, so switching away is reversible.
if (get('SHM_TEST_PW_COORDINATOR') === null) {
  const current = get('VITE_DEMO_PASSWORD')
  const currentEmail = get('VITE_DEMO_EMAIL') || 'admin@shm.test'
  if (current && currentEmail === 'admin@shm.test') set('SHM_TEST_PW_COORDINATOR', current)
}

const pw = get(ACCOUNTS[email])
if (!pw) {
  console.error(`no ${ACCOUNTS[email]} in .env.local — add the account's password there first`)
  process.exit(1)
}
set('VITE_DEMO_EMAIL', email)
set('VITE_DEMO_PASSWORD', pw)
writeFileSync(envPath, lines.join('\n'))
console.log(`demo mode now signs in as ${email}`)
