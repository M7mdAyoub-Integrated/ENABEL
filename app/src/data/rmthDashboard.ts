import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Ramtha's dashboard numbers. Eighteen rows, from the database.
 *
 *  Same discipline as data/indicators.ts: nothing is computed here. target,
 *  actual, progress and status come decided from `v_indicator_progress`;
 *  whether an indicator can compute at all, and which definition it waits
 *  on, comes from `v_rmth_indicator_status` (0132); the "of whom unique"
 *  figure beside the three completion counts from `v_rmth_indicator_unique`.
 *  A null actual is rendered as words, never as 0.
 *
 *  The names are read from the view (`name_en`/`name_ar`, seeded by 0131
 *  from the sheets and the Arabic Copy) rather than from a locale file: the
 *  Sahel Horan dashboard's `indicators:name.<code>` keys are Sahel Horan's
 *  statements, and `A1.2` is a different indicator here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type RmthProgressRow = {
  code: string
  name_en: string
  name_ar: string | null
  unit: string
  indicator_type: string
  objective_code: string
  objective_name_en: string
  objective_name_ar: string | null
  objective_sort: number
  sort_order: number
  period_code: string
  /** null means no target is set for this quarter -- every Ramtha target is (0131). NEVER read as 0. */
  target: number | null
  actual: number | null
  denominator: number | null
  progress_pct: number | null
  status: 'not_set' | 'not_started' | 'on_track' | 'behind' | 'complete'
  municipality_id: string
}

export type RmthStatusRow = {
  code: string
  full_code: string
  reason: 'no_statement' | 'threshold_unset' | null
  missing_keys: string[] | null
}

export type RmthUniqueRow = { code: string; period_code: string; unique_actual: number }

export function useRmthProgress(periodCode: string | undefined) {
  return useQuery({
    queryKey: ['indicators', 'rmth', 'progress', periodCode],
    enabled: !!periodCode,
    queryFn: async (): Promise<RmthProgressRow[]> => {
      const res = await supabase
        .from('v_indicator_progress')
        .select(
          'code, name_en, name_ar, unit, indicator_type, objective_code, objective_name_en, objective_name_ar, objective_sort, ' +
            'sort_order, period_code, target, actual, denominator, progress_pct, status, municipality_id',
        )
        .eq('period_code', periodCode!)
        .order('objective_sort', { ascending: true })
        .order('sort_order', { ascending: true })
      return unwrapList(res as unknown as { data: RmthProgressRow[] | null; error: unknown })
    },
  })
}

export function useRmthStatus() {
  return useQuery({
    queryKey: ['indicators', 'rmth', 'status'],
    staleTime: 60_000,
    queryFn: async (): Promise<RmthStatusRow[]> => {
      const res = await supabase.from('v_rmth_indicator_status').select('code, full_code, reason, missing_keys')
      return unwrapList(res as unknown as { data: RmthStatusRow[] | null; error: unknown })
    },
  })
}

export function useRmthUnique(periodCode: string | undefined) {
  return useQuery({
    queryKey: ['indicators', 'rmth', 'unique', periodCode],
    enabled: !!periodCode,
    queryFn: async (): Promise<RmthUniqueRow[]> => {
      const res = await supabase.from('v_rmth_indicator_unique').select('code, period_code, unique_actual').eq('period_code', periodCode!)
      return unwrapList(res as unknown as { data: RmthUniqueRow[] | null; error: unknown })
    },
  })
}

/**
 * The four headline cards, by code. Each IS one of the rows below it -- the
 * same rule as the Sahel Horan dashboard: never a second query, never a
 * derived total. Chosen as the four with a form each and no open item:
 * events held, proposals approved, incubators established, participants in
 * incubation.
 */
export const RMTH_KPI_CODES = ['A1.2', 'B1.2', 'E0.1', 'E0.2'] as const
