import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

/**
 * Supabase browser client.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  NEVER PUT THE service_role KEY IN THIS FILE, THIS FOLDER, OR ANY FILE
 *  UNDER app/.
 *
 *  service_role bypasses every row-level security policy in the database. This
 *  project stores national ID numbers, refugee status and disability status for
 *  a real municipality on an EU-funded programme. A service_role key in a
 *  browser bundle would expose all of it to anyone who opens devtools.
 *
 *  The anon / publishable key below is public by design -- it is shipped to
 *  every browser and is meant to be. RLS is what protects the data, not the
 *  secrecy of this key. See 08_FRONTEND_BUILD_PLAN.md section 6.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * As of Phase 3 the only queries made through this client are auth, plus the
 * two role lookups in AuthProvider (`app_user` and `person`). Screen data is
 * still mock and arrives for real in Phase 4, through the hooks in
 * hooks/useData.ts and nowhere else (08_FRONTEND_BUILD_PLAN.md section 5).
 */

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly at startup rather than at the first query in Phase 4.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // Supabase Auth manages its own storage. Section 6 of the build plan bans
    // localStorage/sessionStorage for everything else -- that ban does not
    // extend to the auth library's own session handling.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
