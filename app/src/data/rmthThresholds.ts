import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * The seven open definitions (0123). Read by the forms (to show the agreed
 * completion rule, or that there is none) and by the dashboard (to say why an
 * indicator is not computable). Written by the M&E lead, not here.
 */
export type RmthThreshold = {
  id: string
  municipality_id: string
  key: string
  open_item: string
  label_en: string
  label_ar: string
  value_numeric: number | null
  value_text: string | null
  value_bool: boolean | null
  unit: string | null
  note_en: string
  note_ar: string
  decided_on: string | null
}

export function useRmthThresholds() {
  return useQuery({
    queryKey: ['rmth', 'thresholds'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RmthThreshold[]> => {
      const res = await (supabase
        .from('rmth_threshold')
        .select('id, municipality_id, key, open_item, label_en, label_ar, value_numeric, value_text, value_bool, unit, note_en, note_ar, decided_on')
        .is('deleted_at', null)
        .order('key') as unknown as Promise<{ data: RmthThreshold[] | null; error: unknown }>)
      return unwrapList(res)
    },
  })
}
