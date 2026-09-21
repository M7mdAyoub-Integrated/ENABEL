#!/usr/bin/env node
/**
 * Create a staff account through the manage-account Edge Function, as the
 * super admin, and keep its generated password in .env.local.
 *
 *   node scripts/create-account.mjs admin@khalidiyah.test coordinator KHLD "Khalidiyah admin" SHM_TEST_PW_KHALIDIYAH_ADMIN
 *
 * ── WHY A SCRIPT ──
 *
 * CLAUDE.md rule 5 and KHALIDIYAH_IMPLEMENTATION_PLAN.md 3.2: never a
 * password in a migration. 0030 put one into the migration ledger, which
 * stores applied SQL verbatim, and it survived the git history rewrite. The
 * only sanctioned way to create a login is the Edge Function, which needs a
 * signed-in super admin; this is that call, from the command line, with the
 * super admin's password read from .env.local and never printed.
 *
 * The new password is generated here, sent once to the function, written to
 * .env.local under the variable name given, and never printed. .env.local is
 * gitignored. The function reads the account back before reporting success
 * (its header says why), and this script prints that read-back.
 */
import { readFileSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = join(here, '..', '.env.local')

const [email, role, municipalityCode, fullName, varName] = process.argv.slice(2)
if (!email || !role || !fullName || !varName) {
  console.error('usage: node scripts/create-account.mjs <email> <role> <municipality code|none> <full name> <ENV_VAR_NAME>')
  process.exit(2)
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
if (env[varName]) {
  console.error(`${varName} already exists in .env.local; refusing to overwrite it`)
  process.exit(1)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const signIn = await supabase.auth.signInWithPassword({ email: 'superadmin@platform.test', password: env.SHM_TEST_PW_SUPERADMIN })
if (signIn.error) {
  console.error('super admin sign-in failed:', signIn.error.message)
  process.exit(1)
}

let municipalityId = null
if (municipalityCode && municipalityCode !== 'none') {
  const m = await supabase.from('municipality').select('id').eq('code', municipalityCode).is('deleted_at', null).maybeSingle()
  if (m.error || !m.data) {
    console.error('municipality not found:', municipalityCode, m.error?.message ?? '')
    process.exit(1)
  }
  municipalityId = m.data.id
}

// 24 random bytes, base64url: 32 characters, no ambiguity, never printed.
const password = randomBytes(24).toString('base64url')

const res = await supabase.functions.invoke('manage-account', {
  body: { action: 'create', email, password, full_name: fullName, role, municipality_id: municipalityId },
})
if (res.error) {
  console.error('manage-account failed:', res.error.message)
  process.exit(1)
}
if (!res.data?.ok) {
  console.error('manage-account refused:', JSON.stringify(res.data))
  process.exit(1)
}

appendFileSync(envPath, `\n# ${new Date().toISOString().slice(0, 10)} ${email}, created through manage-account by scripts/create-account.mjs\n${varName}=${password}\n`)
await supabase.auth.signOut()
console.log('created', email, 'as', res.data.account ?? res.data)
console.log(`password written to .env.local as ${varName}`)
