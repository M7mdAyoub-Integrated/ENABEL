import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'
import { qk } from './queryClient'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module 3 — Training completion.
 *
 *  Three tables move when one form is saved:
 *
 *    person              found by national ID, or created if new
 *    training_session    found by (topic, start date), or created
 *    training_enrolment  the row this form is really about
 *
 *  ── THE DUPLICATE-HUMAN RISK, AND WHAT ACTUALLY GUARDS IT ──
 *
 *  A1.3 counts DISTINCT PEOPLE. A duplicate person row inflates it permanently
 *  and silently -- nothing downstream can tell two rows for one human apart.
 *
 *  `person.national_id` is UNIQUE with a nine-digit format check, so the
 *  database refuses a second row for an ID it already holds. That protects
 *  against re-entering the SAME id. It does NOT protect against a TYPO:
 *  300000001 mistyped as 300000010 is a valid, unused ID, and inserting it
 *  creates a new human.
 *
 *  The guard for that is double entry. The form asks for the national ID twice
 *  and FormScreen refuses to save unless both match, before this file is
 *  reached. That is the only thing standing between a slipped digit and a
 *  permanently inflated indicator, which is why the check lives at the form
 *  boundary and not here.
 *
 *  A lookup that FINDS a person never writes to `person` at all -- it reuses
 *  the row. Only an unmatched ID inserts, and only after double entry agreed.
 *
 *  ── THE DECISION ──
 *
 *  `met_criteria` is what A1.3 counts, and the table carries
 *  `decision_needs_date`: met_criteria may not be set without decided_on. So
 *  both are written together, with `decided_by` from the session. Never one
 *  without the others.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CompletionRow = {
  id: string
  personId: string
  nationalId: string
  fullName: string
  sex: string | null
  ageRecorded: number | null
  phone: string | null
  sessionId: string
  topicId: string
  sessionTitle: string
  startDate: string
  attended: boolean
  metCriteria: boolean | null
  decidedOn: string | null
  createdAt: string
}

type Select = {
  id: string
  person_id: string
  session_id: string
  attended: boolean
  met_criteria: boolean | null
  decided_on: string | null
  created_at: string
  person: {
    national_id: string
    full_name: string
    sex: string | null
    age_recorded: number | null
    phone: string | null
  }
  training_session: { id: string; title: string; topic_id: string; start_date: string }
}

const SELECT = `
  id, person_id, session_id, attended, met_criteria, decided_on, created_at,
  person!inner ( national_id, full_name, sex, age_recorded, phone ),
  training_session!inner ( id, title, topic_id, start_date )
`

function toRow(r: Select): CompletionRow {
  return {
    id: r.id,
    personId: r.person_id,
    nationalId: r.person.national_id,
    fullName: r.person.full_name,
    sex: r.person.sex,
    ageRecorded: r.person.age_recorded,
    phone: r.person.phone,
    sessionId: r.session_id,
    topicId: r.training_session.topic_id,
    sessionTitle: r.training_session.title,
    startDate: r.training_session.start_date,
    attended: r.attended,
    metCriteria: r.met_criteria,
    decidedOn: r.decided_on,
    createdAt: r.created_at,
  }
}

/** Soft-deleted parents are excluded, matching what the indicator views do. */
export function useCompletions(enabled = true) {
  return useQuery({
    queryKey: qk.enrolments.list(),
    enabled,
    queryFn: async (): Promise<CompletionRow[]> => {
      const res = await supabase
        .from('training_enrolment')
        .select(SELECT)
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .is('training_session.deleted_at', null)
        .order('created_at', { ascending: false })
      return unwrapList(res as unknown as { data: Select[] | null; error: unknown }).map(toRow)
    },
  })
}

export function useCompletion(id: string | undefined) {
  return useQuery({
    queryKey: qk.enrolments.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<CompletionRow> => {
      const res = await supabase
        .from('training_enrolment')
        .select(SELECT)
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      return toRow(unwrap(res as unknown as { data: Select | null; error: unknown }))
    },
  })
}

/* ── the national ID lookup ──────────────────────────────────────────────── */

export type FoundPerson = {
  id: string
  nationalId: string
  fullName: string
  sex: string | null
  ageRecorded: number | null
  dateOfBirth: string | null
  phone: string | null
}

/** Exactly nine digits, mirroring the database's format check. */
export function isCompleteNationalId(nid: string): boolean {
  return /^[0-9]{9}$/.test(nid)
}

/**
 * Look a person up by national ID.
 *
 * Only fires once the ID is nine digits, so it does not query on every
 * keystroke. `maybeSingle` because "not found" is the normal path for a new
 * participant, not an error.
 */
export function usePersonByNationalId(nid: string) {
  return useQuery({
    queryKey: qk.people.byNationalId(nid),
    enabled: isCompleteNationalId(nid),
    staleTime: 30_000,
    queryFn: async (): Promise<FoundPerson | null> => {
      const res = await supabase
        .from('person')
        .select('id, national_id, full_name, sex, age_recorded, date_of_birth, phone')
        .eq('national_id', nid)
        .is('deleted_at', null)
        .maybeSingle()
      if (res.error) throw toAppError(res.error)
      const p = res.data
      if (!p) return null
      return {
        id: p.id,
        nationalId: p.national_id,
        fullName: p.full_name,
        sex: p.sex,
        ageRecorded: p.age_recorded,
        dateOfBirth: p.date_of_birth,
        phone: p.phone,
      }
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

/** Mirrors the `sex_t` enum. The form's select can only offer these two. */
export type Sex = 'female' | 'male'

function asSex(v: string | null): Sex | null {
  return v === 'female' || v === 'male' ? v : null
}

export type CompletionInput = {
  nationalId: string
  fullName: string
  sex: string | null
  age: number | null
  phone: string | null
  topicId: string
  /** The topic's label, used to title a newly created session. */
  topicLabel: string
  trainingDate: string
  metCriteria: boolean | null
}

/**
 * Find the person, or create them.
 *
 * Returns the id and whether a row was written, so the caller can report it.
 * The national ID is never updated on an existing row: it is the identity, and
 * the unique key plus the format check make it the one field that must not
 * drift.
 */
async function resolvePerson(input: CompletionInput): Promise<{ id: string; created: boolean }> {
  const found = await supabase
    .from('person')
    .select('id')
    .eq('national_id', input.nationalId)
    .is('deleted_at', null)
    .maybeSingle()
  if (found.error) throw toAppError(found.error)
  if (found.data) return { id: found.data.id, created: false }

  // `age_or_dob` requires a date of birth or a recorded age. A missing age is
  // refused by the database rather than written as a null that would quietly
  // drop the person out of every age-band breakdown later.
  const res = await supabase
    .from('person')
    .insert({
      national_id: input.nationalId,
      full_name: input.fullName.trim(),
      sex: asSex(input.sex),
      age_recorded: input.age,
      phone: input.phone?.trim() || null,
    })
    .select('id')
    .single()
  const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
  return { id: row.id, created: true }
}

/**
 * Find the training session, or create it.
 *
 * The form asks for a topic and a date, not a session, because that is how the
 * paper form works. Two people completing the same topic on the same day were
 * in the same cohort, so (topic_id, start_date) is the join key. There is no
 * unique constraint on that pair -- it is an application-level rule, written
 * here rather than in the schema because the schema is not being changed.
 *
 * The title describes the TRAINING, not the trainee. Titling it after whoever
 * happened to be entered first would name the whole cohort after one person.
 */
async function resolveSession(topicId: string, date: string, topicLabel: string): Promise<string> {
  const found = await supabase
    .from('training_session')
    .select('id')
    .eq('topic_id', topicId)
    .eq('start_date', date)
    .is('deleted_at', null)
    .limit(1)
  if (found.error) throw toAppError(found.error)
  const hit = (found.data ?? [])[0]
  if (hit) return hit.id

  const res = await supabase
    .from('training_session')
    .insert({
      title: topicLabel.trim() || 'Training session',
      topic_id: topicId,
      start_date: date,
      end_date: date,
      // NOT is_delivered. This used to be true, and it silently moved D0.2:
      // v_ind_d0_2 counts delivered sessions with a food-processing topic, so
      // recording one completion for a food-safety course added one to a donor
      // indicator with no form filled in and nothing on screen saying so.
      // Measured at 2 -> 3 -> 4 across two completions of the same course.
      //
      // The coordinator recording a completion is not asserting that a
      // countable session was delivered. They are saying a person finished
      // something. Delivery is recorded deliberately, later, from the session
      // screen -- which is also where the missing details get filled in.
      is_delivered: false,
      // Provenance, stored rather than inferred. See migration 0063.
      origin: 'completion',
    })
    .select('id')
    .single()
  const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
  return row.id
}

/**
 * The decision fields, always written together.
 *
 * `decision_needs_date` refuses met_criteria without decided_on, so they move
 * as one. `decided_by` records who made the call.
 */
function decisionFields(met: boolean | null, userId: string | null) {
  if (met === null) return { met_criteria: null, decided_on: null, decided_by: null }
  return {
    met_criteria: met,
    decided_on: new Date().toISOString().slice(0, 10),
    decided_by: userId,
    // Answering the decision means the person turned up to be assessed. There
    // is no separate attendance question on the form.
    attended: true,
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function useCreateCompletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompletionInput) => {
      const person = await resolvePerson(input)
      const sessionId = await resolveSession(input.topicId, input.trainingDate, input.topicLabel)
      const uid = await currentUserId()

      const res = await supabase
        .from('training_enrolment')
        .insert({
          person_id: person.id,
          session_id: sessionId,
          registered_on: input.trainingDate,
          ...decisionFields(input.metCriteria, uid),
        })
        .select('id')
        .single()
      const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
      return { id: row.id, personCreated: person.created }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.enrolments.all })
      void qc.invalidateQueries({ queryKey: qk.people.all })
    },
  })
}

export function useUpdateCompletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      personId,
      input,
    }: {
      id: string
      personId: string
      input: CompletionInput
    }) => {
      // Demographics may be corrected; the national ID may not. It is the
      // identity of the row, and changing it would silently re-point every
      // other record attached to this person.
      const p = await supabase
        .from('person')
        .update({
          full_name: input.fullName.trim(),
          sex: asSex(input.sex),
          age_recorded: input.age,
          phone: input.phone?.trim() || null,
        })
        .eq('id', personId)
      if (p.error) throw toAppError(p.error)

      const sessionId = await resolveSession(input.topicId, input.trainingDate, input.topicLabel)
      const uid = await currentUserId()

      const res = await supabase
        .from('training_enrolment')
        .update({
          session_id: sessionId,
          registered_on: input.trainingDate,
          ...decisionFields(input.metCriteria, uid),
        })
        .eq('id', id)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.enrolments.all })
    },
  })
}

/** Soft delete. Never a hard delete -- CLAUDE.md rule 2. */
export function useDeleteCompletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('training_enrolment')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'delete matched no visible row' })
      }
      return id
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.enrolments.list() })
      const previous = qc.getQueryData<CompletionRow[]>(qk.enrolments.list())
      qc.setQueryData<CompletionRow[]>(qk.enrolments.list(), (cur) =>
        (cur ?? []).filter((r) => r.id !== id),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.enrolments.list(), ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.enrolments.all })
    },
  })
}
