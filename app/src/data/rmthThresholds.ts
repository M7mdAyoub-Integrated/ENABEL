import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'

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

export function useRmthThresholds(enabled = true) {
  return useQuery({
    queryKey: ['rmth', 'thresholds'],
    enabled,
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

/**
 * Answering an open item: an UPDATE on its row with the value, who decided
 * and when (0123 -- `rmth_threshold_decision_dated` refuses a value without a
 * date). A coordinator of Ramtha or a super admin switched into it; RLS
 * refuses everyone else by filtering, so the rows that came back are counted.
 *
 * Invalidates the indicator queries as well as the thresholds: the point of
 * writing a definition is that a figure appears on the dashboard the reader
 * is about to go back to.
 */
export type ThresholdValue = { numeric?: number | null; text?: string | null; bool?: boolean | null }

export function useSetThreshold() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', 'thresholds', 'set'],
    retry: false,
    mutationFn: async ({ id, value, userId }: { id: string; value: ThresholdValue; userId: string | null }) => {
      const clear = value.numeric == null && (value.text == null || value.text === '') && value.bool == null
      const res = await (supabase
        .from('rmth_threshold')
        .update({
          value_numeric: value.numeric ?? null,
          value_text: value.text ? value.text : null,
          value_bool: value.bool ?? null,
          decided_on: clear ? null : new Date().toISOString().slice(0, 10),
          decided_by: clear ? null : userId,
        } as never)
        .eq('id', id)
        .select('id') as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>)
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length !== 1) throw toAppError({ code: '42501', message: 'forbidden' })
      return res.data[0]!.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rmth', 'thresholds'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}
