import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The breakdowns the results framework asks for, and the gap underneath them.
 *
 *  `v_indicator_disaggregated` is real and has been since 0014. It covers the
 *  four indicators that count distinct people — A1.3, B1.2, D0.1, E0.2 — and
 *  splits each by sex, age band, refugee status, disability status and village.
 *
 *  ── OQ-12, WHICH THIS MUST NOT HIDE ──
 *
 *  NO FORM IN THIS PLATFORM COLLECTS REFUGEE STATUS OR DISABILITY.
 *
 *  `person.is_refugee` and `person.has_disability` exist and are nullable.
 *  Fields for them were built onto the completion and registration forms on
 *  2026-08-24 and removed again the same day on the project owner's
 *  instruction. Nothing has asked since.
 *
 *  So every value in those two columns today comes from SEEDED demo rows, and
 *  every person entered through a real form lands in `not_recorded`. That is
 *  already demonstrable: the person created through /forms/tc during this
 *  audit shows refugee_status = not_recorded, disability_status = not_recorded
 *  and village = not_recorded, sitting in the same table as four seeded people
 *  who have all three.
 *
 *  This matters more than a normal missing field. The Action Plan exists
 *  because of an assessment on the inclusion of Syrian refugees in municipal
 *  services — refugee disaggregation is the POINT of the programme, not a
 *  nice-to-have. A panel that renders "1 refugee, 2 non-refugee" from seed data
 *  without saying so would be the most misleading screen in the platform.
 *
 *  The view is honest: it buckets nulls as `not_recorded` rather than dropping
 *  those people, so the breakdown always reconciles with the headline. The
 *  panel's job is to say why that bucket will be everyone.
 *
 *  ── WHAT IS DELIBERATELY NOT DONE HERE ──
 *
 *  The fields are not being added back. OQ-12 is red and belongs to the
 *  Coordinator, and it may need a data-protection review — asking a person
 *  whether they are a refugee, in a municipal register keyed on national ID,
 *  is not a schema decision.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The four indicators v_indicator_disaggregated covers. */
export const DISAGGREGABLE_CODES = ['A1.3', 'B1.2', 'D0.1', 'E0.2'] as const

/** The five dimensions, in the order the framework lists them. */
export const DIMENSIONS = ['sex', 'age_band', 'refugee_status', 'disability_status', 'village'] as const
export type Dimension = (typeof DIMENSIONS)[number]

/**
 * The two dimensions no form asks about. Named here rather than inferred from
 * the data: inferring would mean "everything is not_recorded, so probably
 * nobody collects it", which stops being true the moment one seeded row has a
 * value — which is exactly the state today.
 */
export const UNCOLLECTED_DIMENSIONS: readonly Dimension[] = ['refugee_status', 'disability_status']

export type DisaggregatedRow = {
  code: string
  period_code: string
  sex: string
  age_band: string
  refugee_status: string
  disability_status: string
  village: string
  value: number
}

export const disaggKeys = {
  period: (period: string) => ['disaggregated', period] as const,
}

export function useDisaggregation(periodCode: string | undefined) {
  return useQuery({
    queryKey: disaggKeys.period(periodCode ?? ''),
    enabled: !!periodCode,
    queryFn: async (): Promise<DisaggregatedRow[]> => {
      const res = await supabase
        .from('v_indicator_disaggregated')
        .select('code, period_code, sex, age_band, refugee_status, disability_status, village, value')
        .eq('period_code', periodCode as string)
      return unwrapList(res as unknown as { data: DisaggregatedRow[] | null; error: unknown })
    },
  })
}

/**
 * Collapse the cross-product to one dimension.
 *
 * The view returns one row per distinct COMBINATION of all five dimensions, so
 * reading "how many women" means summing every row whose sex is female — not
 * picking one row. Getting this wrong would under-report every bucket, quietly,
 * and it is the only arithmetic on this path.
 *
 * `value` is already `count(distinct person_id)` per combination, and the
 * combinations are disjoint, so summing them is correct and does not
 * double-count a person. It is a sum of the view's numbers, not a recount of
 * anything — nothing here computes an indicator.
 */
export function tally(
  rows: DisaggregatedRow[],
  code: string,
  dim: Dimension,
): { bucket: string; value: number }[] {
  const acc = new Map<string, number>()
  for (const r of rows) {
    if (r.code !== code) continue
    const bucket = r[dim]
    acc.set(bucket, (acc.get(bucket) ?? 0) + Number(r.value))
  }
  return [...acc.entries()]
    .map(([bucket, value]) => ({ bucket, value }))
    // `not_recorded` last wherever it appears, then biggest first. It is not a
    // category of person, it is the absence of an answer, and sorting it into
    // the middle of real categories reads as one.
    .sort((a, b) =>
      a.bucket === 'not_recorded'
        ? 1
        : b.bucket === 'not_recorded'
          ? -1
          : b.value - a.value || a.bucket.localeCompare(b.bucket),
    )
}

/** Total for one indicator, from the same rows. Used to render shares. */
export function totalFor(rows: DisaggregatedRow[], code: string): number {
  return rows.reduce((n, r) => (r.code === code ? n + Number(r.value) : n), 0)
}
