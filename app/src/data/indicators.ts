import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'
import { formatJOD } from '../lib/format'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The dashboard's numbers, for whichever municipality is asking.
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
 *
 *  ── EVERY QUERY NAMES ITS MUNICIPALITY ──
 *
 *  Since 0111 there are two programmes in one database, and every view here
 *  carries `municipality_id`. The views gate rows on `can_see_municipality()`
 *  whenever a JWT is present, so a signed-in coordinator could never see the
 *  other programme's rows even without a filter -- but "could never" is a
 *  property of the database's gate, and the audit that led here (PLATFORM_AUDIT
 *  §1.1) is about queries that were correct with one municipality and became
 *  silently wrong with two. `A1.2` exists in both programmes and means two
 *  different things. So every hook takes the municipality it is asking about
 *  and puts it in the WHERE clause and in the query key, and nothing here
 *  finds a row by code alone in a result that could hold both.
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
  /** The framework's own statement, seeded from the workbook (0017, 0131). */
  name_en: string
  name_ar: string | null
  unit: string
  objective_code: string
  objective_name_en: string
  objective_name_ar: string | null
  objective_sort: number
  sort_order: number
  period_code: string
  /** null means the workbook sets no target for this quarter. NEVER read as 0. */
  target: number | null
  actual: number | null
  /** The denominator of a percentage indicator; null for a count. */
  denominator: number | null
  progress_pct: number | null
  status: IndicatorStatus
  /** True when `v_indicator_disaggregated` covers this indicator. */
  is_disaggregable: boolean
  /** True when no data-collection form feeds this indicator. */
  is_manual: boolean
  municipality_id: string
}

export type ReportingPeriod = {
  code: string
  start_date: string
  end_date: string
  is_locked: boolean
}

/**
 * One row of `indicator` per code: where the figure comes from, and the full
 * code that ties a Ramtha row to the form that feeds it (`RMTH_FORMS[fid]
 * .indicator` is a full code). `disaggregation` is the framework's own list
 * of required breakdowns, as the workbook wrote it.
 */
export type IndicatorSource = {
  code: string
  full_code: string
  data_source: string | null
  disaggregation: string[] | null
}

/**
 * Why a row has no figure, from `v_rmth_indicator_status` (0132) and
 * `v_khld_indicator_status` (0150), each of which reads the same rows its
 * programme's views do -- so the screen and the figure cannot disagree.
 *
 *   threshold_unset      the view returns null because a definition in
 *                        `rmth_threshold` is still null; `missing_keys` names it
 *   no_statement         the framework gives the code and no indicator text
 *   rule_not_evaluable   a Khalidiyah milestone's rule names items that are
 *                        not checklist rows (OQ-56); `detail` names them
 *
 * Both views are queried for every municipality: the alternative is a branch
 * on the municipality's code in the component, which is the shape that put
 * Sahel Horan's copy on an advisory screen. Each view answers only its own
 * programme's rows; for Sahel Horan neither returns any, and no row is marked
 * not computable -- which is the truth, not a special case.
 */
export type IndicatorStatusRow = {
  code: string
  full_code: string
  reason: 'no_statement' | 'threshold_unset' | 'rule_not_evaluable' | null
  missing_keys: string[] | null
  /** Khalidiyah: the rule's broken references, `4 = period_covered (text), ...`. */
  detail?: string | null
  milestone_code?: string | null
}

/** "Of whom unique" beside a count, from `v_rmth_indicator_unique` (0133) and `v_khld_indicator_unique` (0150). */
export type IndicatorUniqueRow = { code: string; period_code: string; unique_actual: number }

/**
 * A target the Plan states for the whole period, by year or as a percentage
 * (`indicator_plan_target`, 0149): never a quarterly figure, so it sits
 * beside the quarterly column, which reads "not set". `source_*` is the
 * framework's sentence verbatim; the typed columns are what could be read
 * from it. A parent row's children are the shares of one target (SO3-F2's
 * "of whom >= 40% women").
 */
export type PlanTarget = {
  id: string
  indicator_code: string
  parent_id: string | null
  source_en: string
  source_ar: string | null
  basis: 'percentage' | 'annual' | 'plan' | 'range' | 'narrative'
  minimum: number | null
  maximum: number | null
  unit: '#' | '%' | 'JOD' | null
  subgroup: string | null
  sort_order: number
}

/* ── periods ──────────────────────────────────────────────────────────────── */

export function useReportingPeriods(municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'periods', municipalityId],
    enabled: !!municipalityId,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<ReportingPeriod[]> => {
      const res = await supabase
        .from('reporting_period')
        .select('code, start_date, end_date, is_locked')
        .eq('municipality_id', municipalityId!)
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

/* ── the rows ─────────────────────────────────────────────────────────────── */

export function useIndicatorRows(periodCode: string | undefined, municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'rows', municipalityId, periodCode],
    enabled: !!periodCode && !!municipalityId,
    queryFn: async (): Promise<IndicatorRow[]> => {
      const res = await supabase
        .from('v_indicator_progress')
        .select(
          'code, name_en, name_ar, unit, objective_code, objective_name_en, objective_name_ar, ' +
            'objective_sort, sort_order, period_code, target, actual, denominator, progress_pct, ' +
            'status, is_disaggregable, is_manual, municipality_id',
        )
        .eq('municipality_id', municipalityId!)
        .eq('period_code', periodCode!)
        .order('objective_sort', { ascending: true })
        .order('sort_order', { ascending: true })
      return unwrapList(res as unknown as { data: IndicatorRow[] | null; error: unknown })
    },
  })
}

/** `indicator` itself: source table, full code, required breakdowns. */
export function useIndicatorSources(municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'sources', municipalityId],
    enabled: !!municipalityId,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<IndicatorSource[]> => {
      const res = await supabase
        .from('indicator')
        .select('code, full_code, data_source, disaggregation')
        .eq('municipality_id', municipalityId!)
      return unwrapList(res as unknown as { data: IndicatorSource[] | null; error: unknown })
    },
  })
}

/**
 * The Khalidiyah views and the plan-target table by name: the generated
 * types are regenerated with each migration set, and these hooks must not
 * change with them (see data/khld.ts).
 */
type LooseResult = Promise<{ data: unknown; error: unknown }>
type LooseQuery = LooseResult & {
  eq: (c: string, v: unknown) => LooseQuery
  is: (c: string, v: null) => LooseQuery
  order: (c: string) => LooseQuery
}
const loose = supabase as unknown as { from: (t: string) => { select: (c: string) => LooseQuery } }

export function useIndicatorStatus(municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'status', municipalityId],
    enabled: !!municipalityId,
    staleTime: 60_000,
    queryFn: async (): Promise<IndicatorStatusRow[]> => {
      const [rmth, khld] = await Promise.all([
        supabase
          .from('v_rmth_indicator_status')
          .select('code, full_code, reason, missing_keys')
          .eq('municipality_id', municipalityId!),
        loose.from('v_khld_indicator_status').select('code, full_code, reason, detail, milestone_code').eq('municipality_id', municipalityId!),
      ])
      return [
        ...unwrapList(rmth as unknown as { data: IndicatorStatusRow[] | null; error: unknown }),
        ...unwrapList(khld as unknown as { data: IndicatorStatusRow[] | null; error: unknown }).map((r) => ({ ...r, missing_keys: null })),
      ]
    },
  })
}

export function useIndicatorUnique(periodCode: string | undefined, municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'unique', municipalityId, periodCode],
    enabled: !!periodCode && !!municipalityId,
    queryFn: async (): Promise<IndicatorUniqueRow[]> => {
      const [rmth, khld] = await Promise.all([
        supabase
          .from('v_rmth_indicator_unique')
          .select('code, period_code, unique_actual')
          .eq('municipality_id', municipalityId!)
          .eq('period_code', periodCode!),
        loose.from('v_khld_indicator_unique').select('code, period_code, unique_actual').eq('municipality_id', municipalityId!).eq('period_code', periodCode!),
      ])
      return [
        ...unwrapList(rmth as unknown as { data: IndicatorUniqueRow[] | null; error: unknown }),
        // the Khalidiyah view carries a row for every quarter, null until there is a figure
        ...unwrapList(khld as unknown as { data: IndicatorUniqueRow[] | null; error: unknown }).filter((r) => r.unique_actual !== null),
      ]
    },
  })
}

/** The Plan's own targets for a municipality: empty for Sahel Horan and Ramtha, whose targets are quarterly. */
export function usePlanTargets(municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'planTargets', municipalityId],
    enabled: !!municipalityId,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<PlanTarget[]> => {
      const res = await loose
        .from('indicator_plan_target')
        .select('id, parent_id, source_en, source_ar, basis, minimum, maximum, unit, subgroup, sort_order, indicator:indicator!indicator_plan_target_indicator_id_fkey ( code )')
        .eq('municipality_id', municipalityId!)
        .is('deleted_at', null)
        .order('sort_order')
      type Raw = Omit<PlanTarget, 'indicator_code'> & { indicator: { code: string } | null }
      return unwrapList(res as unknown as { data: Raw[] | null; error: unknown }).map(({ indicator, ...r }) => ({ ...r, indicator_code: indicator?.code ?? '' }))
    },
  })
}

/**
 * Does this municipality have a target in ANY quarter?
 *
 * The two reasons a quarter shows no target read very differently to a
 * coordinator. Sahel Horan's matrix starts at 27/Q1, so its first quarter has
 * none -- that is the framework's schedule, and the screen says so. Ramtha
 * has none in any quarter at all (0131, OQ-48), and telling a Ramtha
 * coordinator "this is the plan's first quarter, which the framework leaves
 * without targets" would be false: every quarter is like that. So the screen
 * asks the whole matrix, not just the quarter it is showing.
 *
 * A stored zero is not a target here either, for the reason `hasTarget` gives.
 */
export function useAnyTarget(municipalityId: string | null) {
  return useQuery({
    queryKey: ['indicators', 'anyTarget', municipalityId],
    enabled: !!municipalityId,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<boolean> => {
      const res = await supabase
        .from('indicator_target')
        .select('indicator_id')
        .eq('municipality_id', municipalityId!)
        .not('target_value', 'is', null)
        .neq('target_value', 0)
        .limit(1)
      return (
        unwrapList(res as unknown as { data: { indicator_id: string }[] | null; error: unknown })
          .length > 0
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
export function targetText(row: IndicatorRow, notSet: string, locale = 'en'): string {
  if (!hasTarget(row)) return notSet
  return figureText(row.unit, Number(row.target), locale)
}

export function actualText(row: IndicatorRow, none: string, locale = 'en'): string {
  if (row.actual === null) return none
  return figureText(row.unit, Number(row.actual), locale)
}

/**
 * By `indicator.unit`, never by code: '%' and '#' are the only units Sahel
 * Horan and Ramtha carry, so the JOD branch (Khalidiyah's SO1-A3, 0149)
 * cannot change a row of theirs. Money is written the platform's way --
 * three decimals, the currency named.
 */
function figureText(unit: string, value: number, locale: string): string {
  if (unit === '%') return `${value}%`
  if (unit === 'JOD') return formatJOD(value, locale)
  return String(value)
}

/** Bar width. No target means no bar -- not a full one, and not an empty one. */
export function barWidth(row: IndicatorRow): number | null {
  if (!hasTarget(row) || row.progress_pct === null) return null
  return Math.max(0, Math.min(100, Number(row.progress_pct)))
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
