import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The indicators with no data-collection form behind them.
 *
 *  ── THESE ARE RECORDS, NOT TYPED TOTALS ──
 *
 *  Every one of these indicators COUNTS ROWS. There is no override column
 *  anywhere in the schema, and there should not be: `v_ind_f0_1` counts
 *  promotional_action rows, `v_ind_g0_2` counts coordination_meeting rows.
 *  Typing "5" would mean either inventing five rows or storing a number that
 *  no view reads.
 *
 *  It also throws away what the donor return actually asks for. "Five
 *  promotional actions" is not reportable; five titled actions with dates and
 *  channels is. So each of these is a short record log, not a number field.
 *
 *  ── WHAT IS DELIBERATELY NOT HERE, AND WHY ──
 *
 *  B1.2  office_service     counts DISTINCT PEOPLE
 *  D0.1  guidance_record    counts DISTINCT PEOPLE
 *  C1.3  mentorship_session counts ROWS, but each row needs a parent
 *  G0.4  partner_contribution  counts DISTINCT PARTNERS, and each row needs a
 *                              parent partnership
 *
 *  For B1.2 and D0.1 a number field is a way to get the figure wrong and never
 *  find out: enter 20 twice and the indicator reads 40 for what may be the same
 *  20 people. Distinct-person counting is the single most common way these
 *  numbers go wrong (CLAUDE.md rule 4), and a typed total cannot be
 *  de-duplicated afterwards because the identities were never captured.
 *
 *  C1.3 IS NOT ONE OF THOSE, and this comment used to say it was -- "per
 *  initiative, so per-person". `v_ind_c1_3` is `count(ms.id)`: it counts
 *  SESSIONS. The join through production_initiative to person exists to apply
 *  the soft-delete cascade, not to de-duplicate. Two mentorship sessions with
 *  the same producer are two, correctly.
 *
 *  The conclusion is unchanged -- it does not belong here -- but for a
 *  different reason: initiative_id is NOT NULL, so there is a parent to pick
 *  before any field on the form means anything, and the parent has a screen of
 *  its own. Same for G0.4 and its partnership. A record that hangs off
 *  something belongs on the thing it hangs off.
 *
 *  D0.2 is also absent, for a different reason: it counts delivered
 *  training_session rows with a food-processing topic, and the sessions screen
 *  already sets `is_delivered`. A second way to move one indicator is how two
 *  numbers start disagreeing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const manualKeys = {
  all: ['manual'] as const,
  milestones: () => [...manualKeys.all, 'milestones'] as const,
  promotional: () => [...manualKeys.all, 'promotional'] as const,
  meetings: () => [...manualKeys.all, 'meetings'] as const,
  caseStudies: () => [...manualKeys.all, 'case-studies'] as const,
  channels: () => [...manualKeys.all, 'channels'] as const,
}

function invalidateIndicators(qc: ReturnType<typeof useQueryClient>) {
  // Anything entered here moves an indicator, so the dashboard is stale.
  void qc.invalidateQueries({ queryKey: ['indicators'] })
  void qc.invalidateQueries({ queryKey: ['overview'] })
}

/* ── milestones: B1.1 and G0.1 ────────────────────────────────────────────── */

/**
 * The only two that really are a toggle.
 *
 * `v_ind_b1_1` and `v_ind_g0_1` count a milestone row with the matching code,
 * `is_achieved`, and `achieved_on` inside the period. So the date is not
 * decoration -- it decides WHICH QUARTER the milestone lands in. Achieved in
 * March and recorded in July still belongs to March.
 */
export type Milestone = {
  id: string
  code: string
  name: string
  is_achieved: boolean
  achieved_on: string | null
}

export const MILESTONE_CODES = ['B1.1', 'G0.1'] as const

export function useMilestones() {
  return useQuery({
    queryKey: manualKeys.milestones(),
    queryFn: async (): Promise<Milestone[]> => {
      const res = await supabase
        .from('milestone')
        .select('id, code, name, is_achieved, achieved_on')
        .in('code', [...MILESTONE_CODES])
        .is('deleted_at', null)
      return unwrapList(res as unknown as { data: Milestone[] | null; error: unknown })
    },
  })
}

export function useSetMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['manual', 'set-milestone'],
    mutationFn: async (v: { id: string; achieved: boolean; achievedOn: string | null }) => {
      // `achieved_needs_date` refuses is_achieved without a date, so clearing
      // the flag must clear the date in the same statement.
      const res = await supabase
        .from('milestone')
        .update(
          v.achieved
            ? { is_achieved: true, achieved_on: v.achievedOn }
            : { is_achieved: false, achieved_on: null },
        )
        .eq('id', v.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    /**
     * ── THE MILESTONE LIST ITSELF, NOT JUST THE DASHBOARD ──
     *
     * This read `onSuccess: () => invalidateIndicators(qc)`, which invalidates
     * `['indicators']` and `['overview']` and NOT `['manual','milestones']` --
     * the query the screen you are standing on is rendering.
     *
     * So marking B1.1 achieved wrote `is_achieved = true` and `achieved_on`,
     * moved the indicator, and left the button still reading "Mark achieved".
     * Verified in the database while the screen still denied it. The
     * coordinator's only signal that it worked was to reload the page.
     *
     * This is the "delete that looks like success" family with the signs
     * reversed: the write happened and the screen said it had not, which
     * invites the same click again. Both neighbours in this file --
     * useCreateManualRecord and useWithdrawManualRecord -- invalidate their own
     * list correctly, which is exactly why this one went unnoticed.
     */
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manualKeys.milestones() })
      invalidateIndicators(qc)
    },
  })
}

/* ── F0.1 promotional actions ─────────────────────────────────────────────── */

export type PromotionalAction = {
  id: string
  title: string
  action_date: string
  channel_id: string
  reach_estimate: number | null
  description: string | null
}

export function usePromotionalActions() {
  return useQuery({
    queryKey: manualKeys.promotional(),
    queryFn: async (): Promise<PromotionalAction[]> => {
      const res = await supabase
        .from('promotional_action')
        .select('id, title, action_date, channel_id, reach_estimate, description')
        .is('deleted_at', null)
        .order('action_date', { ascending: false })
      return unwrapList(res as unknown as { data: PromotionalAction[] | null; error: unknown })
    },
  })
}

export function usePromotionalChannels() {
  return useQuery({
    queryKey: manualKeys.channels(),
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<{ id: string; label_en: string; label_ar: string }[]> => {
      const res = await supabase
        .from('ref_promotional_channel')
        .select('id, label_en, label_ar')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
      return unwrapList(
        res as unknown as {
          data: { id: string; label_en: string; label_ar: string }[] | null
          error: unknown
        },
      )
    },
  })
}

/* ── G0.2 coordination meetings ───────────────────────────────────────────── */

export type CoordinationMeeting = {
  id: string
  meeting_date: string
  subject: string
  minutes_ref: string | null
  /** Partners present, by partnership -- what G0.2 disaggregates by and G0.4 credits. */
  partners: { partnership_id: string | null; external_name: string | null; partner_name: string | null }[]
}

type MeetingSelect = {
  id: string
  meeting_date: string
  subject: string
  minutes_ref: string | null
  coordination_meeting_partner: {
    partnership_id: string | null
    external_name: string | null
    partnership: { partner: { name: string } | null } | null
  }[] | null
}

export function useCoordinationMeetings() {
  return useQuery({
    queryKey: manualKeys.meetings(),
    queryFn: async (): Promise<CoordinationMeeting[]> => {
      const res = await supabase
        .from('coordination_meeting')
        .select(
          'id, meeting_date, subject, minutes_ref, ' +
            'coordination_meeting_partner!coordination_meeting_partner_meeting_id_fkey ( partnership_id, external_name, ' +
            'partnership!coordination_meeting_partner_partnership_id_fkey ( partner!partnership_partner_id_fkey ( name ) ) )',
        )
        .is('deleted_at', null)
        .order('meeting_date', { ascending: false })
      return unwrapList(res as unknown as { data: MeetingSelect[] | null; error: unknown }).map((m) => ({
        id: m.id,
        meeting_date: m.meeting_date,
        subject: m.subject,
        minutes_ref: m.minutes_ref,
        partners: (m.coordination_meeting_partner ?? []).map((p) => ({
          partnership_id: p.partnership_id,
          external_name: p.external_name,
          partner_name: p.partnership?.partner?.name ?? null,
        })),
      }))
    },
  })
}

/* ── G0.3 case studies ────────────────────────────────────────────────────── */

export type CaseStudy = {
  id: string
  title: string
  documented_on: string
  summary: string
  change_evidenced: string
  person_id: string | null
  initiative_id: string | null
}

export function useCaseStudies() {
  return useQuery({
    queryKey: manualKeys.caseStudies(),
    queryFn: async (): Promise<CaseStudy[]> => {
      const res = await supabase
        .from('case_study')
        .select('id, title, documented_on, summary, change_evidenced, person_id, initiative_id')
        .is('deleted_at', null)
        .order('documented_on', { ascending: false })
      return unwrapList(res as unknown as { data: CaseStudy[] | null; error: unknown })
    },
  })
}

/* ── creating and withdrawing ─────────────────────────────────────────────── */

/**
 * The fields 04_DATA_DICTIONARY.md section 8 names for each of the three
 * record tables. Until 16 September 2026 the forms asked for the first two or
 * three of each and left the rest -- reach and description, the minutes
 * reference and the partners present, the person or initiative a case study
 * is about -- with no control anywhere. The partners present are the only
 * write path `coordination_meeting_partner` has, which is what
 * `contribution_from_meeting` credits G0.4 from and G0.2 disaggregates by.
 */
type NewRecord =
  | {
      kind: 'promotional'
      title: string
      date: string
      channelId: string
      reach: number | null
      description: string | null
    }
  | { kind: 'meeting'; date: string; subject: string; minutesRef: string | null; partnershipIds: string[] }
  | {
      kind: 'caseStudy'
      title: string
      date: string
      summary: string
      change: string
      personId: string | null
      initiativeId: string | null
    }

export function useCreateManualRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['manual', 'create'],
    mutationFn: async (rec: NewRecord) => {
      if (rec.kind === 'promotional') {
        const res = await supabase
          .from('promotional_action')
          .insert({
            title: rec.title.trim(),
            action_date: rec.date,
            channel_id: rec.channelId,
            ...(rec.reach === null ? {} : { reach_estimate: rec.reach }),
            description: rec.description?.trim() || null,
          })
          .select('id')
          .single()
        if (res.error) throw toAppError(res.error)
        return res.data
      }
      if (rec.kind === 'meeting') {
        const res = await supabase
          .from('coordination_meeting')
          .insert({ meeting_date: rec.date, subject: rec.subject.trim(), minutes_ref: rec.minutesRef?.trim() || null })
          .select('id')
          .single()
        if (res.error) throw toAppError(res.error)
        if (rec.partnershipIds.length > 0) {
          // One row per partner present. The trigger on this table writes the
          // partner's G0.4 contribution; nothing else needs doing here.
          const ins = await supabase
            .from('coordination_meeting_partner')
            .insert(rec.partnershipIds.map((partnershipId) => ({ meeting_id: res.data.id, partnership_id: partnershipId })))
          if (ins.error) throw toAppError(ins.error)
        }
        return res.data
      }
      const res = await supabase
        .from('case_study')
        .insert({
          title: rec.title.trim(),
          documented_on: rec.date,
          summary: rec.summary.trim(),
          change_evidenced: rec.change.trim(),
          person_id: rec.personId,
          initiative_id: rec.initiativeId,
        })
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, rec) => {
      void qc.invalidateQueries({
        queryKey:
          rec.kind === 'promotional'
            ? manualKeys.promotional()
            : rec.kind === 'meeting'
              ? manualKeys.meetings()
              : manualKeys.caseStudies(),
      })
      // A meeting with partners present credits G0.4 through its trigger.
      if (rec.kind === 'meeting') void qc.invalidateQueries({ queryKey: ['contributions'] })
      invalidateIndicators(qc)
    },
  })
}

/** Soft delete, per CLAUDE.md rule 2. Removing a row moves the indicator down. */
export function useWithdrawManualRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['manual', 'withdraw'],
    mutationFn: async (v: {
      table: 'promotional_action' | 'coordination_meeting' | 'case_study'
      id: string
    }) => {
      const res = await supabase
        .from(v.table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', v.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manualKeys.all })
      invalidateIndicators(qc)
    },
  })
}
