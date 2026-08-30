import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import { normaliseNationalId } from './apply'
import type { TriStatus } from '../ui/surveyControls'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The follow-up survey. Forty-three questions, six sections.
 *
 *  ── HOW A PART-FINISHED SURVEY SURVIVES ──
 *
 *  Decided before the second section was built, because retrofitting it would
 *  mean touching all six.
 *
 *  The survey row is created as a DRAFT at the end of section 0. Every later
 *  section updates that row and upserts its children, so an enumerator who
 *  loses signal has lost the section they were typing, not the interview.
 *  Holding 43 answers in memory and writing once at the end would lose the
 *  whole thing to one dropped connection, in a field, with the farmer gone.
 *
 *  A draft is safe to leave lying around only because 0072 made the four
 *  survey-fed views require `submitted` or `approved`. Before that, this design
 *  would have moved A1 halfway through an interview.
 *
 *  ── NOTHING HERE COMPUTES AN INDICATOR ──
 *
 *  A1, B1, C1 and IMP-0 are percentages read from `v_indicator_progress`. This
 *  file writes answers; it must never derive a rate from them, because a
 *  percentage computed in two places will eventually disagree in one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type FollowupRound = 'six_month' | 'twelve_month' | 'annual'
export type ContactMode = 'telephone' | 'site_visit' | 'municipal_office'
export type Respondent = 'participant' | 'household_member' | 'not_reached'

export const followupKeys = {
  all: ['followups'] as const,
  list: () => ['followups', 'list'] as const,
  one: (id: string) => ['followups', 'one', id] as const,
  prefill: (nid: string) => ['followups', 'prefill', nid] as const,
}

/* ── prefill: Q5, Q6, Q30 ─────────────────────────────────────────────────── */

/**
 * What the Municipality already knows about this person.
 *
 * `support.referral` is `null`, never false, and the screen must show it as
 * "not recorded anywhere" rather than as an unticked box. No table records
 * referrals (OQ-10), so false would be a claim we had looked and found none.
 */
export type FollowupPrefill =
  | { found: false; reason: 'bad_national_id' | 'person_not_found' }
  | {
      found: true
      full_name: string
      village: string | null
      support: {
        training: boolean
        guidance: boolean
        production: boolean
        exhibition: boolean
        office: boolean
        /** null means unknown, not "no" — see OQ-10. */
        referral: boolean | null
      }
      trainings: { title: string; on: string; completed: boolean | null }[]
      events_attended: number
    }

/**
 * Staff-gated, not identity-gated.
 *
 * The public lookups demand a national ID plus a date of birth to stop an
 * anonymous endpoint answering "is this ID registered?". An enumerator can
 * already read `person`, so that check protects nothing here and would block
 * the interview: they are standing in a field and do not have the farmer's date
 * of birth. `followup_prefill_for_staff` (0074) gates on the role instead. The
 * older `followup_prefill` stays revoked from everyone.
 */
export function useFollowupPrefill(nid: string) {
  return useQuery({
    queryKey: followupKeys.prefill(normaliseNationalId(nid)),
    enabled: /^\d{9}$/.test(normaliseNationalId(nid)),
    staleTime: 60_000,
    queryFn: async (): Promise<FollowupPrefill> => {
      const { data, error } = await supabase.rpc('followup_prefill_for_staff', {
        p_national_id: normaliseNationalId(nid),
      })
      if (error) throw toAppError(error)
      return data as FollowupPrefill
    },
  })
}

/* ── section 0: start or resume ───────────────────────────────────────────── */

/** Every outcome `start_followup` can return. No default branch consumes this. */
export type StartOutcome =
  /** A new draft was created. */
  | 'started'
  /**
   * A draft for this person and round already existed and is being continued.
   * Not an error: it is what makes a dropped connection survivable, and it is
   * also what the same attempt resent returns.
   */
  | 'resumed'
  /**
   * A FINISHED survey already exists for this person and round. The payload
   * names the round, its status and its contact date, because an enumerator
   * standing in front of someone needs to know which one it is.
   */
  | 'already_exists'
  | 'person_not_found'
  | 'bad_national_id'
  | 'enumerator_required'
  /** The same client_uuid belongs to a survey the Municipality withdrew. */
  | 'withdrawn'

export type StartResult = {
  ok: boolean
  result: StartOutcome
  survey_id?: string
  status?: string
  round?: string
  contact_date?: string
}

export type StartInput = {
  nationalId: string
  round: FollowupRound
  contactDate: string
  contactMode: ContactMode
  enumeratorName: string
  respondent: Respondent
  /** One per attempt, reused across retries. Globally unique in the database. */
  clientUuid: string
}

export function useStartFollowup() {
  return useMutation({
    // Never automatic: a refusal is an answer, and a retry that created a
    // second survey would be the one thing (person_id, round) exists to stop.
    retry: false,
    mutationFn: async (input: StartInput): Promise<StartResult> => {
      const { data, error } = await supabase.rpc('start_followup', {
        p_national_id: normaliseNationalId(input.nationalId),
        p_round: input.round,
        p_contact_date: input.contactDate,
        p_contact_mode: input.contactMode,
        p_enumerator_name: input.enumeratorName.trim(),
        p_respondent: input.respondent,
        p_client_uuid: input.clientUuid,
      })
      if (error) throw toAppError(error)
      return data as StartResult
    },
  })
}

/* ── the list ─────────────────────────────────────────────────────────────── */

export type FollowupRow = {
  id: string
  personName: string
  nationalId: string
  round: FollowupRound
  contactDate: string
  status: string
  enumeratorName: string | null
}

type FollowupSelect = {
  id: string
  round: FollowupRound
  contact_date: string
  status: string
  enumerator_name: string | null
  person: { full_name: string; national_id: string }
}

/**
 * `deleted_at is null` on both the survey and its person, matching the cascade
 * the four indicator views apply.
 */
export function useFollowups() {
  return useQuery({
    queryKey: followupKeys.list(),
    queryFn: async (): Promise<FollowupRow[]> => {
      const res = await supabase
        .from('followup_survey')
        .select(
          'id, round, contact_date, status, enumerator_name, person!inner ( full_name, national_id )',
        )
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .order('contact_date', { ascending: false })
      return unwrapList(
        res as unknown as { data: FollowupSelect[] | null; error: unknown },
      ).map((r) => ({
        id: r.id,
        personName: r.person.full_name,
        nationalId: r.person.national_id,
        round: r.round,
        contactDate: r.contact_date,
        status: r.status,
        enumeratorName: r.enumerator_name,
      }))
    },
  })
}

/* ── one survey, with the answers already given ───────────────────────────── */

export type SurveyDetail = {
  id: string
  personName: string
  nationalId: string
  round: FollowupRound
  contactDate: string
  status: string
  /** followup_survey's own answer columns. */
  q08: string | null
  q14: string | null
  q16: string | null
  q17: string | null
  q18: string | null
  q22: string | null
  q26Total: number | null
  q26Women: number | null
  q26Under30: number | null
  q29: string | null
  /** Q30 as stored. Prefilled from count_markets_attended, overridable. */
  q30: number | null
  /**
   * Whether the stored Q30 differs from what the records counted.
   *
   * Decided by `save_followup_section_c`, never by this client -- 0086 and 0088
   * exist so that one rule counts and one place compares. The screen reads this
   * to show both figures; it must not recompute it.
   */
  q30Overridden: boolean
  q31: string | null
  q34: string | null
  /** followup_answer, keyed by question code. */
  answers: Record<string, { text: string | null; number: number | null; bool: boolean | null }>
  /** followup_answer_option, option ids per question code. */
  options: Record<string, string[]>
  /**
   * The "Other" specification per question code, taken from whichever option
   * row carries it. Each list has at most one, so one string per question is
   * the whole of it -- see 0082.
   */
  optionOther: Record<string, string>
  /** Q23, tri-state per ref_safety_item id. An absent key is unanswered. */
  safety: Record<string, TriStatus>
  /** Q35, up to three, already ordered by seq. */
  buyers: BuyerConnection[]
}

/**
 * One buyer from Q35.
 *
 * Every field is required in the database, so there is no partial buyer here
 * either: a row with a name and nothing else would still be counted as a
 * connection, which is why 0088 writes a buyer whole or not at all.
 */
export type BuyerConnection = {
  seq: number
  buyerName: string
  buyerTypeId: string
  buyerTypeOther: string | null
  howConnected: string
  howConnectedOther: string | null
  arrangement: string
  stillActive: string
}

/**
 * Everything a section needs to reopen with what was already answered.
 *
 * Five reads rather than one: the survey, its answers, its options, its safety
 * items and its buyer connections are five tables and PostgREST embeds would
 * not make them one round trip anyway. They are separate queries so a slow one
 * cannot block the section rendering.
 */
export function useSurveyDetail(id: string | undefined) {
  return useQuery({
    queryKey: followupKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<SurveyDetail> => {
      const s = await supabase
        .from('followup_survey')
        .select(
          'id, round, contact_date, status, q08_applied_knowledge, q14_used_office,' +
            ' q16_advice_useful, q17_activity_status, q18_started_after_support,' +
            ' q22_volume_change, q26_workers_total, q26_workers_women, q26_workers_under30,' +
            ' q29_selling_change, q30_events_attended, q30_is_overridden,' +
            ' q31_last_event_sales_band, q34_connection_made,' +
            ' person!inner ( full_name, national_id )',
        )
        .eq('id', id!)
        .is('deleted_at', null)
        .single()
      if (s.error) throw toAppError(s.error)
      const row = s.data as unknown as {
        id: string
        round: FollowupRound
        contact_date: string
        status: string
        q08_applied_knowledge: string | null
        q14_used_office: string | null
        q16_advice_useful: string | null
        q17_activity_status: string | null
        q18_started_after_support: string | null
        q22_volume_change: string | null
        q26_workers_total: number | null
        q26_workers_women: number | null
        q26_workers_under30: number | null
        q29_selling_change: string | null
        q30_events_attended: number | null
        q30_is_overridden: boolean | null
        q31_last_event_sales_band: string | null
        q34_connection_made: string | null
        person: { full_name: string; national_id: string }
      }

      const a = await supabase
        .from('followup_answer')
        .select('question_code, value_text, value_number, value_boolean')
        .eq('survey_id', id!)
      if (a.error) throw toAppError(a.error)

      const o = await supabase
        .from('followup_answer_option')
        .select('question_code, option_id, option_other')
        .eq('survey_id', id!)
      if (o.error) throw toAppError(o.error)

      const si = await supabase
        .from('followup_safety_item')
        .select('item_id, status')
        .eq('survey_id', id!)
      if (si.error) throw toAppError(si.error)

      // Ordered by seq because the screen shows them as buyer 1, 2, 3 and the
      // numbering has to survive a reload. 0088 reassigns seq from the order it
      // is given, so the order here is the order the enumerator last saw.
      const bc = await supabase
        .from('followup_buyer_connection')
        // One string literal, deliberately: `'a' + 'b'` widens to `string` and
        // PostgREST then cannot check the column names against the generated
        // schema, so a typo would come back as null at runtime instead of
        // failing to compile.
        .select(
          'seq, buyer_name, buyer_type_id, buyer_type_other, how_connected, how_connected_other, arrangement, still_active',
        )
        .eq('survey_id', id!)
        .order('seq')
      if (bc.error) throw toAppError(bc.error)

      const answers: SurveyDetail['answers'] = {}
      for (const r of (a.data ?? []) as {
        question_code: string
        value_text: string | null
        value_number: number | null
        value_boolean: boolean | null
      }[]) {
        answers[r.question_code] = {
          text: r.value_text,
          number: r.value_number,
          bool: r.value_boolean,
        }
      }

      const options: SurveyDetail['options'] = {}
      const optionOther: SurveyDetail['optionOther'] = {}
      for (const r of (o.data ?? []) as {
        question_code: string
        option_id: string
        option_other: string | null
      }[]) {
        ;(options[r.question_code] ??= []).push(r.option_id)
        if (r.option_other) optionOther[r.question_code] = r.option_other
      }

      const safety: SurveyDetail['safety'] = {}
      for (const r of (si.data ?? []) as { item_id: string; status: TriStatus }[]) {
        safety[r.item_id] = r.status
      }

      const buyers: BuyerConnection[] = (
        (bc.data ?? []) as {
          seq: number
          buyer_name: string
          buyer_type_id: string
          buyer_type_other: string | null
          how_connected: string
          how_connected_other: string | null
          arrangement: string
          still_active: string
        }[]
      ).map((r) => ({
        seq: r.seq,
        buyerName: r.buyer_name,
        buyerTypeId: r.buyer_type_id,
        buyerTypeOther: r.buyer_type_other,
        howConnected: r.how_connected,
        howConnectedOther: r.how_connected_other,
        arrangement: r.arrangement,
        stillActive: r.still_active,
      }))

      return {
        id: row.id,
        personName: row.person.full_name,
        nationalId: row.person.national_id,
        round: row.round,
        contactDate: row.contact_date,
        status: row.status,
        q08: row.q08_applied_knowledge,
        q14: row.q14_used_office,
        q16: row.q16_advice_useful,
        q17: row.q17_activity_status,
        q18: row.q18_started_after_support,
        q22: row.q22_volume_change,
        q26Total: row.q26_workers_total,
        q26Women: row.q26_workers_women,
        q26Under30: row.q26_workers_under30,
        q29: row.q29_selling_change,
        q30: row.q30_events_attended,
        // The column is nullable and false is the honest reading of "never
        // saved": nothing has been compared yet, so nothing disagrees.
        q30Overridden: row.q30_is_overridden ?? false,
        q31: row.q31_last_event_sales_band,
        q34: row.q34_connection_made,
        answers,
        options,
        optionOther,
        safety,
        buyers,
      }
    },
  })
}

/* ── section A ────────────────────────────────────────────────────────────── */

export type SectionAInput = {
  surveyId: string
  q7?: string
  q8?: string
  q9Options?: string[]
  q9Other?: string
  q10?: string
  q11Options?: string[]
  q11Other?: string
  q12?: string
  q13?: string
  q14?: string
  q15Count?: number | null
  q15Options?: string[]
  q15Other?: string
  q16?: string
}

export type SectionAResult = {
  ok: boolean
  result: 'saved' | 'not_found' | 'not_permitted'
  survey_id?: string
}

/**
 * One RPC, one transaction. Section A touches three tables, and a connection
 * dropping part-way through eight browser round trips would leave the section
 * half-written -- which is what the draft design exists to prevent. See 0079.
 *
 * The conditional branches are cleared server-side, not here: an enumerator who
 * ticks reasons under Q9 and then corrects Q8 must not leave those reasons
 * attached to a survey that says the knowledge was applied.
 */
export function useSaveSectionA() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: SectionAInput): Promise<SectionAResult> => {
      const { data, error } = await supabase.rpc('save_followup_section_a', {
        p_survey_id: input.surveyId,
        ...(input.q7 ? { p_q7: input.q7 } : {}),
        ...(input.q8 ? { p_q8: input.q8 } : {}),
        ...(input.q9Options?.length ? { p_q9_options: input.q9Options } : {}),
        ...(input.q9Other ? { p_q9_other: input.q9Other } : {}),
        ...(input.q10 ? { p_q10: input.q10 } : {}),
        ...(input.q11Options?.length ? { p_q11_options: input.q11Options } : {}),
        ...(input.q11Other ? { p_q11_other: input.q11Other } : {}),
        ...(input.q12 ? { p_q12: input.q12 } : {}),
        ...(input.q13 ? { p_q13: input.q13 } : {}),
        ...(input.q14 ? { p_q14: input.q14 } : {}),
        ...(input.q15Count != null ? { p_q15_count: input.q15Count } : {}),
        ...(input.q15Options?.length ? { p_q15_options: input.q15Options } : {}),
        ...(input.q15Other ? { p_q15_other: input.q15Other } : {}),
        ...(input.q16 ? { p_q16: input.q16 } : {}),
      })
      if (error) throw toAppError(error)
      return data as SectionAResult
    },
    onSuccess: (res, input) => {
      if (res.result === 'saved') {
        void qc.invalidateQueries({ queryKey: followupKeys.one(input.surveyId) })
        void qc.invalidateQueries({ queryKey: followupKeys.list() })
        // The survey is still a draft, so no indicator has moved -- but the
        // dashboard is cheap to refresh and a stale figure here would be read
        // as this section having done something.
        void qc.invalidateQueries({ queryKey: ['indicators'] })
      }
    },
  })
}

/* ── section B ────────────────────────────────────────────────────────────── */

export type SectionBInput = {
  surveyId: string
  q17?: string
  q18?: string
  q19When?: string
  q19Options?: string[]
  q19Other?: string
  q20Options?: string[]
  q20Other?: string
  q21Options?: string[]
  q21FreeText?: string
  q22?: string
  /** One entry per ANSWERED item. An unanswered item is absent, not defaulted. */
  q23?: { item_id: string; status: TriStatus }[]
  q24Options?: string[]
  q24Other?: string
  q25?: string
  q26Total?: number | null
  q26Women?: number | null
  q26Under30?: number | null
}

export type SectionBResult = {
  ok: boolean
  result: 'saved' | 'not_found' | 'not_permitted' | 'invalid'
  survey_id?: string
  /** On 'invalid', the constraint that refused -- see 0084. */
  constraint?: string
}

/**
 * One RPC, one transaction, across four tables.
 *
 * Q17 is C1's numerator and denominator both, so this is the section that moves
 * a donor figure. It moves nothing while the survey is a draft: 0072 made the
 * four survey-fed views require submitted or approved.
 *
 * The conditional branches (Q19 when the activity is not stopped, Q24 when the
 * checklist has nothing undone) are cleared server-side in the same
 * transaction, and the clear is read back -- a delete RLS refuses reports
 * success, which is what 0080 was written for.
 */
export function useSaveSectionB() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: SectionBInput): Promise<SectionBResult> => {
      const { data, error } = await supabase.rpc('save_followup_section_b', {
        p_survey_id: input.surveyId,
        ...(input.q17 ? { p_q17: input.q17 } : {}),
        ...(input.q18 ? { p_q18: input.q18 } : {}),
        ...(input.q19When ? { p_q19_when: input.q19When } : {}),
        ...(input.q19Options?.length ? { p_q19_options: input.q19Options } : {}),
        ...(input.q19Other ? { p_q19_other: input.q19Other } : {}),
        ...(input.q20Options?.length ? { p_q20_options: input.q20Options } : {}),
        ...(input.q20Other ? { p_q20_other: input.q20Other } : {}),
        ...(input.q21Options?.length ? { p_q21_options: input.q21Options } : {}),
        ...(input.q21FreeText ? { p_q21_free_text: input.q21FreeText } : {}),
        ...(input.q22 ? { p_q22: input.q22 } : {}),
        ...(input.q23?.length ? { p_q23: input.q23 } : {}),
        ...(input.q24Options?.length ? { p_q24_options: input.q24Options } : {}),
        ...(input.q24Other ? { p_q24_other: input.q24Other } : {}),
        ...(input.q25 ? { p_q25: input.q25 } : {}),
        ...(input.q26Total != null ? { p_q26_total: input.q26Total } : {}),
        ...(input.q26Women != null ? { p_q26_women: input.q26Women } : {}),
        ...(input.q26Under30 != null ? { p_q26_under30: input.q26Under30 } : {}),
      })
      if (error) throw toAppError(error)
      return data as SectionBResult
    },
    onSuccess: (res, input) => {
      if (res.result === 'saved') {
        void qc.invalidateQueries({ queryKey: followupKeys.one(input.surveyId) })
        void qc.invalidateQueries({ queryKey: followupKeys.list() })
        // Still a draft, so C1 has not moved -- but a stale figure on the
        // dashboard would be read as this section having done something.
        void qc.invalidateQueries({ queryKey: ['indicators'] })
      }
    },
  })
}

/* ── section C ────────────────────────────────────────────────────────────── */

/**
 * One buyer as it goes to the server.
 *
 * Snake-cased because 0088 reads these keys straight out of the jsonb with
 * `e ->> 'buyer_name'`. Renaming here would not be caught by the compiler --
 * a missing key arrives as NULL and the row is refused by a not-null violation
 * at the far end, which is a save that fails for a reason nothing on screen
 * explains.
 */
export type BuyerInput = {
  buyer_name: string
  buyer_type_id: string
  buyer_type_other?: string
  how_connected: string
  how_connected_other?: string
  arrangement: string
  still_active: string
}

export type SectionCInput = {
  surveyId: string
  q27Options?: string[]
  q27Other?: string
  q28Options?: string[]
  q28Other?: string
  q29?: string
  /**
   * What the enumerator has in the box.
   *
   * Sent even when it equals the prefill. `q30_is_overridden` is decided by
   * comparing it against a freshly counted figure inside the transaction, so
   * "the same number" is a real answer the server needs, not a no-op -- see
   * 0088. Omitting it would store the count as if it had never been reviewed.
   */
  q30?: number | null
  q31?: string
  q32?: string
  q33Options?: string[]
  q33Other?: string
  q34?: string
  /** Up to three, whole. An incomplete buyer is not sent at all. */
  q35?: BuyerInput[]
  q36Options?: string[]
  q36Other?: string
}

export type SectionCResult = {
  ok: boolean
  result:
    | 'saved'
    | 'not_found'
    | 'not_permitted'
    | 'invalid'
    /** A Q28 channel that is not also in Q27. The screen should make this unreachable. */
    | 'q28_not_in_q27'
    /** A buyer row the database refused. */
    | 'buyer_invalid'
  survey_id?: string
  /** On 'invalid' or 'buyer_invalid', the constraint that refused. */
  constraint?: string
  /** On 'q28_not_in_q27', how many channels were not in Q27. */
  count?: number
  /**
   * What the records counted for Q30 at save time.
   *
   * Returned so the screen can show the derived figure beside the enumerator's
   * number without asking a second question of the database, and so the number
   * displayed after a save is the one the flag was actually decided against.
   */
  markets_counted?: number
}

/**
 * One RPC, one transaction, across four tables.
 *
 * ── NOTHING IN SECTION C IS AN INDICATOR ──
 *
 * A1, C1 and IMP-0 read Q08, Q17 and Q37. Section C feeds none of them. Q30 is
 * adjacent to E0.2 without being it: E0.2 counts distinct *people* with an
 * approved registration, and Q30 counts distinct *markets* for one person. They
 * share the rule for what counts as participating -- approved, live market,
 * live registration -- which is the whole reason 0086 put that rule in one
 * function. The unit of count is different and this file must not blur them.
 *
 * ── THE TWO REFUSALS THE SCREEN SHOULD NEVER PROVOKE ──
 *
 * `q28_not_in_q27` and `buyer_invalid` are reachable from a stale tab, not from
 * ordinary use: the screen offers Q28 only the channels Q27 has, and sends a
 * buyer only when it is complete. They are still handled, because the client is
 * not the guard -- it is the thing that keeps the guard from firing mid-interview.
 */
export function useSaveSectionC() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: SectionCInput): Promise<SectionCResult> => {
      const { data, error } = await supabase.rpc('save_followup_section_c', {
        p_survey_id: input.surveyId,
        ...(input.q27Options?.length ? { p_q27_options: input.q27Options } : {}),
        ...(input.q27Other ? { p_q27_other: input.q27Other } : {}),
        ...(input.q28Options?.length ? { p_q28_options: input.q28Options } : {}),
        ...(input.q28Other ? { p_q28_other: input.q28Other } : {}),
        ...(input.q29 ? { p_q29: input.q29 } : {}),
        ...(input.q30 != null ? { p_q30: input.q30 } : {}),
        ...(input.q31 ? { p_q31: input.q31 } : {}),
        ...(input.q32 ? { p_q32: input.q32 } : {}),
        ...(input.q33Options?.length ? { p_q33_options: input.q33Options } : {}),
        ...(input.q33Other ? { p_q33_other: input.q33Other } : {}),
        ...(input.q34 ? { p_q34: input.q34 } : {}),
        // Sent whenever Q34 says a connection was made, including as an empty
        // array: that is how "the connection exists but no buyer was named yet"
        // reaches the server, and it is not the same as omitting the argument.
        ...(input.q35 ? { p_q35: input.q35 } : {}),
        ...(input.q36Options?.length ? { p_q36_options: input.q36Options } : {}),
        ...(input.q36Other ? { p_q36_other: input.q36Other } : {}),
      })
      if (error) throw toAppError(error)
      return data as SectionCResult
    },
    onSuccess: (res, input) => {
      if (res.result === 'saved') {
        void qc.invalidateQueries({ queryKey: followupKeys.one(input.surveyId) })
        void qc.invalidateQueries({ queryKey: followupKeys.list() })
        // Still a draft, so nothing has moved -- but a stale dashboard figure
        // would be read as this section having done something.
        void qc.invalidateQueries({ queryKey: ['indicators'] })
      }
    },
  })
}
