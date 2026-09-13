import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The municipalities the public site can show.
 *
 *  From `v_public_municipality` (0120), the fifth and last object `anon` reads:
 *  slug, code, the two names and the two programme lines of every ACTIVE
 *  municipality. Nothing else -- no id, no counts, no person. A municipality
 *  that is deactivated in the table drops out of this list, and its public
 *  page stops existing with it. That is the reason this comes from the
 *  database rather than from a list in the bundle: a list here would go on
 *  saying "Ramtha" after the table stopped.
 *
 *  Read on every public page, so it is cached for an hour. Two rows.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type PublicMunicipality = {
  slug: string
  code: string
  name_en: string
  name_ar: string | null
  programme_en: string | null
  programme_ar: string | null
}

export function usePublicMunicipalities() {
  return useQuery({
    queryKey: ['public', 'municipalities'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<PublicMunicipality[]> => {
      const res = await supabase
        .from('v_public_municipality')
        .select('slug, code, name_en, name_ar, programme_en, programme_ar')
        .order('code')
      return unwrapList(res as unknown as { data: PublicMunicipality[] | null; error: unknown })
    },
  })
}
