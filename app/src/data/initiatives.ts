import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Production initiatives, and the mentorship sessions delivered to them.
 *
 *  ── WHY MENTORSHIP IS A SECTION HERE AND NOT A FORM OF ITS OWN ──
 *
 *  `mentorship_session.initiative_id` is NOT NULL. A central "record a
 *  mentorship session" form would have to open with a dropdown of every
 *  initiative in the programme, and the coordinator would pick the one they
 *  were already looking at a moment earlier. The parent has to be chosen
 *  before any other field on the form means anything, so the record belongs on
 *  the parent.
 *
 *  ── C1.3 COUNTS SESSIONS, NOT PEOPLE ──
 *
 *  `v_ind_c1_3` is `count(ms.id)`. Three sessions with one producer are THREE,
 *  correctly -- this is the opposite of A1.3, B1.2, D0.1 and E0.2, and the
 *  distinction is easy to get backwards because every other count in this
 *  neighbourhood is a distinct-person count. The join through
 *  production_initiative to person in that view applies the soft-delete
 *  cascade; it does not de-duplicate.
 *
 *  So there is no national ID on this form and no `resolvePerson` call. The
 *  producer is already known: they are the initiative's owner.
 *
 *  ── C1.3 HAS NO TARGET AND MUST NOT BE GIVEN ONE ──
 *
 *  The row is an empty shell in the source workbook -- no definition, method,
 *  formula, disaggregation or target. See 06 OQ-1. The screen shows the count
 *  and says the target is not set; it never shows 0, because a zero target
 *  reads as "we achieved 100%".
 *
 *  There is also a live question about whether C1.3 means THIS table at all or
 *  the newer `advisory_session`. `v_ind_c1_3` was deliberately not repointed,
 *  because choosing would mean inventing a definition. Same OQ-1.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const initiativeKeys = {
  all: ['initiatives'] as const,
  list: () => ['initiatives', 'list'] as const,
  one: (id: string) => ['initiatives', 'one', id] as const,
  mentorship: (initiativeId: string) => ['initiatives', 'mentorship', initiativeId] as const,
}

export type InitiativeListRow = {
  id: string
  title: string
  personId: string
  personName: string
  nationalId: string
  activityLabelEn: string
  activityLabelAr: string | null
  mainProduct: string | null
  startedOn: string | null
  status: string
  isWomenLed: boolean | null
  isYouthLed: boolean | null
  /** Live linkages, raw. C1.2's rule lives in the view, never here. */
  linkageStatuses: string[]
  mentorshipCount: number
}

type InitiativeSelect = {
  id: string
  title: string
  person_id: string
  main_product: string | null
  started_on: string | null
  status: string
  is_women_led: boolean | null
  is_youth_led: boolean | null
  person: { full_name: string; national_id: string } | null
  ref_activity_type: { label_en: string; label_ar: string | null } | null
  market_linkage: { status: string; deleted_at: string | null }[] | null
  mentorship_session: { id: string; deleted_at: string | null }[] | null
}

const LIST_SELECT = `
  id, title, person_id, main_product, started_on, status, is_women_led, is_youth_led,
  person!inner ( full_name, national_id ),
  ref_activity_type ( label_en, label_ar ),
  market_linkage ( status, deleted_at ),
  mentorship_session ( id, deleted_at )
`

function toListRow(r: InitiativeSelect): InitiativeListRow {
  return {
    id: r.id,
    title: r.title,
    personId: r.person_id,
    personName: r.person?.full_name ?? '',
    nationalId: r.person?.national_id ?? '',
    activityLabelEn: r.ref_activity_type?.label_en ?? '',
    activityLabelAr: r.ref_activity_type?.label_ar ?? null,
    mainProduct: r.main_product,
    startedOn: r.started_on,
    status: r.status,
    isWomenLed: r.is_women_led,
    isYouthLed: r.is_youth_led,
    // Filtered HERE, not in the select. PostgREST applies a filter on an
    // embedded table to the PARENT row, so `.is('market_linkage.deleted_at',
    // null)` would drop initiatives that have no linkage at all -- which are
    // exactly the ones that have not reached C1.2 yet. Same trap as
    // useInitiativesForPerson in linkage.ts.
    linkageStatuses: (r.market_linkage ?? []).filter((l) => l.deleted_at === null).map((l) => l.status),
    mentorshipCount: (r.mentorship_session ?? []).filter((m) => m.deleted_at === null).length,
  }
}

export function useInitiatives(enabled = true) {
  return useQuery({
    queryKey: initiativeKeys.list(),
    enabled,
    queryFn: async (): Promise<InitiativeListRow[]> => {
      const res = await supabase
        .from('production_initiative')
        .select(LIST_SELECT)
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .order('created_at', { ascending: false })
      return unwrapList(
        res as unknown as { data: InitiativeSelect[] | null; error: unknown },
      ).map(toListRow)
    },
  })
}

export function useInitiative(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: initiativeKeys.one(id ?? ''),
    enabled: enabled && !!id,
    queryFn: async (): Promise<InitiativeListRow> => {
      const res = await supabase
        .from('production_initiative')
        .select(LIST_SELECT)
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      return toListRow(unwrap(res as unknown as { data: InitiativeSelect | null; error: unknown }))
    },
  })
}

/* ── mentorship sessions ─────────────────────────────────────────────────── */

export type MentorshipRow = {
  id: string
  initiativeId: string
  sessionDate: string
  topic: string
  adviser: string | null
  createdAt: string
}

type MentorshipSelect = {
  id: string
  initiative_id: string
  session_date: string
  topic: string
  adviser: string | null
  created_at: string
}

export function useMentorshipSessions(initiativeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: initiativeKeys.mentorship(initiativeId ?? ''),
    enabled: enabled && !!initiativeId,
    queryFn: async (): Promise<MentorshipRow[]> => {
      const res = await supabase
        .from('mentorship_session')
        .select('id, initiative_id, session_date, topic, adviser, created_at')
        .eq('initiative_id', initiativeId!)
        .is('deleted_at', null)
        .order('session_date', { ascending: false })
      return unwrapList(
        res as unknown as { data: MentorshipSelect[] | null; error: unknown },
      ).map((m) => ({
        id: m.id,
        initiativeId: m.initiative_id,
        sessionDate: m.session_date,
        topic: m.topic,
        adviser: m.adviser,
        createdAt: m.created_at,
      }))
    },
  })
}

export type MentorshipInput = {
  initiativeId: string
  sessionDate: string
  topic: string
  adviser: string | null
  /** One per attempt. An adviser who loses signal must not log two sessions. */
  clientUuid?: string
}

function invalidate(qc: ReturnType<typeof useQueryClient>, initiativeId: string) {
  void qc.invalidateQueries({ queryKey: initiativeKeys.mentorship(initiativeId) })
  void qc.invalidateQueries({ queryKey: initiativeKeys.list() })
  void qc.invalidateQueries({ queryKey: initiativeKeys.one(initiativeId) })
  // Every session is one more in C1.3, so the dashboard is stale after each.
  void qc.invalidateQueries({ queryKey: ['indicators'] })
}

export function useCreateMentorshipSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MentorshipInput) => {
      const res = await supabase
        .from('mentorship_session')
        .insert({
          initiative_id: input.initiativeId,
          session_date: input.sessionDate,
          topic: input.topic.trim(),
          adviser: input.adviser?.trim() || null,
          ...(input.clientUuid ? { client_uuid: input.clientUuid } : {}),
        })
        .select('id')
        .single()
      const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
      return row.id
    },
    onSuccess: (_id, input) => invalidate(qc, input.initiativeId),
  })
}

export function useUpdateMentorshipSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Pick<MentorshipInput, 'initiativeId' | 'sessionDate' | 'topic' | 'adviser'>
    }) => {
      const res = await supabase
        .from('mentorship_session')
        .update({
          session_date: input.sessionDate,
          topic: input.topic.trim(),
          adviser: input.adviser?.trim() || null,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      // RLS filters an update it will not permit rather than raising, so the
      // statement reports success having changed nothing. Count what came back.
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: (_id, v) => invalidate(qc, v.input.initiativeId),
  })
}

/**
 * Soft delete. Never a hard delete — CLAUDE.md rule 2.
 *
 * Coordinator-only, enforced by `guard_soft_delete`. Unlike D0.1 and B1.2 this
 * always moves C1.3 by exactly one, because C1.3 counts sessions: there is no
 * "it was their only one" case to think about.
 */
export function useDeleteMentorshipSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; initiativeId: string }) => {
      const res = await supabase
        .from('mentorship_session')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: (_id, v) => invalidate(qc, v.initiativeId),
  })
}
