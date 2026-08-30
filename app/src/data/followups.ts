import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import { normaliseNationalId } from './apply'

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
  /** followup_answer, keyed by question code. */
  answers: Record<string, { text: string | null; number: number | null; bool: boolean | null }>
  /** followup_answer_option, option ids per question code. */
  options: Record<string, string[]>
}

/**
 * Everything section A needs to reopen with what was already answered.
 *
 * Three reads rather than one: the survey, its answers and its options are
 * three tables and PostgREST embeds would not make them one round trip anyway.
 * They are separate queries so a slow one cannot block the section rendering.
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
            ' q16_advice_useful, person!inner ( full_name, national_id )',
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
        person: { full_name: string; national_id: string }
      }

      const a = await supabase
        .from('followup_answer')
        .select('question_code, value_text, value_number, value_boolean')
        .eq('survey_id', id!)
      if (a.error) throw toAppError(a.error)

      const o = await supabase
        .from('followup_answer_option')
        .select('question_code, option_id')
        .eq('survey_id', id!)
      if (o.error) throw toAppError(o.error)

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
      for (const r of (o.data ?? []) as { question_code: string; option_id: string }[]) {
        ;(options[r.question_code] ??= []).push(r.option_id)
      }

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
        answers,
        options,
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
  q10?: string
  q11Options?: string[]
  q12?: string
  q13?: string
  q14?: string
  q15Count?: number | null
  q15Options?: string[]
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
        ...(input.q10 ? { p_q10: input.q10 } : {}),
        ...(input.q11Options?.length ? { p_q11_options: input.q11Options } : {}),
        ...(input.q12 ? { p_q12: input.q12 } : {}),
        ...(input.q13 ? { p_q13: input.q13 } : {}),
        ...(input.q14 ? { p_q14: input.q14 } : {}),
        ...(input.q15Count != null ? { p_q15_count: input.q15Count } : {}),
        ...(input.q15Options?.length ? { p_q15_options: input.q15Options } : {}),
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
