import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'
import { useAuth } from '../auth/AuthProvider'

/**
 * The municipalities the platform serves. Two rows, seeded by migration 0111.
 *
 * Read by every signed-in role (`municipality_read` is `true`): the name goes
 * in the header of every screen and the slug is how the public site routes.
 * Nothing in this table is sensitive.
 */
export type Municipality = {
  id: string
  code: string
  slug: string
  name_en: string
  name_ar: string | null
  programme_en: string | null
  programme_ar: string | null
  is_active: boolean
}

export function useMunicipalities() {
  return useQuery({
    queryKey: ['municipalities'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<Municipality[]> => {
      const res = await supabase
        .from('municipality')
        .select('id, code, slug, name_en, name_ar, programme_en, programme_ar, is_active')
        .is('deleted_at', null)
        .order('code')
      return unwrapList(res as unknown as { data: Municipality[] | null; error: unknown })
    },
  })
}

/** The municipality the signed-in account is working in, or null while unknown / not chosen. */
export function useCurrentMunicipality(): Municipality | null {
  const { municipalityId } = useAuth()
  const { data } = useMunicipalities()
  if (!municipalityId || !data) return null
  return data.find((m) => m.id === municipalityId) ?? null
}

/** The display name in the current language, falling back to English when Arabic is not on file. */
export function useMunicipalityName() {
  const { i18n } = useTranslation()
  const ar = i18n.language.startsWith('ar')
  return (m: Pick<Municipality, 'name_en' | 'name_ar'> | null | undefined): string => {
    if (!m) return ''
    return (ar ? m.name_ar : null) ?? m.name_en
  }
}

export function useProgrammeLine() {
  const { i18n } = useTranslation()
  const ar = i18n.language.startsWith('ar')
  return (m: Pick<Municipality, 'programme_en' | 'programme_ar'> | null | undefined): string => {
    if (!m) return ''
    return (ar ? m.programme_ar : null) ?? m.programme_en ?? ''
  }
}
