import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  People the public website cannot identify — OQ-22, made visible.
 *
 *  `applicant_prefill` (0052) verifies a member of the public on national ID +
 *  date of birth, and `0053` added one narrow fallback: national ID + phone,
 *  but ONLY when `date_of_birth` is null. The asymmetry is deliberate — a
 *  person who HAS a date of birth on file cannot be verified by phone, because
 *  otherwise knowing someone's phone number would bypass the stronger factor.
 *
 *  So a person carries one of three states:
 *
 *    date of birth on file   → can self-serve, on the strong factor
 *    no DOB, phone on file   → can self-serve, on the fallback
 *    neither                 → CANNOT self-serve at all. Not apply, not check
 *                              an application, not request a linkage. Ever,
 *                              until a member of staff adds one of the two.
 *
 *  The third state is not a bug to engineer around — OQ-22 settled that, and
 *  weakening the lookup to match on a name is how two people with one name
 *  become one person. It is a gap that has to be WORKED, at the counter, by
 *  someone who can ask. The only thing that was wrong was that nothing showed
 *  it to them: the forms created the state silently and no screen listed it.
 *
 *  `v_person_missing_verification` is the view 0053 added for exactly this and
 *  which nothing had ever read.
 *
 *  ── WHY THIS IS NOT AN INDICATOR AND NOT ON THE DASHBOARD ──
 *
 *  It counts nothing the donor asked for. It is a data-quality worklist about
 *  the platform's own reachability, so it sits on /settings — the one screen
 *  every staff role can open from the rail, and which otherwise holds only the
 *  language control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type VerificationState = 'cannot_self_serve' | 'phone_only'

export type UnverifiablePerson = {
  id: string
  national_id: string
  full_name: string
  village: string | null
  phone: string | null
  verification_state: VerificationState
}

export const verificationKeys = {
  missing: () => ['person', 'missing-verification'] as const,
}

export function useMissingVerification() {
  return useQuery({
    queryKey: verificationKeys.missing(),
    queryFn: async (): Promise<UnverifiablePerson[]> => {
      // The view already filters `deleted_at is null` and `date_of_birth is
      // null`, so everything it returns is in one of the two states. Ordered
      // with the people who cannot self-serve at all first: they are the ones
      // who need a phone call, and the phone_only rows are only a note.
      const res = await supabase
        .from('v_person_missing_verification')
        .select('id, national_id, full_name, village, phone, verification_state')
        .order('verification_state')
        .order('full_name')
      return unwrapList(
        res as unknown as { data: UnverifiablePerson[] | null; error: unknown },
      )
    },
  })
}
