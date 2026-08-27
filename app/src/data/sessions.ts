import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { Database } from '../types/database'

/** The generated Update shapes, so a patch cannot name a column that is gone. */
type EnrolmentPatch = Database['public']['Tables']['training_enrolment']['Update']
/**
 * Only the columns BOTH session tables share.
 *
 * Written out rather than taken from one table's Update type: that would
 * compile against training and silently permit a column advisory does not
 * have, or vice versa. The shared set is the contract these screens work in.
 */
type SessionPatch = {
  title?: string
  topic_id?: string
  start_date?: string
  end_date?: string
  venue?: string | null
  focal_point?: string | null
  description?: string | null
  duration_hours?: number | null
  delivered_by_partnership_id?: string | null
  planned_seats?: number | null
  application_opens_on?: string | null
  application_closes_on?: string | null
  is_published?: boolean
  is_delivered?: boolean
  deleted_at?: string | null
}

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

/**
 * Training and advisory are the SAME SHAPE, deliberately.
 *
 * advisory_session mirrors training_session column for column (0045), because
 * the public site renders one opportunity template and the Municipality one
 * participant template. Duplicating these screens would mean two publish gates,
 * two ended-event rules and two completion decisions, all free to drift -- and
 * the completion decision is the one that moves A1.3 on one side and unlocks
 * linkage on the other.
 *
 * So the kind is a parameter, not a copy. Advisory adds `adviser` and the
 * qualification trail; nothing else differs.
 */
export type SessionKind = 'training' | 'advisory'

const TABLES = {
  training: { session: 'training_session', enrolment: 'training_enrolment' },
  advisory: { session: 'advisory_session', enrolment: 'advisory_enrolment' },
} as const

export const sessionKeys = {
  all: (kind: SessionKind) => ['sessions', kind] as const,
  list: (kind: SessionKind) => [...sessionKeys.all(kind), 'list'] as const,
  one: (kind: SessionKind, id: string) => [...sessionKeys.all(kind), 'one', id] as const,
  participants: (kind: SessionKind, id: string) =>
    [...sessionKeys.all(kind), 'participants', id] as const,
  deleteImpact: (id: string) => ['sessions', 'training', 'delete-impact', id] as const,
}

export type ManagedSession = {
  id: string
  title: string
  /** Provenance. See migration 0063. */
  origin: 'created' | 'completion'
  topic_id: string
  start_date: string
  end_date: string
  venue: string | null
  planned_seats: number | null
  is_published: boolean
  is_delivered: boolean
  is_cancelled: boolean
  cancellation_reason: string | null
  application_opens_on: string | null
  application_closes_on: string | null
  focal_point: string | null
  description: string | null
  duration_hours: number | null
  delivered_by_partnership_id: string | null
  /** Advisory only. Null on a training row, which has no such column. */
  adviser?: string | null
}

const COMMON_COLS =
  'id, title, topic_id, start_date, end_date, venue, planned_seats, is_published, ' +
  'is_delivered, is_cancelled, cancellation_reason, application_opens_on, ' +
  'application_closes_on, focal_point, description, duration_hours, ' +
  'delivered_by_partnership_id'

// `origin` is training-only (0063): advisory has no resolveSession equivalent
// creating rows as a by-product, so there is no provenance to record.
const colsFor = (kind: SessionKind) =>
  kind === 'training' ? `${COMMON_COLS}, origin` : `${COMMON_COLS}, adviser`

/**
 * Can this be published, and if not, what is missing?
 *
 * A DIRECT STATEMENT ABOUT THE ROW, not a guess about where it came from.
 * `origin` says how the row was made; this says whether it is finished. They
 * are separate on purpose -- a completion-origin session a coordinator has
 * filled in is complete, and a hand-created one left half-done is not.
 *
 * These four are the fields a member of the public needs in order to decide
 * whether to turn up: what it is about, where to go, how long it takes, and who
 * to ask.
 */
export function missingForPublish(s: ManagedSession): string[] {
  const gaps: string[] = []
  if (!s.venue) gaps.push('venue')
  if (!s.focal_point) gaps.push('focalPoint')
  if (s.duration_hours === null) gaps.push('durationHours')
  if (!s.description) gaps.push('description')
  return gaps
}

export function useManagedSessions(kind: SessionKind) {
  return useQuery({
    queryKey: sessionKeys.list(kind),
    queryFn: async (): Promise<ManagedSession[]> => {
      const res = await supabase
        .from(TABLES[kind].session)
        .select(colsFor(kind))
        .is('deleted_at', null)
        .order('start_date', { ascending: false })
      return unwrapList(res as unknown as { data: ManagedSession[] | null; error: unknown })
    },
  })
}

export function useManagedSession(kind: SessionKind, id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.one(kind, id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ManagedSession> => {
      const res = await supabase
        .from(TABLES[kind].session)
        .select(colsFor(kind))
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

export function useSessionParticipants(kind: SessionKind, sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.participants(kind, sessionId ?? ''),
    enabled: !!sessionId,
    queryFn: async (): Promise<Participant[]> => {
      const res = await supabase
        .from(TABLES[kind].enrolment)
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

function useParticipantMutation<TVars extends { id: string; sessionId: string; kind: SessionKind }>(
  key: string,
  patch: (vars: TVars, userId: string | null) => EnrolmentPatch,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['sessions', key],
    mutationFn: async (vars: TVars) => {
      const { data: auth } = await supabase.auth.getUser()
      const res = await supabase
        .from(TABLES[vars.kind].enrolment)
        .update(patch(vars, auth.user?.id ?? null))
        .eq('id', vars.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.participants(vars.kind, vars.sessionId) })
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
    kind: SessionKind
    status: 'approved' | 'rejected'
  }>('decide-application', (v) => ({ application_status: v.status }))
}

/** Did they turn up. Says nothing about whether they completed. */
export function useSetAttended() {
  return useParticipantMutation<{
    id: string
    sessionId: string
    kind: SessionKind
    attended: boolean
  }>(
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
    kind: SessionKind
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
    mutationFn: async (vars: { id: string; on: boolean; kind: SessionKind }) => {
      const res = await supabase
        .from(TABLES[vars.kind].session)
        .update(patch(vars.on))
        .eq('id', vars.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.one(vars.kind, vars.id) })
      void qc.invalidateQueries({ queryKey: sessionKeys.list(vars.kind) })
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

/* ── creating a session ───────────────────────────────────────────────────── */

/**
 * What the create form writes.
 *
 * `is_published` and `is_delivered` are ABSENT on purpose and must stay absent.
 * Publishing makes something public; delivery asserts it happened and feeds
 * D0.2. Both are separate deliberate actions taken later, from the session
 * screen, and a create form that could set either would let a coordinator make
 * a draft public, or move a donor figure, without meaning to.
 *
 * `duration_hours` is asked for rather than derived from the dates: a
 * three-day course may be twelve hours, and D0.2 and the public page both
 * report what was actually taught.
 */
export type NewSession = {
  title: string
  topicId: string
  startDate: string
  endDate: string
  durationHours: number
  venue: string
  partnershipId: string | null
  focalPoint: string
  description: string
  plannedSeats: number | null
  applicationOpensOn: string | null
  applicationClosesOn: string | null
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['sessions', 'update'],
    mutationFn: async (v: NewSession & { id: string; kind: SessionKind }) => {
      const res = await supabase
        .from(TABLES[v.kind].session)
        .update({
          title: v.title.trim(),
          topic_id: v.topicId,
          start_date: v.startDate,
          end_date: v.endDate,
          duration_hours: v.durationHours,
          venue: v.venue.trim(),
          focal_point: v.focalPoint.trim(),
          description: v.description.trim(),
          delivered_by_partnership_id: v.partnershipId,
          planned_seats: v.plannedSeats,
          application_opens_on: v.applicationOpensOn,
          application_closes_on: v.applicationClosesOn,
          // origin is NOT touched. It records how the row came to exist, which
          // does not change because someone filled in the gaps afterwards.
        })
        .eq('id', v.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.one(v.kind, v.id) })
      void qc.invalidateQueries({ queryKey: sessionKeys.list(v.kind) })
      void qc.invalidateQueries({ queryKey: ['public', 'opportunities'] })
    },
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['sessions', 'create'],
    mutationFn: async (v: NewSession & { kind: SessionKind }) => {
      const res = await supabase
        .from(TABLES[v.kind].session)
        .insert({
          title: v.title.trim(),
          topic_id: v.topicId,
          start_date: v.startDate,
          end_date: v.endDate,
          duration_hours: v.durationHours,
          venue: v.venue.trim(),
          focal_point: v.focalPoint.trim(),
          description: v.description.trim(),
          // Nullable on purpose: there may be no training partnership yet, and
          // blocking the form on one would stop a municipality recording a
          // course it ran alone.
          ...(v.partnershipId ? { delivered_by_partnership_id: v.partnershipId } : {}),
          ...(v.plannedSeats === null ? {} : { planned_seats: v.plannedSeats }),
          ...(v.applicationOpensOn ? { application_opens_on: v.applicationOpensOn } : {}),
          ...(v.applicationClosesOn ? { application_closes_on: v.applicationClosesOn } : {}),
        })
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.list(v.kind) })
      // Not published yet, so the public list cannot have changed -- but D0.2
      // reads training_session, and an unpublished undelivered row must leave
      // it alone. Invalidating proves that on screen rather than assuming it.
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
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
    mutationFn: async (vars: { id: string; kind: SessionKind }) => {
      const res = await supabase
        .from(TABLES[vars.kind].session)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', vars.id)
        .is('deleted_at', null)
        .select('id')
        .single()
      if (res.error) throw toAppError(res.error)
      return res.data
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: sessionKeys.all(vars.kind) })
      void qc.invalidateQueries({ queryKey: ['public', 'opportunities'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/* ── how each advisory participant qualified ─────────────────────────────── */

/**
 * The trainings that made these people eligible for advisory.
 *
 * ── WHY THIS IS NOT "HAS COMPLETED A TRAINING" ──
 *
 * That sentence is not an audit trail. A coordinator looking at an advisory
 * list needs to answer "why is this person here", and the answer is a specific
 * course on a specific date -- something they can check.
 *
 * ── AND WHY IT RETURNS A LIST, NOT ONE ROW ──
 *
 * Demo Person One qualifies through three completed trainings. Naming only one
 * would imply their eligibility rests on it, and it does not: soft-delete that
 * one and they are still eligible through the other two. So the earliest is
 * shown as the one that first opened the door, and the count says how many
 * others back it up.
 *
 * The four conditions match v_ind_a1_3 and check_advisory_eligibility exactly.
 * A person shown here as qualified is one the gate would let through -- if this
 * ever disagreed with the trigger, the list would be explaining a decision the
 * database did not make.
 */
export type Qualification = {
  personId: string
  /** Earliest completed training -- the one that first granted eligibility. */
  title: string
  completedOn: string
  /** How many completed trainings this person has in total. */
  total: number
}

export function useQualifications(personIds: string[]) {
  const key = [...personIds].sort().join(',')
  return useQuery({
    queryKey: ['sessions', 'qualifications', key],
    enabled: personIds.length > 0,
    queryFn: async (): Promise<Map<string, Qualification>> => {
      const res = await supabase
        .from('training_enrolment')
        .select(
          'person_id, decided_on, registered_on, training_session!inner (title, end_date, deleted_at)',
        )
        .in('person_id', personIds)
        .eq('met_criteria', true)
        .is('deleted_at', null)
        .is('training_session.deleted_at', null)
      type Raw = {
        person_id: string
        decided_on: string | null
        registered_on: string
        training_session: { title: string; end_date: string } | null
      }
      const rows = unwrapList(res as unknown as { data: Raw[] | null; error: unknown })
      const byPerson = new Map<string, Qualification>()
      for (const r of rows) {
        const on = r.decided_on ?? r.registered_on
        const cur = byPerson.get(r.person_id)
        if (!cur) {
          byPerson.set(r.person_id, {
            personId: r.person_id,
            title: r.training_session?.title ?? '',
            completedOn: on,
            total: 1,
          })
        } else {
          cur.total += 1
          if (on < cur.completedOn) {
            cur.title = r.training_session?.title ?? cur.title
            cur.completedOn = on
          }
        }
      }
      return byPerson
    },
  })
}
