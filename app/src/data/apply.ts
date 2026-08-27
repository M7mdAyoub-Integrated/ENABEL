import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { OpportunityType } from './publicOpportunities'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The public application.
 *
 *  Two RPCs, both callable by `anon`, both security definer. Everything that
 *  matters is decided in SQL -- see migrations 0052, 0053 and 0054. This file
 *  carries no rules of its own, and must not acquire any:
 *
 *   • It does NOT decide whether someone is eligible.
 *   • It does NOT decide whether an opportunity is open or full.
 *   • It does NOT decide whether a national ID exists.
 *
 *  Every one of those is re-checked server-side on submit, because the page a
 *  visitor is looking at may be minutes old and because a client-side check is
 *  a suggestion, not a control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A national ID is exactly nine digits. Same rule as `person.national_id`. */
export function normaliseNationalId(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 9)
}

export function isCompleteNationalId(raw: string): boolean {
  return /^\d{9}$/.test(normaliseNationalId(raw))
}

/**
 * Group a national ID for reading: 300 000 001.
 *
 * Nine undifferentiated digits are genuinely hard to proofread against a card,
 * and the whole typo defence depends on someone actually checking. Display
 * only -- the value sent to the database is never grouped.
 */
export function groupNationalId(raw: string): string {
  const d = normaliseNationalId(raw)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ')
}

/** Jordanian phone numbers, compared the way the database compares them. */
export function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isUsablePhone(raw: string): boolean {
  return normalisePhone(raw).length >= 9
}

/* ── the lookup ───────────────────────────────────────────────────────────── */

/**
 * What `applicant_prefill` returns.
 *
 * Note what is NOT here, and must never be added: `is_refugee`,
 * `has_disability`, `disability_type_id`, and `person_id`. The first three are
 * why the registry is sensitive; the fourth would be a durable handle to a
 * person row sitting in a browser. See migration 0052.
 */
export type PrefillResult =
  | { found: false }
  | {
      found: true
      full_name: string
      sex: string | null
      village: string | null
      phone: string | null
      nationality_id: string | null
      agri_involvement_id: string | null
    }

export type LookupInput = {
  nationalId: string
  dateOfBirth?: string | null
  phone?: string | null
}

/**
 * Look someone up.
 *
 * A mutation rather than a query on purpose: it is an ATTEMPT, it is rate
 * limited, and it must never be retried automatically or replayed from cache.
 * A cached lookup would also mean a national ID sitting in the query cache.
 */
export function useApplicantLookup() {
  return useMutation({
    mutationKey: ['public', 'applicant-lookup'],
    retry: false,
    gcTime: 0,
    mutationFn: async (input: LookupInput): Promise<PrefillResult> => {
      // Keys are OMITTED rather than set to undefined: exactOptionalPropertyTypes
      // treats an explicit undefined as a different thing from an absent key,
      // and an absent argument is what makes Postgres apply the DEFAULT.
      const { data, error } = await supabase.rpc('applicant_prefill', {
        p_national_id: normaliseNationalId(input.nationalId),
        ...(input.dateOfBirth ? { p_date_of_birth: input.dateOfBirth } : {}),
        ...(input.phone ? { p_phone: normalisePhone(input.phone) } : {}),
      })
      if (error) throw toAppError(error)
      return (data ?? { found: false }) as PrefillResult
    },
  })
}

/* ── the application ──────────────────────────────────────────────────────── */

/**
 * Every outcome the database can return. There is no default branch anywhere
 * that consumes this -- an unhandled outcome should be a type error, not a
 * blank screen.
 */
export type ApplyOutcome =
  /** Written. */
  | 'applied'
  /** Already had an application for this. Not an error; the end state is right. */
  | 'already_applied'
  /**
   * Could not confirm who this is. ONE value covering a wrong date of birth, a
   * wrong phone, incomplete registration details, and a national ID already on
   * file. They are deliberately indistinguishable -- separating them would turn
   * this endpoint into a way to test whether an ID exists.
   */
  | 'cannot_verify'
  /** Closed, cancelled, finished, or never published. */
  | 'not_open'
  /** Every place is taken. */
  | 'full'
  /** A prerequisite is missing -- advisory needs a completed training. */
  | 'ineligible'
  /**
   * This exact submission was received before, and the application it created
   * has since been withdrawn by the Municipality. Distinct from
   * `already_applied` on purpose: telling someone they have already applied
   * when staff removed their application sends them away satisfied and wrong.
   */
  | 'withdrawn'

export type ApplyInput = {
  opportunityId: string
  opportunityType: OpportunityType
  nationalId: string
  dateOfBirth?: string | null
  phone?: string | null
  /** Only used when registering someone the database has never seen. */
  fullName?: string
  sex?: string
  village?: string
  /** Exhibitions only, and required by the database for them. */
  producerTypeId?: string
  /** Exhibitions only. Optional -- a producer may not have decided yet. */
  productIds?: string[]
  clientUuid: string
}

export type ApplyResult = {
  ok: boolean
  result: ApplyOutcome
  requires?: string
}

/**
 * Submit an application.
 *
 * `clientUuid` is generated once per attempt and reused across retries. If a
 * phone loses signal after the write but before the response, resending the
 * same clientUuid returns `already_applied` instead of creating a second row.
 * A duplicate application is not merely untidy: for exhibitions it would
 * eventually double-count a person in E0.2.
 */
export function useApplyForOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['public', 'apply'],
    // Never automatic. A refusal is an answer, not a transient failure, and
    // every attempt costs the caller throttle budget.
    retry: false,
    gcTime: 0,
    mutationFn: async (input: ApplyInput): Promise<ApplyResult> => {
      const { data, error } = await supabase.rpc('apply_for_opportunity', {
        p_opportunity_id: input.opportunityId,
        p_opportunity_type: input.opportunityType,
        p_national_id: normaliseNationalId(input.nationalId),
        p_client_uuid: input.clientUuid,
        ...(input.dateOfBirth ? { p_date_of_birth: input.dateOfBirth } : {}),
        ...(input.phone ? { p_phone: normalisePhone(input.phone) } : {}),
        ...(input.fullName?.trim() ? { p_full_name: input.fullName.trim() } : {}),
        ...(input.sex ? { p_sex: input.sex } : {}),
        ...(input.village?.trim() ? { p_village: input.village.trim() } : {}),
        ...(input.producerTypeId ? { p_producer_type_id: input.producerTypeId } : {}),
        ...(input.productIds?.length ? { p_product_ids: input.productIds } : {}),
      })
      if (error) throw toAppError(error)
      return data as ApplyResult
    },
    onSuccess: (res) => {
      // A successful application can change places_remaining once a coordinator
      // approves it, and the visitor may go straight back to the list.
      if (res.result === 'applied') {
        void qc.invalidateQueries({ queryKey: ['public', 'opportunities'] })
      }
    },
  })
}

/* ── public reference lists ───────────────────────────────────────────────── */

/**
 * The two lists the exhibition application needs.
 *
 * They come from `v_public_producer_type` and `v_public_product` -- views that
 * publish an id and two labels and nothing else. The underlying `ref_*` tables
 * are NOT granted to anon, so `sort_order`, `is_active`, `created_by` and
 * `deleted_at` never reach a browser. See migration 0056.
 *
 * Both filter `is_active` in SQL, so a retired option disappears from the form
 * on its own while rows that already reference it keep working.
 */
export type RefOption = { id: string; label_en: string; label_ar: string }

export function labelOf(o: RefOption, locale: string): string {
  return locale.startsWith('ar') ? o.label_ar || o.label_en : o.label_en
}

function useRefList(view: 'v_public_producer_type' | 'v_public_product', enabled: boolean) {
  return useQuery({
    queryKey: ['public', view],
    enabled,
    // Reference data changes about never. Do not refetch it on every step.
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<RefOption[]> => {
      const res = await supabase.from(view).select('id, label_en, label_ar')
      return unwrapList(res as unknown as { data: RefOption[] | null; error: unknown })
    },
  })
}

/** Only fetched on the exhibition branch -- nothing else asks for them. */
export function useProducerTypes(enabled: boolean) {
  return useRefList('v_public_producer_type', enabled)
}

export function useProducts(enabled: boolean) {
  return useRefList('v_public_product', enabled)
}
