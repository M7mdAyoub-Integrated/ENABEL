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
 *  C1.3  mentorship_session initiative_id is NOT NULL -> production_initiative
 *                           -> person. Per-initiative, so per-person.
 *
 *  A number field for any of these is a way to get the figure wrong and never
 *  find out: enter 20 twice and the indicator reads 40 for what may be the same
 *  20 people. Distinct-person counting is the single most common way these
 *  numbers go wrong (CLAUDE.md rule 4), and a typed total cannot be
 *  de-duplicated afterwards because the identities were never captured.
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
    onSuccess: () => invalidateIndicators(qc),
  })
}

/* ── F0.1 promotional actions ─────────────────────────────────────────────── */

export type PromotionalAction = {
  id: string
  title: string
  action_date: string
  channel_id: string
  reach_estimate: number | null
}

export function usePromotionalActions() {
  return useQuery({
    queryKey: manualKeys.promotional(),
    queryFn: async (): Promise<PromotionalAction[]> => {
      const res = await supabase
        .from('promotional_action')
        .select('id, title, action_date, channel_id, reach_estimate')
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
}

export function useCoordinationMeetings() {
  return useQuery({
    queryKey: manualKeys.meetings(),
    queryFn: async (): Promise<CoordinationMeeting[]> => {
      const res = await supabase
        .from('coordination_meeting')
        .select('id, meeting_date, subject')
        .is('deleted_at', null)
        .order('meeting_date', { ascending: false })
      return unwrapList(res as unknown as { data: CoordinationMeeting[] | null; error: unknown })
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
}

export function useCaseStudies() {
  return useQuery({
    queryKey: manualKeys.caseStudies(),
    queryFn: async (): Promise<CaseStudy[]> => {
      const res = await supabase
        .from('case_study')
        .select('id, title, documented_on, summary, change_evidenced')
        .is('deleted_at', null)
        .order('documented_on', { ascending: false })
      return unwrapList(res as unknown as { data: CaseStudy[] | null; error: unknown })
    },
  })
}

/* ── creating and withdrawing ─────────────────────────────────────────────── */

type NewRecord =
  | { kind: 'promotional'; title: string; date: string; channelId: string; reach: number | null }
  | { kind: 'meeting'; date: string; subject: string }
  | { kind: 'caseStudy'; title: string; date: string; summary: string; change: string }

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
          })
          .select('id')
          .single()
        if (res.error) throw toAppError(res.error)
        return res.data
      }
      if (rec.kind === 'meeting') {
        const res = await supabase
          .from('coordination_meeting')
          .insert({ meeting_date: rec.date, subject: rec.subject.trim() })
          .select('id')
          .single()
        if (res.error) throw toAppError(res.error)
        return res.data
      }
      const res = await supabase
        .from('case_study')
        .insert({
          title: rec.title.trim(),
          documented_on: rec.date,
          summary: rec.summary.trim(),
          change_evidenced: rec.change.trim(),
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
