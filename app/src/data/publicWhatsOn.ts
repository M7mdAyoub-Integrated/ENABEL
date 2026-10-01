import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The public read of a what's-on page: Khalidiyah's and Ramtha's.
 *
 *  It lists what the Municipality has PUBLISHED and has not ended.
 *  Khalidiyah: the community activities (FORM-08), markets (FORM-16),
 *  volunteer campaigns (FORM-07) and counselling sessions (FORM-14), from
 *  `v_public_khld_whats_on` (0163, 0167); `apply_until` is the last day to
 *  apply, for a campaign or a session, and null otherwise. Ramtha: the
 *  activities of its Activity Register (FORM-03), from
 *  `v_public_rmth_whats_on` (0181) -- the same columns, plus the title in
 *  Arabic (a Ramtha title is a list label, the activity's category) and its
 *  sector, because the sheet gives an activity no name, place or
 *  description. Each view is security definer over base tables, and its own
 *  WHERE clauses are the entire boundary: published, not deleted, the
 *  municipality active, not yet ended.
 *
 *  NOTHING HERE FILTERS FOR SECURITY. The slug is the page's choice. No
 *  counts, no names, no partners, no participants arrive here, because the
 *  views do not carry them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WhatsOnItem = {
  id: string
  kind: 'activity' | 'market' | 'campaign' | 'session'
  title: string
  /** Ramtha's only: the category label in Arabic. */
  title_ar?: string | null
  on_date: string
  time_from: string | null
  time_to: string | null
  place_en: string | null
  place_ar: string | null
  type_en: string | null
  type_ar: string | null
  description: string | null
  municipality_slug: string
  end_date: string
  apply_until: string | null
  /** Ramtha's only: AC-06, the activity's sector / field. */
  sector_en?: string | null
  sector_ar?: string | null
}

const COMMON = 'id, kind, title, on_date, time_from, time_to, place_en, place_ar, type_en, type_ar, description, municipality_slug, end_date, apply_until'

/** Which view a municipality's page reads, and what it selects from it. */
const SOURCE: Record<string, { view: string; select: string }> = {
  KHLD: { view: 'v_public_khld_whats_on', select: COMMON },
  RMTH: { view: 'v_public_rmth_whats_on', select: `${COMMON}, title_ar, sector_en, sector_ar` },
}

type Loose = { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }> } } } }

/** Everything published and still to come in one municipality, soonest first. */
export function usePublicWhatsOn(slug: string, code: string) {
  const source = SOURCE[code]
  return useQuery({
    queryKey: ['public', 'whatsOn', slug],
    enabled: !!source,
    staleTime: 60_000,
    queryFn: async (): Promise<WhatsOnItem[]> => {
      const res = await (supabase as unknown as Loose)
        .from(source!.view)
        .select(source!.select)
        .eq('municipality_slug', slug)
        .order('on_date', { ascending: true })
      return unwrapList(res as unknown as { data: WhatsOnItem[] | null; error: unknown })
    },
  })
}
