import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError } from './errors'
import { normaliseNationalId, normalisePhone } from './apply'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  "My applications".
 *
 *  One RPC, `my_applications` (0070, corrected by 0071). Everything that
 *  matters is decided in SQL, and this file must not acquire a rule of its own.
 *
 *  ── WHY IT IS A MUTATION AND NOT A QUERY ──
 *
 *  Same reason as the applicant lookup: it is an ATTEMPT, it is rate limited,
 *  and it must never be retried automatically or replayed from cache. A cached
 *  result would also mean somebody's national ID and their whole application
 *  history sitting in the query cache on a shared phone.
 *
 *  `gcTime: 0` so it is dropped the moment the component unmounts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Exactly the four fields the RPC returns. Nothing here is an id. */
export type ApplicationRow = {
  kind: 'training' | 'advisory' | 'exhibition' | 'linkage'
  title: string
  on: string | null
  status: string
}

export type MyApplicationsResult =
  | { found: false }
  | { found: true; applications: ApplicationRow[] }

export type MyApplicationsInput = {
  nationalId: string
  dateOfBirth?: string | null
  phone?: string | null
  /** The public page's municipality: identity is shared, history is this municipality's only (0120). */
  municipalitySlug: string
}

export function useMyApplications() {
  return useMutation({
    mutationKey: ['public', 'my-applications'],
    retry: false,
    gcTime: 0,
    mutationFn: async (input: MyApplicationsInput): Promise<MyApplicationsResult> => {
      // Keys are OMITTED rather than set to undefined: exactOptionalPropertyTypes
      // treats an explicit undefined as a different thing from an absent key,
      // and an absent argument is what makes Postgres apply the DEFAULT.
      const { data, error } = await supabase.rpc('my_applications', {
        p_national_id: normaliseNationalId(input.nationalId),
        p_municipality_slug: input.municipalitySlug,
        ...(input.dateOfBirth ? { p_date_of_birth: input.dateOfBirth } : {}),
        ...(input.phone ? { p_phone: normalisePhone(input.phone) } : {}),
      })
      if (error) throw toAppError(error)
      return (data ?? { found: false }) as MyApplicationsResult
    },
  })
}

/**
 * Newest first, as the RPC already returns them.
 *
 * Re-sorting here would be a second ordering rule free to drift from the one in
 * SQL, so this only exists to say plainly that the order is not this file's to
 * decide.
 */
export function applicationsOf(r: MyApplicationsResult): ApplicationRow[] {
  return r.found ? r.applications : []
}
