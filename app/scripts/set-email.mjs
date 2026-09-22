#!/usr/bin/env node
/**
 * Change an existing account's email through the manage-account Edge
 * Function, as the super admin.
 *
 *   node scripts/set-email.mjs coordinator@shm.test admin@shm.test
 *
 * ── WHY NOT SQL ──
 *
 * The address is in auth.users, with a copy in auth.identities' identity_data
 * that GoTrue matches a sign-in against, and again in public.app_user.email.
 * An UPDATE on auth.users moves one of the three; the account then fails to
 * sign in under either address, which is 0030's failure exactly. The admin
 * API is the only writer that keeps GoTrue's own rows consistent, and the
 * function does the app_user write beside it and reads both back.
 *
 * This does NOT touch .env.local: the password is unchanged by a rename, and
 * the variable it lives under is named for the account's role, not its
 * address. Update demo-as.mjs's ACCOUNTS map in the same commit as a rename.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = join(here, '..', '.env.local')

const [from, to] = process.argv.slice(2)
if (!from || !to) {
  console.error('usage: node scripts/set-email.mjs <current email> <new email>')
  process.exit(2)
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const signIn = await supabase.auth.signInWithPassword({
  email: 'superadmin@platform.test',
  password: env.SHM_TEST_PW_SUPERADMIN,
})
if (signIn.error) {
  console.error('super admin sign-in failed:', signIn.error.message)
  process.exit(1)
}

const target = await supabase.from('app_user').select('id, email, role').eq('email', from).maybeSingle()
if (target.error || !target.data) {
  console.error('no app_user with that email:', from, target.error?.message ?? '')
  process.exit(1)
}

const res = await supabase.functions.invoke('manage-account', {
  body: { action: 'set_email', user_id: target.data.id, email: to },
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

console.log(`${from} -> ${res.data.email}, both rows read back by the function`)
