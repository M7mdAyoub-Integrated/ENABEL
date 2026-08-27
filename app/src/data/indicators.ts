import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The dashboard's numbers. All twenty of them, from the database.
 *
 *  ── WHAT THIS REPLACES ──
 *
 *  `useIndicatorGroups` in hooks/useData.ts returned hardcoded literals:
 *
 *      { code: 'A1.3', target: '120', actual: '47', pct: 39 }
 *
 *  The real A1.3 was 3. Worse than a mockup, because the same table mixed
 *  invented figures with one genuinely computed count (A1.2 read the real
 *  partnership total), so a coordinator had no way to tell which numbers came
 *  from their own data. A screen that is entirely fake reads as a prototype; a
 *  screen that is half true teaches people to trust all of it.
 *
 *  ── NO FALLBACKS. ANYWHERE. ──
 *
 *  If the query fails, the screen says so and shows nothing. There is no
 *  default value, no last-known figure, no zero standing in for an unknown.
 *  A fallback here is a number that looks real when a query failed, which is
 *  the exact failure this file exists to remove.
 *
 *  ── NOTHING IS COMPUTED HERE ──
 *
 *  target, actual, progress and status all arrive decided by
 *  `v_indicator_progress`. The counting rules -- distinct people for A1.3,
 *  B1.2, D0.1 and E0.2, running totals versus sums, a zero target meaning
 *  "not set" -- live in SQL and were tested there. Recomputing any of it in
 *  TypeScript would create a second implementation to drift from the donor
 *  return. The only arithmetic below is turning a percentage into a bar width.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type IndicatorStatus =
  | 'not_set'
  | 'not_started'
  | 'on_track'
  | 'behind'
  | 'complete'

export type IndicatorRow = {
  code: string
  unit: string
  objective_code: string
  objective_sort: number
  sort_order: number
  period_code: string
  /** null means the workbook sets no target for this quarter. NEVER read as 0. */
  target: number | null
  actual: number | null
  progress_pct: number | null
  status: IndicatorStatus
  is_disaggregable: boolean
  /** True when no data-collection form feeds this indicator. */
  is_manual: boolean
}

export type ReportingPeriod = {
  code: string
  start_date: string
  end_date: string
  is_locked: boolean
}

/* ── where a row's source-form chip points ────────────────────────────────── */

/**
 * `indicator.data_source` names a table; the sidebar names a module. Two of
 * them need the indicator code as well, because `partnership` feeds both the
 * training partnerships form (A1.2) and the production one (C1.1).
 */
const BY_CODE: Record<string, string[]> = {
  'A1.2': ['tp'],
  'C1.1': ['pp'],
  'G0.4': ['tp', 'pp'],
}

const BY_SOURCE: Record<string, string[]> = {
  followup_survey: ['fu'],
  training_enrolment: ['tc'],
  market_linkage: ['ln'],
  exhibition: ['ex'],
  exhibition_registration: ['rg'],
}

/**
 * Entry paths that are not one of the seven form modules.
 *
 * D0.2 counts training_session rows with is_delivered and a food-processing
 * topic. The sessions screen sets exactly that flag, so this indicator HAS an
 * entry path -- it just is not a /forms/ module. Without this it would carry a
 * "no entry path yet" tag that stopped being true the moment /sessions landed.
 *
 * The five on the manual-entries screen point there for the same reason.
 */
const BY_CODE_PATH: Record<string, { to: string; labelKey: string }[]> = {
  'D0.2': [{ to: '/sessions', labelKey: 'nav:sessions' }],
  'B1.1': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'G0.1': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'F0.1': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'G0.2': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'G0.3': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
}

export type SourceLink = { to: string; labelKey: string }

/**
 * Where the source chip on an indicator row points.
 *
 * Returns [] only when the indicator genuinely has NOWHERE to be entered --
 * which after the manual-entries screen is B1.2, D0.1 and C1.3, all three of
 * which count distinct people and need a per-person log that does not exist
 * yet for D0.1.
 */
export function sourceLinks(code: string, dataSource: string): SourceLink[] {
  const byPath = BY_CODE_PATH[code]
  if (byPath) return byPath
  const mods = BY_CODE[code] ?? BY_SOURCE[dataSource] ?? []
  return mods.map((m) => ({ to: `/forms/${m}`, labelKey: `nav:module.${m}` }))
}

/* ── periods ──────────────────────────────────────────────────────────────── */

export function useReportingPeriods() {
  return useQuery({
    queryKey: ['indicators', 'periods'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<ReportingPeriod[]> => {
      const res = await supabase
        .from('reporting_period')
        .select('code, start_date, end_date, is_locked')
        .order('code', { ascending: true })
      return unwrapList(res as unknown as { data: ReportingPeriod[] | null; error: unknown })
    },
  })
}

/** The quarter today falls in, or the first one if the plan has not started. */
export function currentPeriodCode(periods: ReportingPeriod[]): string | undefined {
  const today = new Date().toISOString().slice(0, 10)
  const live = periods.find((p) => p.start_date <= today && p.end_date >= today)
  return live?.code ?? periods[0]?.code
}

/* ── the twenty ───────────────────────────────────────────────────────────── */

export function useIndicatorRows(periodCode: string | undefined) {
  return useQuery({
    queryKey: ['indicators', 'rows', periodCode],
    enabled: !!periodCode,
    queryFn: async (): Promise<IndicatorRow[]> => {
      const res = await supabase
        .from('v_indicator_progress')
        .select(
          'code, unit, objective_code, objective_sort, sort_order, period_code, ' +
            'target, actual, progress_pct, status, is_disaggregable, is_manual',
        )
        .eq('period_code', periodCode!)
        .order('objective_sort', { ascending: true })
        .order('sort_order', { ascending: true })
      return unwrapList(res as unknown as { data: IndicatorRow[] | null; error: unknown })
    },
  })
}

/** `indicator.data_source`, needed only to point the source chips somewhere. */
export function useIndicatorSources() {
  return useQuery({
    queryKey: ['indicators', 'sources'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<{ code: string; data_source: string }[]> => {
      const res = await supabase.from('indicator').select('code, data_source')
      return unwrapList(
        res as unknown as { data: { code: string; data_source: string }[] | null; error: unknown },
      )
    },
  })
}

/* ── presentation helpers, kept out of the components ─────────────────────── */

/**
 * Is there a target at all?
 *
 * TWO VALUES MEAN "NO", AND ONLY ONE OF THEM IS NULL.
 *
 * `indicator_target.target_value` is 0 for a good many quarters -- the plan
 * expects no delivery that quarter. Migration 0037 already decided a zero
 * target is not an achievable target: it reports `status = 'not_set'` and
 * `progress_pct = null` for both. But it leaves the `target` column as 0,
 * because that IS the stored figure.
 *
 * So a UI testing only for null prints "of 0" and "0%" -- which is exactly
 * CLAUDE.md rule 1's failure: a zero reads as a real target in a donor report,
 * and "0 of 0, 0%" reads as failure against a real plan rather than a quarter
 * with nothing planned. Found by pointing the screen at 27/Q1, where C1.2,
 * E0.1 and G0.4 all carry a stored target of 0.
 */
export function hasTarget(row: IndicatorRow): boolean {
  return row.target !== null && Number(row.target) !== 0
}

/**
 * How a target is written.
 *
 * CLAUDE.md rule 1: a missing target is not a zero target. Neither is a zero
 * one. Both render as words, never a digit.
 */
export function targetText(row: IndicatorRow, notSet: string): string {
  if (!hasTarget(row)) return notSet
  return row.unit === '%' ? `${row.target}%` : String(row.target)
}

export function actualText(row: IndicatorRow, none: string): string {
  if (row.actual === null) return none
  return row.unit === '%' ? `${row.actual}%` : String(row.actual)
}

/** Bar width. No target means no bar -- not a full one, and not an empty one. */
export function barWidth(row: IndicatorRow): number | null {
  if (!hasTarget(row) || row.progress_pct === null) return null
  return Math.max(0, Math.min(100, Number(row.progress_pct)))
}

/**
 * The four headline cards.
 *
 * Each card IS one of the rows below it, by code — not a separate query and not
 * a derived total. A card that summed A1.2 and C1.1 would be a second
 * calculation able to disagree with the table under it, and a headline figure
 * that contradicts the detail is worse than no headline at all.
 */
export const KPI_CODES = ['A1.3', 'C1.2', 'E0.1', 'G0.4'] as const

export const KPI_TONE: Record<(typeof KPI_CODES)[number], 'teal' | 'raised' | 'amber' | 'green'> = {
  'A1.3': 'teal',
  'C1.2': 'green',
  'E0.1': 'amber',
  'G0.4': 'raised',
}

/** Objective groups, in plan order, with the prototype's accents. */
export const OBJECTIVE_ACCENT: Record<string, 'teal' | 'green' | 'amber' | 'slate' | 'ink'> = {
  IMPACT: 'ink',
  SO1: 'teal',
  SO2: 'green',
  SO3: 'amber',
  SO4: 'slate',
}

export type IndicatorGroup = {
  objectiveCode: string
  accent: 'teal' | 'green' | 'amber' | 'slate' | 'ink'
  rows: IndicatorRow[]
  withoutForm: number
}

export function groupByObjective(rows: IndicatorRow[]): IndicatorGroup[] {
  const order: string[] = []
  const byCode = new Map<string, IndicatorRow[]>()
  for (const r of rows) {
    if (!byCode.has(r.objective_code)) {
      byCode.set(r.objective_code, [])
      order.push(r.objective_code)
    }
    byCode.get(r.objective_code)!.push(r)
  }
  return order.map((code) => {
    const list = byCode.get(code)!
    return {
      objectiveCode: code,
      accent: OBJECTIVE_ACCENT[code] ?? 'ink',
      rows: list,
      withoutForm: list.filter((r) => r.is_manual).length,
    }
  })
}
