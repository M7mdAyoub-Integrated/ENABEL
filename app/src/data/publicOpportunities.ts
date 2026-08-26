import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The public read.
 *
 *  This is the only data the anonymous site fetches, and it comes from the only
 *  object `anon` is granted: `v_public_opportunity`. That view is
 *  security definer, so its own WHERE clauses are the entire security boundary
 *  -- published, not cancelled, not ended, not soft-deleted. See
 *  05_ROLES_AND_RLS.md section 10.
 *
 *  NOTHING HERE FILTERS FOR SECURITY. If an unpublished or deleted record ever
 *  appeared on the public site, the fix would be in SQL, not in this file. The
 *  filtering below is only ever for what the visitor asked to see.
 *
 *  No personal data arrives here. No applicant names, no national IDs, no
 *  applicant counts -- `capacity` and `places_remaining`, never `seats_taken`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type OpportunityType = 'training' | 'advisory' | 'exhibition'

export type PublicOpportunity = {
  id: string
  opportunity_type: OpportunityType
  title: string
  description: string | null
  topic_en: string | null
  topic_ar: string | null
  start_date: string
  end_date: string
  location: string | null
  focal_point: string | null
  duration_hours: number | null
  application_opens_on: string | null
  application_closes_on: string | null
  applications_open: boolean
  capacity: number | null
  places_remaining: number | null
  is_full: boolean
}

const SELECT =
  'id, opportunity_type, title, description, topic_en, topic_ar, start_date, end_date, ' +
  'location, focal_point, duration_hours, application_opens_on, application_closes_on, ' +
  'applications_open, capacity, places_remaining, is_full'

/** Everything currently open, soonest first. */
export function usePublicOpportunities() {
  return useQuery({
    queryKey: ['public', 'opportunities'],
    // A farmer refreshing the page should see a market that opened this morning.
    staleTime: 60_000,
    queryFn: async (): Promise<PublicOpportunity[]> => {
      const res = await supabase
        .from('v_public_opportunity')
        .select(SELECT)
        .order('start_date', { ascending: true })
      return unwrapList(res as unknown as { data: PublicOpportunity[] | null; error: unknown })
    },
  })
}

export function usePublicOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: ['public', 'opportunity', id],
    enabled: !!id,
    queryFn: async (): Promise<PublicOpportunity> => {
      const res = await supabase
        .from('v_public_opportunity')
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle()
      if (res.error) throw toAppError(res.error)
      return unwrap(res as unknown as { data: PublicOpportunity | null; error: unknown })
    },
  })
}

/* ── what the card and the detail page actually say ──────────────────────── */

export type AvailabilityKind =
  /** Closed to applications: too early, too late, or the event is over. */
  | 'closed'
  /** Every place is taken. */
  | 'full'
  /** Open, and we know how many places are left. */
  | 'places'
  /** Open, and no capacity was set. The closing date is the useful fact. */
  | 'open'

/**
 * What to tell someone about availability.
 *
 * The interesting case is `open`: a training with no `planned_seats`. There is
 * no honest number to show, so the answer is NOT a blank space, NOT an invented
 * capacity, and NOT the applicant count. It is the closing date -- which is the
 * fact a farmer actually needs to decide whether to bother today.
 *
 * "Open · applications close 14 October" beats "9 places left" even when both
 * are available.
 */
export function availabilityOf(o: PublicOpportunity): {
  kind: AvailabilityKind
  places?: number
  closesOn?: string
} {
  if (!o.applications_open) return { kind: 'closed' }
  if (o.is_full) return { kind: 'full' }
  if (o.places_remaining != null) {
    return {
      kind: 'places',
      places: o.places_remaining,
      ...(o.application_closes_on ? { closesOn: o.application_closes_on } : {}),
    }
  }
  return {
    kind: 'open',
    ...(o.application_closes_on ? { closesOn: o.application_closes_on } : {}),
  }
}
