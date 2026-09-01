import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'
import { normaliseNationalId, normalisePhone } from './apply'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Market linkage — the request, and the match.
 *
 *  ── NOTHING HERE DECIDES ANYTHING ──
 *
 *  Every write goes through an RPC, and the RPCs hold the rules:
 *
 *    request_linkage           0066  who may ask, and how a failure is worded
 *    match_linkage_request     0067  what a match creates, in one transaction
 *    create_direct_linkage     0073  the same, for a linkage brokered in person
 *
 *  0073 pulled the shared part of the last two into attach_or_create_linkage,
 *  so the duplicate-initiative refusal is ONE rule rather than two copies. A
 *  linkage made at a meeting is not a lesser record than one that came through
 *  the website, and until 0073 the website was the only way in.
 *
 *  This file must not acquire a rule of its own. In particular it does NOT
 *  decide whether someone has completed an advisory, and it does NOT decide
 *  whether a second initiative is allowed. The second one is worth stating
 *  twice: the screen defaults to attaching, but the DEFAULT is a convenience
 *  and the REFUSAL is in 0067. If this file ever starts passing
 *  createNewInitiative because it seemed easier than handling the refusal, the
 *  protection is gone and C1.2 starts drifting silently.
 *
 *  ── AND IT NEVER COMPUTES AN INDICATOR ──
 *
 *  C1.2 is read from `v_indicator_progress` like every other figure on every
 *  other screen. What this file returns instead is the raw fact underneath --
 *  each initiative and the status of each of its linkages -- so a coordinator
 *  can see WHY the number is what it is without anything here doing the
 *  counting. See useInitiativesForPerson.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LinkageRequestStatus = 'submitted' | 'under_review' | 'matched' | 'closed'

/** market_linkage.status. C1.2 counts only `active` and `ended`. */
export type LinkStatus = 'proposed' | 'under_review' | 'active' | 'ended'

export const linkageKeys = {
  all: ['linkage-requests'] as const,
  list: () => ['linkage-requests', 'list'] as const,
  one: (id: string) => ['linkage-requests', 'one', id] as const,
  initiatives: (personId: string) => ['linkage-requests', 'initiatives', personId] as const,
  siblings: (personId: string) => ['linkage-requests', 'siblings', personId] as const,
  partnerships: () => ['linkage-requests', 'partnerships'] as const,
}

/* ── the public request ───────────────────────────────────────────────────── */

/**
 * Every outcome `request_linkage` can return. No default branch consumes this:
 * an unhandled outcome should be a type error rather than a blank panel.
 */
export type LinkageRequestOutcome =
  /** Written. */
  | 'requested'
  /** The same attempt arrived twice. Not an error; the end state is right. */
  | 'already_requested'
  /**
   * Could not confirm who this is. ONE value covering a wrong date of birth, a
   * wrong phone, and a national ID the Municipality has never seen. They are
   * indistinguishable on purpose -- see 0066.
   */
  | 'cannot_verify'
  /** No completed advisory of ANY kind on record. */
  | 'ineligible'
  /**
   * A completed advisory, but on the home-based track. Distinct from
   * `ineligible` on purpose (0106): this producer did the work, and telling
   * them their record is missing would send them looking for a lost record
   * instead of for a market advisory. 05 section 13 is the same lesson in the
   * coordinator's half of this flow.
   */
  | 'wrong_track'
  /** This exact submission was received before, and later withdrawn by staff. */
  | 'withdrawn'
  /** Something broke. Deliberately not folded into cannot_verify -- see 0066. */
  | 'failed'

export type LinkageRequestInput = {
  nationalId: string
  dateOfBirth?: string | null
  phone?: string | null
  initiativeTitle: string
  activityTypeId: string
  request: string
  mainProduct?: string
  clientUuid: string
}

export type LinkageRequestResult = {
  ok: boolean
  result: LinkageRequestOutcome
  requires?: string
}

export function useRequestLinkage() {
  return useMutation({
    mutationKey: ['public', 'request-linkage'],
    // Never automatic. A refusal is an answer, and every attempt costs the
    // caller throttle budget.
    retry: false,
    gcTime: 0,
    mutationFn: async (input: LinkageRequestInput): Promise<LinkageRequestResult> => {
      // Keys are OMITTED rather than set to undefined: exactOptionalPropertyTypes
      // treats an explicit undefined as a different thing from an absent key,
      // and an absent argument is what makes Postgres apply the DEFAULT.
      const { data, error } = await supabase.rpc('request_linkage', {
        p_national_id: normaliseNationalId(input.nationalId),
        p_initiative_title: input.initiativeTitle.trim(),
        p_activity_type_id: input.activityTypeId,
        p_request: input.request.trim(),
        p_client_uuid: input.clientUuid,
        ...(input.dateOfBirth ? { p_date_of_birth: input.dateOfBirth } : {}),
        ...(input.phone ? { p_phone: normalisePhone(input.phone) } : {}),
        ...(input.mainProduct?.trim() ? { p_main_product: input.mainProduct.trim() } : {}),
      })
      if (error) throw toAppError(error)
      return data as LinkageRequestResult
    },
  })
}

/* ── the municipal queue ──────────────────────────────────────────────────── */

export type LinkageRequestRow = {
  id: string
  personId: string
  personName: string
  nationalId: string
  village: string | null
  phone: string | null
  requestedOn: string
  request: string
  initiativeTitle: string
  mainProduct: string | null
  activityLabelEn: string
  activityLabelAr: string
  status: LinkageRequestStatus
  matchedInitiativeId: string | null
  matchedLinkageId: string | null
  reviewNote: string | null
  closedReason: string | null
  reviewedAt: string | null
}

type RequestSelect = {
  id: string
  person_id: string
  requested_on: string
  request: string
  initiative_title: string
  main_product: string | null
  status: LinkageRequestStatus
  matched_initiative_id: string | null
  matched_linkage_id: string | null
  review_note: string | null
  closed_reason: string | null
  reviewed_at: string | null
  person: { full_name: string; national_id: string; village: string | null; phone: string | null }
  ref_activity_type: { label_en: string; label_ar: string }
}

const REQUEST_SELECT = `
  id, person_id, requested_on, request, initiative_title, main_product, status,
  matched_initiative_id, matched_linkage_id, review_note, closed_reason, reviewed_at,
  person!inner ( full_name, national_id, village, phone ),
  ref_activity_type!inner ( label_en, label_ar )
`

function toRequestRow(r: RequestSelect): LinkageRequestRow {
  return {
    id: r.id,
    personId: r.person_id,
    personName: r.person.full_name,
    nationalId: r.person.national_id,
    village: r.person.village,
    phone: r.person.phone,
    requestedOn: r.requested_on,
    request: r.request,
    initiativeTitle: r.initiative_title,
    mainProduct: r.main_product,
    activityLabelEn: r.ref_activity_type.label_en,
    activityLabelAr: r.ref_activity_type.label_ar,
    status: r.status,
    matchedInitiativeId: r.matched_initiative_id,
    matchedLinkageId: r.matched_linkage_id,
    reviewNote: r.review_note,
    closedReason: r.closed_reason,
    reviewedAt: r.reviewed_at,
  }
}

/**
 * The queue.
 *
 * `deleted_at is null` on BOTH the request and its person: soft-deleting
 * someone must take their requests out of the queue too, the same cascade rule
 * the indicator views apply.
 */
export function useLinkageRequests() {
  return useQuery({
    queryKey: linkageKeys.list(),
    queryFn: async (): Promise<LinkageRequestRow[]> => {
      const res = await supabase
        .from('linkage_request')
        .select(REQUEST_SELECT)
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .order('requested_on', { ascending: false })
      return unwrapList(res as unknown as { data: RequestSelect[] | null; error: unknown }).map(
        toRequestRow,
      )
    },
  })
}

export function useLinkageRequest(id: string | undefined) {
  return useQuery({
    queryKey: linkageKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<LinkageRequestRow> => {
      const res = await supabase
        .from('linkage_request')
        .select(REQUEST_SELECT)
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      return toRequestRow(unwrap(res as unknown as { data: RequestSelect | null; error: unknown }))
    },
  })
}

/* ── what this person already has ─────────────────────────────────────────── */

export type InitiativeLinkage = {
  id: string
  status: LinkStatus
  scope: string
  linkedOn: string
  partnerName: string
}

export type InitiativeRow = {
  id: string
  title: string
  activityLabelEn: string
  activityLabelAr: string
  mainProduct: string | null
  startedOn: string | null
  linkages: InitiativeLinkage[]
}

type InitiativeSelect = {
  id: string
  title: string
  main_product: string | null
  started_on: string | null
  ref_activity_type: { label_en: string; label_ar: string } | null
  market_linkage: {
    id: string
    status: LinkStatus
    scope: string
    linked_on: string
    deleted_at: string | null
    partnership: { partner: { name: string } | null } | null
  }[]
}

/**
 * Every live initiative this person already has, with the status of each of
 * its linkages.
 *
 * The linkage statuses are returned RAW rather than reduced to "this one
 * counts". C1.2's rule -- active and ended, distinct initiatives -- lives in
 * `v_ind_c1_2`, and a second copy of it here would be a copy free to drift.
 * The screen prints the statuses and reads the actual C1.2 figure from
 * `v_indicator_progress` alongside them.
 *
 * This is what makes "attach or create new" an informed choice: a coordinator
 * looking at "Demo home preserves — 1 active linkage" can see that attaching
 * adds a linkage to something already counted, and that creating a new
 * initiative adds a new countable thing.
 */
export function useInitiativesForPerson(personId: string | undefined) {
  return useQuery({
    queryKey: linkageKeys.initiatives(personId ?? ''),
    enabled: !!personId,
    queryFn: async (): Promise<InitiativeRow[]> => {
      const res = await supabase
        .from('production_initiative')
        .select(
          `id, title, main_product, started_on,
           ref_activity_type ( label_en, label_ar ),
           market_linkage ( id, status, scope, linked_on, deleted_at,
                            partnership ( partner ( name ) ) )`,
        )
        .eq('person_id', personId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      return unwrapList(
        res as unknown as { data: InitiativeSelect[] | null; error: unknown },
      ).map((r) => ({
        id: r.id,
        title: r.title,
        activityLabelEn: r.ref_activity_type?.label_en ?? '',
        activityLabelAr: r.ref_activity_type?.label_ar ?? '',
        mainProduct: r.main_product,
        startedOn: r.started_on,
        // Soft-deleted linkages are filtered HERE rather than in the select:
        // PostgREST applies a filter on an embedded table to the parent row,
        // so `.is('market_linkage.deleted_at', null)` would drop initiatives
        // that have no linkage at all -- which are exactly the ones a
        // coordinator most needs to see in the attach list.
        linkages: (r.market_linkage ?? [])
          .filter((l) => l.deleted_at === null)
          .map((l) => ({
            id: l.id,
            status: l.status,
            scope: l.scope,
            linkedOn: l.linked_on,
            partnerName: l.partnership?.partner?.name ?? '',
          })),
      }))
    },
  })
}

/**
 * This person's other live requests.
 *
 * 0066 deliberately allows more than one open request per person, because two
 * genuine needs are two requests. The cost is that a coordinator can match the
 * same need twice without noticing, so the detail screen shows the siblings.
 */
export function useSiblingRequests(personId: string | undefined, exceptId: string | undefined) {
  return useQuery({
    queryKey: linkageKeys.siblings(personId ?? ''),
    enabled: !!personId,
    queryFn: async (): Promise<LinkageRequestRow[]> => {
      const res = await supabase
        .from('linkage_request')
        .select(REQUEST_SELECT)
        .eq('person_id', personId!)
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .order('requested_on', { ascending: false })
      return unwrapList(res as unknown as { data: RequestSelect[] | null; error: unknown })
        .map(toRequestRow)
        .filter((r) => r.id !== exceptId)
    },
  })
}

/* ── partnerships to match against ──────────────────────────────────────────
   Moved to `usePartnershipOptions` in data/partnerships.ts when tp and pp
   merged. There were two queries returning the same list -- this one and the
   session form's -- and two copies of "which partners can be chosen" is how
   they come to disagree. One implementation now, used by the match screen, the
   direct-linkage screen and the session form. */

/* ── the match ────────────────────────────────────────────────────────────── */

/** Every outcome `match_linkage_request` can return. No default branch. */
export type MatchOutcome =
  | 'matched'
  | 'not_found'
  /**
   * The request exists and this user may not match it. Distinct from
   * `not_found` because telling a data_entry user that a request they can see
   * on screen does not exist reads as a broken page, not as a refusal. See
   * 0068 -- RLS stops them at the FOR UPDATE, which is silent, so the function
   * looks rather than assuming absence.
   */
  | 'not_permitted'
  | 'already_matched'
  | 'is_closed'
  | 'scope_required'
  | 'partnership_not_found'
  | 'initiative_not_theirs'
  /**
   * The person already has an initiative and the caller did not say which way
   * to go. Surfaced as a question, never resolved by retrying with the flag
   * set -- that would be this file deciding, and the whole point of the
   * refusal is that a human decides. See 0067.
   */
  | 'needs_initiative_choice'

export type MatchResult = {
  ok: boolean
  result: MatchOutcome
  initiative_id?: string
  linkage_id?: string
  initiative_created?: boolean
  linkage_status?: LinkStatus
  existing_initiatives?: number
}

export type MatchInput = {
  requestId: string
  partnershipId: string
  scope: string
  /** Attach to this initiative. Omitted means "create a new one". */
  initiativeId?: string
  /** Only meaningful when initiativeId is absent, and only ever set by a click. */
  createNewInitiative?: boolean
  linkedOn?: string
  reviewNote?: string
}

export function useMatchLinkageRequest() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: MatchInput): Promise<MatchResult> => {
      const { data, error } = await supabase.rpc('match_linkage_request', {
        p_request_id: input.requestId,
        p_partnership_id: input.partnershipId,
        p_scope: input.scope.trim(),
        ...(input.initiativeId ? { p_initiative_id: input.initiativeId } : {}),
        ...(input.createNewInitiative ? { p_create_new_initiative: true } : {}),
        ...(input.linkedOn ? { p_linked_on: input.linkedOn } : {}),
        ...(input.reviewNote?.trim() ? { p_review_note: input.reviewNote.trim() } : {}),
      })
      if (error) throw toAppError(error)
      return data as MatchResult
    },
    onSuccess: (res) => {
      if (res.result === 'matched') {
        void qc.invalidateQueries({ queryKey: linkageKeys.all })
        // A new linkage does not move C1.2 while it is proposed, but the
        // dashboard is invalidated anyway: the coordinator is about to be shown
        // the live figure, and showing them a cached one would undermine the
        // exact point the screen is making.
        void qc.invalidateQueries({ queryKey: ['indicators'] })
      }
    },
  })
}

/* ── status moves ─────────────────────────────────────────────────────────── */

/**
 * Move a request between statuses.
 *
 * A plain UPDATE, not an RPC: `linkage_request.op_update` is coordinator-only
 * and `linkage_closed_needs_reason` enforces the reason, so there is no rule
 * left for a function to hold. Zero rows back means RLS filtered the row out
 * and the write did not happen -- reporting success there would be a lie.
 */
export function useSetRequestStatus() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({
      id,
      status,
      closedReason,
    }: {
      id: string
      status: Extract<LinkageRequestStatus, 'submitted' | 'under_review' | 'closed'>
      closedReason?: string
    }) => {
      const res = await supabase
        .from('linkage_request')
        .update({
          status,
          closed_reason: status === 'closed' ? (closedReason?.trim() ?? '') : null,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: linkageKeys.all })
    },
  })
}

/**
 * Move a market linkage between statuses.
 *
 * This is the write that actually moves C1.2 -- `proposed` and `under_review`
 * are not counted, `active` and `ended` are. It lives on the linkage screen
 * rather than only in the generic /forms/ln editor because that is where a
 * coordinator is standing when the introduction turns into a real trading
 * relationship, and the trip to another screen is where the update stops
 * happening.
 */
export function useSetLinkageStatus() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({ id, status }: { id: string; status: LinkStatus }) => {
      const res = await supabase
        .from('market_linkage')
        .update({ status })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: linkageKeys.all })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/* ── a linkage brokered in person ─────────────────────────────────────────── */

/**
 * Every outcome `create_direct_linkage` can return. No default branch.
 *
 * `needs_initiative_choice` and `initiative_not_theirs` are the SAME refusals
 * matching returns, from the same function -- 0073 extracted
 * `attach_or_create_linkage` so the rule that protects C1.2 exists once rather
 * than in two copies free to drift.
 */
export type DirectOutcome =
  | 'linked'
  | 'bad_national_id'
  | 'person_not_found'
  | 'scope_required'
  | 'partnership_not_found'
  | 'initiative_not_theirs'
  | 'initiative_details_required'
  | 'needs_initiative_choice'

export type DirectResult = {
  ok: boolean
  result: DirectOutcome
  initiative_id?: string
  linkage_id?: string
  initiative_created?: boolean
  linkage_status?: LinkStatus
  existing_initiatives?: number
}

export type DirectInput = {
  nationalId: string
  partnershipId: string
  scope: string
  /** Attach to this initiative. Omitted means "create a new one". */
  initiativeId?: string
  /** Only ever set by a click, never to get past a refusal. */
  createNewInitiative?: boolean
  initiativeTitle?: string
  activityTypeId?: string
  mainProduct?: string
  linkedOn?: string
  note?: string
}

export function useCreateDirectLinkage() {
  const qc = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: DirectInput): Promise<DirectResult> => {
      const { data, error } = await supabase.rpc('create_direct_linkage', {
        p_national_id: input.nationalId.replace(/\D/g, '').slice(0, 9),
        p_partnership_id: input.partnershipId,
        p_scope: input.scope.trim(),
        ...(input.initiativeId ? { p_initiative_id: input.initiativeId } : {}),
        ...(input.createNewInitiative ? { p_create_new_initiative: true } : {}),
        ...(input.initiativeTitle?.trim()
          ? { p_initiative_title: input.initiativeTitle.trim() }
          : {}),
        ...(input.activityTypeId ? { p_activity_type_id: input.activityTypeId } : {}),
        ...(input.mainProduct?.trim() ? { p_main_product: input.mainProduct.trim() } : {}),
        ...(input.linkedOn ? { p_linked_on: input.linkedOn } : {}),
        ...(input.note?.trim() ? { p_note: input.note.trim() } : {}),
      })
      if (error) throw toAppError(error)
      return data as DirectResult
    },
    onSuccess: (res) => {
      if (res.result === 'linked') {
        void qc.invalidateQueries({ queryKey: linkageKeys.all })
        void qc.invalidateQueries({ queryKey: ['indicators'] })
      }
    },
  })
}

/* ── what made them eligible ──────────────────────────────────────────────── */

/**
 * The completed advisory sessions behind a linkage request.
 *
 * ── WHY THIS IS ON THE MATCHING SCREEN ──
 *
 * Since `0106` a request can only exist if the producer completed an advisory
 * on the MARKET track. That is a fact the system already holds, and the
 * coordinator approving the request should not have to go and look it up: the
 * screen shows which session, on which track, and when it was decided.
 *
 * It also makes the gate visible rather than implicit. Before 0106 the rule was
 * stated in the hint, in the public copy and in the queue intro, and enforced
 * nowhere -- a home-based completer could ask. Printing the qualifying session
 * is what would have made that obvious.
 *
 * Every track is returned, not just `market`. A producer who did both should be
 * seen to have done both, and filtering to the qualifying one here would make
 * this a second copy of the gate's rule -- which is the thing `0106` had to fix
 * in two places at once.
 */
export type AdvisoryQualification = {
  enrolmentId: string
  sessionTitle: string
  track: 'market' | 'home_based'
  decidedOn: string | null
  endDate: string
}

type QualificationSelect = {
  id: string
  decided_on: string | null
  advisory_session: { title: string; track: 'market' | 'home_based'; end_date: string }
}

export function useAdvisoryQualification(personId: string | undefined) {
  return useQuery({
    queryKey: [...linkageKeys.all, 'qualification', personId ?? ''],
    enabled: !!personId,
    queryFn: async (): Promise<AdvisoryQualification[]> => {
      const res = await supabase
        .from('advisory_enrolment')
        .select('id, decided_on, advisory_session!inner ( title, track, end_date )')
        .eq('person_id', personId!)
        .is('met_criteria', true)
        .is('deleted_at', null)
        .is('advisory_session.deleted_at', null)
        .order('decided_on', { ascending: false })
      return unwrapList(
        res as unknown as { data: QualificationSelect[] | null; error: unknown },
      ).map((r) => ({
        enrolmentId: r.id,
        sessionTitle: r.advisory_session.title,
        track: r.advisory_session.track,
        decidedOn: r.decided_on,
        endDate: r.advisory_session.end_date,
      }))
    },
  })
}
