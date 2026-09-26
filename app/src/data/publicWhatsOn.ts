import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The Khalidiyah public read: what's on.
 *
 *  Nothing on Khalidiyah's page is applied for, so it lists what the
 *  Municipality has PUBLISHED -- the community activities (FORM-08) and
 *  markets (FORM-16) that have not ended, from `v_public_khld_whats_on`
 *  (0163). Like `v_public_opportunity` it is security definer over base
 *  tables, and its own WHERE clauses are the entire boundary: published, not
 *  deleted, the municipality active, not yet ended. (The volunteer register
 *  is the page's one write; see data/publicVolunteer.ts.)
 *
 *  NOTHING HERE FILTERS FOR SECURITY. The slug is the page's choice. No
 *  counts, no names, no partners, no participants arrive here, because the
 *  view does not carry them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WhatsOnItem = {
  id: string
  kind: 'activity' | 'market'
  title: string
  on_date: string
  time_from: string | null
  time_to: string | null
  place_en: string | null
  place_ar: string | null
  type_en: string | null
  type_ar: string | null
  description: string | null
  municipality_slug: string
}

const SELECT = 'id, kind, title, on_date, time_from, time_to, place_en, place_ar, type_en, type_ar, description, municipality_slug'

type Loose = { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }> } } } }

/** Everything published and still to come in one municipality, soonest first. */
export function usePublicWhatsOn(slug: string) {
  return useQuery({
    queryKey: ['public', 'whatsOn', slug],
    staleTime: 60_000,
    queryFn: async (): Promise<WhatsOnItem[]> => {
      const res = await (supabase as unknown as Loose)
        .from('v_public_khld_whats_on')
        .select(SELECT)
        .eq('municipality_slug', slug)
        .order('on_date', { ascending: true })
      return unwrapList(res as unknown as { data: WhatsOnItem[] | null; error: unknown })
    },
  })
}
