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
  linkages: (initiativeId: string) => ['initiatives', 'linkages', initiativeId] as const,
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
  market_linkage!market_linkage_initiative_id_fkey ( status, deleted_at ),
  mentorship_session!mentorship_session_initiative_id_fkey ( id, deleted_at )
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

/* ── the initiative's own facts ──────────────────────────────────────────── */

/**
 * The fields 04_DATA_DICTIONARY.md section 8 lists for `production_initiative`
 * beyond what a linkage creates it with: start date, status, women-led,
 * youth-led (and the product, which the linkage does set).
 *
 * ── WHY `started_on` IS NOT OPTIONAL TIDYING ──
 *
 * `v_ind_c1` admits a follow-up survey only where the respondent has an
 * initiative with `started_on <= contact_date - 6 months`. Both paths that
 * create an initiative -- matching a request, recording a direct linkage --
 * leave `started_on` null, and a null never satisfies that test. So until 16
 * September 2026 no initiative created through the platform could ever put a
 * survey into C1's denominator, and nothing on any screen could set the date.
 * C1 read ∅/0 and would have gone on doing so.
 */
export type InitiativeDetailsInput = {
  startedOn: string | null
  status: 'planned' | 'operating' | 'paused' | 'stopped'
  mainProduct: string | null
  isWomenLed: boolean | null
  isYouthLed: boolean | null
}

export function useUpdateInitiative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: InitiativeDetailsInput }) => {
      const res = await supabase
        .from('production_initiative')
        .update({
          started_on: input.startedOn,
          status: input.status,
          main_product: input.mainProduct?.trim() || null,
          is_women_led: input.isWomenLed,
          is_youth_led: input.isYouthLed,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      // RLS filters an update it will not permit rather than raising. Count.
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: initiativeKeys.one(id) })
      void qc.invalidateQueries({ queryKey: initiativeKeys.list() })
      // C1's six-month window reads started_on.
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/* ── the initiative's market linkages ────────────────────────────────────── */

/**
 * Every live linkage on this initiative, with the control that moves it.
 *
 * `useSetLinkageStatus` in linkage.ts existed only on the matched-request
 * screen, so a linkage recorded DIRECTLY (LinkageDirect, `create_direct_linkage`)
 * -- which has no request and therefore no request screen -- stayed `proposed`
 * with no way on any screen to make it active. C1.2 counts active and ended
 * linkages only, so a direct linkage could never reach it. This is the panel
 * that gives every linkage, direct or matched, the same control, on the record
 * the indicator actually counts.
 */
export type InitiativeLinkage = {
  id: string
  partnershipId: string
  partnerName: string
  partnershipType: string
  scope: string
  request: string | null
  linkedOn: string
  status: 'proposed' | 'under_review' | 'active' | 'ended'
  outcome: string | null
}

type LinkageSelect = {
  id: string
  partnership_id: string
  scope: string
  request: string | null
  linked_on: string
  status: InitiativeLinkage['status']
  outcome: string | null
  partnership: {
    partnership_type: string
    partner: { name: string } | null
  } | null
}

export function useInitiativeLinkages(initiativeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: initiativeKeys.linkages(initiativeId ?? ''),
    enabled: enabled && !!initiativeId,
    queryFn: async (): Promise<InitiativeLinkage[]> => {
      const res = await supabase
        .from('market_linkage')
        .select(
          'id, partnership_id, scope, request, linked_on, status, outcome, ' +
            'partnership!market_linkage_partnership_id_fkey ( partnership_type, partner!partnership_partner_id_fkey ( name ) )',
        )
        .eq('initiative_id', initiativeId!)
        .is('deleted_at', null)
        .order('linked_on', { ascending: false })
      return unwrapList(res as unknown as { data: LinkageSelect[] | null; error: unknown }).map((l) => ({
        id: l.id,
        partnershipId: l.partnership_id,
        partnerName: l.partnership?.partner?.name ?? '',
        partnershipType: l.partnership?.partnership_type ?? '',
        scope: l.scope,
        request: l.request,
        linkedOn: l.linked_on,
        status: l.status,
        outcome: l.outcome,
      }))
    },
  })
}

export function useUpdateInitiativeLinkage() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({
      id,
      initiativeId,
      patch,
    }: {
      id: string
      initiativeId: string
      patch: { status?: InitiativeLinkage['status']; outcome?: string | null; linkedOn?: string }
    }) => {
      const res = await supabase
        .from('market_linkage')
        .update({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.outcome !== undefined ? { outcome: patch.outcome?.trim() || null } : {}),
          ...(patch.linkedOn ? { linked_on: patch.linkedOn } : {}),
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return initiativeId
    },
    onSuccess: (initiativeId) => {
      void qc.invalidateQueries({ queryKey: initiativeKeys.linkages(initiativeId) })
      void qc.invalidateQueries({ queryKey: initiativeKeys.one(initiativeId) })
      void qc.invalidateQueries({ queryKey: initiativeKeys.list() })
      // The request screen reads the same row, and C1.2 and G0.4 both move
      // with the status (an active linkage credits the partner).
      void qc.invalidateQueries({ queryKey: ['linkage-requests'] })
      void qc.invalidateQueries({ queryKey: ['contributions'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
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
