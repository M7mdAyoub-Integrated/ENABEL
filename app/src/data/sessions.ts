import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { Database } from '../types/database'

/** The generated Update shapes, so a patch cannot name a column that is gone. */
type EnrolmentPatch = Database['public']['Tables']['training_enrolment']['Update']
type SessionPatch = Database['public']['Tables']['training_session']['Update']

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Municipality side of a training session: publishing it, and deciding who
 *  took part.
 *
 *  ── THREE FACTS THAT ARE NOT THE SAME FACT ──
 *
 *  The whole reason this file exists separately from the completions form is
 *  that a person's relationship to a session has three independent states, and
 *  collapsing any two of them is how A1.3 drifts:
 *
 *    application_status   did the Municipality ACCEPT them onto the session
 *    attended             did they TURN UP
 *    met_criteria         did they COMPLETE it        <-- only this moves A1.3
 *
 *  Someone can be accepted and never attend. Someone can attend and not
 *  complete. `v_ind_a1_3` counts met_criteria is true and nothing else, so a
 *  screen that lets a coordinator tick "done" without saying which of the three
 *  they mean is a screen that will eventually produce a wrong donor figure.
 *
 *  They are separate columns, separate mutations, and separate query keys here
 *  so that nothing downstream can quietly treat one as another.
 *
 *  ── PUBLISHED IS NOT DELIVERED ──
 *
 *  `is_published` makes an opportunity visible to the public.
 *  `is_delivered`  asserts the session happened, and feeds D0.2.
 *
 *  Two booleans on one row that mean completely different things. They get
 *  different mutations and, in the UI, deliberately different treatment -- see
 *  the note in SessionDetail.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  one: (id: string) => [...sessionKeys.all, 'one', id] as const,
  participants: (id: string) => [...sessionKeys.all, 'participants', id] as const,
  deleteImpact: (id: string) => [...sessionKeys.all, 'delete-impact', id] as const,
}

export type ManagedSession = {
  id: string
  title: string
  start_date: string
  end_date: string
  venue: string | null
  planned_seats: number | null
  is_published: boolean
  is_delivered: boolean
  is_cancelled: boolean
  cancellation_reason: string | null
  application_closes_on: string | null
  focal_point: string | null
  description: string | null
}

const SESSION_COLS =
  'id, title, start_date, end_date, venue, planned_seats, is_published, is_delivered, ' +
  'is_cancelled, cancellation_reason, application_closes_on, focal_point, description'

export function useManagedSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: async (): Promise<ManagedSession[]> => {
      const res = await supabase
        .from('training_session')
        .select(SESSION_COLS)
        .is('deleted_at', null)
        .order('start_date', { ascending: false })
      return unwrapList(res as unknown as { data: ManagedSession[] | null; error: unknown })
    },
  })
}

export function useManagedSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ManagedSession> => {
      const res = await supabase
        .from('training_session')
        .select(SESSION_COLS)
        .eq('id', id!)
        .is('deleted_at', null)
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data as unknown as ManagedSession
    },
  })
}

/* ── participants ─────────────────────────────────────────────────────────── */

export type Participant = {
  id: string
  person_id: string
  application_status: 'draft' | 'submitted' | 'approved' | 'rejected'
  applied_on: string | null
  registered_on: string
  attended: boolean
  met_criteria: boolean | null
  decided_on: string | null
  submitted_by_participant: boolean
  person: {
    full_name: string
    national_id: string
    village: string | null
    sex: string | null
  } | null
}

export function useSessionParticipants(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.participants(sessionId ?? ''),
    enabled: !!sessionId,
    queryFn: async (): Promise<Participant[]> => {
      const res = await supabase
        .from('training_enrolment')
        .select(
          'id, person_id, application_status, applied_on, registered_on, attended, ' +
            'met_criteria, decided_on, submitted_by_participant, ' +
            'person:person_id (full_name, national_id, village, sex)',
        )
        .eq('session_id', sessionId!)
        .is('deleted_at', null)
        .order('registered_on', { ascending: true })
      return unwrapList(res as unknown as { data: Participant[] | null; error: unknown })
    },
  })
}

/* ── the three decisions, deliberately three mutations ────────────────────── */

function useParticipantMutation<TVars extends { id: string; sessionId: string }>(
  key: string,
  patch: (vars: TVars, userId: string | null) => EnrolmentPatch,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['sessions', key],
    mutationFn: async (vars: TVars) => {
      const { data: auth } = await supabase.auth.getUser()
      const res = await supabase
        .from('training_enrolment')
        .update(patch(vars, auth.user?.id ?? null))
        .eq('id', vars.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.participants(vars.sessionId) })
      // A completion moves A1.3, so anything showing indicator figures is stale.
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

/** Accept or reject an application. Says nothing about attendance. */
export function useDecideApplication() {
  return useParticipantMutation<{
    id: string
    sessionId: string
    status: 'approved' | 'rejected'
  }>('decide-application', (v) => ({ application_status: v.status }))
}

/** Did they turn up. Says nothing about whether they completed. */
export function useSetAttended() {
  return useParticipantMutation<{ id: string; sessionId: string; attended: boolean }>(
    'set-attended',
    (v) => ({ attended: v.attended }),
  )
}

/**
 * THE ONE THAT MOVES A1.3.
 *
 * `decided_on` is required by the `decision_needs_date` constraint whenever
 * met_criteria is not null, and `decided_by` records who made the call. Setting
 * it back to null clears both, because an undecided row must not carry a
 * decision date.
 *
 * Completing also implies attendance: you cannot pass a training you were not
 * at. Recorded explicitly rather than left for someone to notice.
 */
export function useDecideCompletion() {
  return useParticipantMutation<{
    id: string
    sessionId: string
    met: boolean | null
  }>('decide-completion', (v, userId) =>
    v.met === null
      ? { met_criteria: null, decided_on: null, decided_by: null }
      : {
          met_criteria: v.met,
          decided_on: new Date().toISOString().slice(0, 10),
          decided_by: userId,
          attended: true,
        },
  )
}

/* ── publish and delivered: two booleans, two mutations, never one ────────── */

function useSessionFlag(key: string, patch: (on: boolean) => SessionPatch) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['sessions', key],
    mutationFn: async (vars: { id: string; on: boolean }) => {
      const res = await supabase
        .from('training_session')
        .update(patch(vars.on))
        .eq('id', vars.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.one(vars.id) })
      void qc.invalidateQueries({ queryKey: sessionKeys.list() })
      void qc.invalidateQueries({ queryKey: ['public', 'opportunities'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/** Makes it visible to the public. Does NOT assert it happened. */
export function usePublishSession() {
  return useSessionFlag('publish', (on) => ({ is_published: on }))
}

/**
 * Asserts it happened. Feeds D0.2.
 *
 * The database refuses this for a session that has not ended yet
 * (trg_training_session_delivery), so a mis-click on a future session is
 * caught server-side rather than trusted to the UI.
 */
export function useSetDelivered() {
  return useSessionFlag('delivered', (on) => ({ is_delivered: on }))
}

/* ── what deleting would cost ─────────────────────────────────────────────── */

export type DeleteImpact = {
  live_enrolments: number
  completions: number
  /** People who would be left with NO completed training anywhere. */
  eligibility_lost: number
  keep_existing_advisory: number
}

/**
 * Read BEFORE offering to delete, not after.
 *
 * Soft-deleting a session removes advisory eligibility from everyone whose only
 * completed training it was — silently, weeks before anyone notices. The
 * decision stays with the coordinator; the consequence does not stay hidden.
 * See 06_OPEN_QUESTIONS.md OQ-23.
 */
export function useSessionDeleteImpact(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: sessionKeys.deleteImpact(sessionId ?? ''),
    enabled: !!sessionId && enabled,
    queryFn: async (): Promise<DeleteImpact> => {
      const { data, error } = await supabase.rpc('training_session_delete_impact', {
        p_session_id: sessionId!,
      })
      if (error) throw toAppError(error)
      const row = Array.isArray(data) ? data[0] : data
      return (row ?? {
        live_enrolments: 0,
        completions: 0,
        eligibility_lost: 0,
        keep_existing_advisory: 0,
      }) as DeleteImpact
    },
  })
}

export function useSoftDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['sessions', 'soft-delete'],
    mutationFn: async (vars: { id: string }) => {
      const res = await supabase
        .from('training_session')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', vars.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sessionKeys.all })
      void qc.invalidateQueries({ queryKey: ['public', 'opportunities'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}
