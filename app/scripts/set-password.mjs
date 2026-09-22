#!/usr/bin/env node
/**
 * Set an existing account's password through the manage-account Edge
 * Function, as the super admin, and keep the new value in .env.local.
 *
 *   node scripts/set-password.mjs admin@shm.test 'sahel-horan-admin-2026'
 *
 * ── WHY A SCRIPT, AND WHY NOT SQL ──
 *
 * The same reason create-account.mjs exists (its header has the long
 * version): a password must never enter a migration, because the ledger
 * stores applied SQL verbatim and survives a history rewrite. Writing
 * `crypt()` into auth.users by hand is worse still -- 0030 did exactly that
 * and every sign-in failed until 0031 repaired the rows GoTrue could not
 * read. The Auth admin API is the only writer that leaves GoTrue's own
 * bookkeeping consistent, and manage-account is the only place holding the
 * service key.
 *
 * The function requires an ACTIVE super_admin caller and refuses a password
 * under 12 characters. Both refusals are relayed here as they come back.
 *
 * ── THE PASSWORD IS AN ARGUMENT, NOT GENERATED ──
 *
 * create-account.mjs generates 32 random characters because nobody needs to
 * type them. These accounts are demonstrated and handed over, so the value
 * is chosen by whoever runs this and passed in. It is written to .env.local
 * (gitignored) under the variable demo-as.mjs reads, so `npm run dev`'s demo
 * sign-in keeps working, and it is not printed.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = join(here, '..', '.env.local')

const [email, password, varNameArg] = process.argv.slice(2)
if (!email || !password) {
  console.error("usage: node scripts/set-password.mjs <email> '<password>' [ENV_VAR_NAME]")
  process.exit(2)
}

const raw = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  raw
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

// The same map demo-as.mjs keeps, so the two cannot disagree about which
// variable holds which account's password.
const VARS = {
  'admin@shm.test': 'SHM_TEST_PW_COORDINATOR',
  'superadmin@platform.test': 'SHM_TEST_PW_SUPERADMIN',
  'admin@ramtha.test': 'SHM_TEST_PW_RAMTHA_ADMIN',
  'admin@khalidiyah.test': 'SHM_TEST_PW_KHALIDIYAH_ADMIN',
}
const varName = varNameArg ?? VARS[email]
if (!varName) {
  console.error(`no .env.local variable known for ${email}; pass one as the third argument`)
  process.exit(2)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const signIn = await supabase.auth.signInWithPassword({
  email: 'superadmin@platform.test',
  password: env.SHM_TEST_PW_SUPERADMIN,
})
if (signIn.error) {
  console.error('super admin sign-in failed:', signIn.error.message)
  process.exit(1)
}

const target = await supabase.from('app_user').select('id, email, role').eq('email', email).maybeSingle()
if (target.error || !target.data) {
  console.error('no app_user with that email:', email, target.error?.message ?? '')
  process.exit(1)
}

const res = await supabase.functions.invoke('manage-account', {
  body: { action: 'set_password', user_id: target.data.id, password },
})
if (res.error) {
  console.error('manage-account failed:', res.error.message)
  process.exit(1)
}
if (!res.data?.ok) {
  console.error('manage-account refused:', JSON.stringify(res.data))
  process.exit(1)
}
await supabase.auth.signOut()

// Replace the variable in place if it is there, append it if it is not.
const line = `${varName}=${password}`
const next = new RegExp(`^${varName}=.*$`, 'm').test(raw)
  ? raw.replace(new RegExp(`^${varName}=.*$`, 'm'), line)
  : `${raw.replace(/\n*$/, '')}\n${line}\n`
writeFileSync(envPath, next)

// The proof is not the function's answer: it is a sign-in with the new
// password. A set_password that reported success and left the old one
// working would look exactly like this without it.
const check = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const proof = await check.auth.signInWithPassword({ email, password })
if (proof.error) {
  console.error(`password was set but ${email} cannot sign in with it:`, proof.error.message)
  process.exit(1)
}
await check.auth.signOut()
console.log(`${email}: password set and verified by signing in; .env.local ${varName} updated`)
