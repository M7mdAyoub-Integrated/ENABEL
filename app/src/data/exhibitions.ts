import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'
import { qk } from './queryClient'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module 2 — Exhibitions and markets.
 *
 *  One table, no junctions. The interesting parts are derived rather than
 *  stored:
 *
 *    duration     end_date - start_date + 1, inclusive of both days. A one-day
 *                 market is 1 day, not 0. The prototype's form shows a Duration
 *                 field and calls it "calculated from the dates, editable" --
 *                 but there is no duration column, so what the form edits is a
 *                 display value only. Not stored, and deliberately so: two
 *                 sources for the same fact drift.
 *
 *    held         end_date < today. Only events already held count towards
 *                 E0.1, which is why `v_ind_e0_1` uses the same rule. Computing
 *                 "held" here rather than storing a flag means nobody has to
 *                 remember to flip it.
 *
 *    booths taken derived from exhibition_registration, never stored. See
 *                 `v_upcoming_exhibitions`.
 *
 *  Two check constraints will refuse bad input: `exhibition_dates` (end >=
 *  start) and `exhibition_booth_capacity_check` (capacity > 0). The form
 *  validates neither itself -- the database is the authority and its refusal is
 *  mapped to a readable message.
 *
 *  Not in the offline queue: `exhibition` has no `client_uuid`, so a replay
 *  could not be de-duplicated. Markets are scheduled at a desk.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ExhibitionRow = {
  id: string
  name: string
  startDate: string
  endDate: string
  location: string
  boothCapacity: number
  externalSponsor: string | null
  /** Goes public exactly as typed. See 0043. */
  description: string | null
  focalPoint: string | null
  applicationOpensOn: string | null
  applicationClosesOn: string | null
  isPublished: boolean
  isCancelled: boolean
  createdAt: string
  /** Derived, not stored. */
  boothsTaken: number
  boothsPending: number
  hasEnded: boolean
}

type ExhibitionSelect = {
  id: string
  name: string
  start_date: string
  end_date: string
  location: string
  booth_capacity: number
  external_sponsor: string | null
  /** Table-only. v_upcoming_exhibitions does not select these. */
  description?: string | null
  focal_point?: string | null
  application_opens_on?: string | null
  application_closes_on?: string | null
  is_published?: boolean
  is_cancelled: boolean
  created_at: string
  booths_taken: number
  booths_pending: number
  has_ended: boolean
}

/**
 * Read the list.
 *
 * From `v_upcoming_exhibitions` rather than the table, because that view
 * already derives the booth counts from live registrations. Counting them in
 * the browser would mean pulling every registration row to display one number,
 * and would drift the moment an approval landed elsewhere.
 */
export function useExhibitions(enabled = true) {
  return useQuery({
    queryKey: qk.exhibitions.list(),
    enabled,
    queryFn: async (): Promise<ExhibitionRow[]> => {
      const res = await supabase
        .from('v_upcoming_exhibitions')
        .select('*')
        .order('start_date', { ascending: false })
      const rows = unwrapList(
        res as unknown as { data: ExhibitionSelect[] | null; error: unknown },
      )
      return rows.map(toRow)
    },
  })
}

function toRow(r: ExhibitionSelect): ExhibitionRow {
  return {
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    location: r.location,
    boothCapacity: r.booth_capacity,
    externalSponsor: r.external_sponsor ?? null,
    description: r.description ?? null,
    focalPoint: r.focal_point ?? null,
    applicationOpensOn: r.application_opens_on ?? null,
    applicationClosesOn: r.application_closes_on ?? null,
    isPublished: r.is_published ?? false,
    isCancelled: r.is_cancelled ?? false,
    createdAt: r.created_at ?? '',
    boothsTaken: r.booths_taken ?? 0,
    boothsPending: r.booths_pending ?? 0,
    hasEnded: r.has_ended,
  }
}

export function useExhibition(id: string | undefined) {
  return useQuery({
    queryKey: qk.exhibitions.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ExhibitionRow> => {
      // The view carries the booth counts; the table carries the sponsor and
      // the cancelled flag, which the view does not select. Both, then merged.
      const [viewRes, rowRes] = await Promise.all([
        supabase.from('v_upcoming_exhibitions').select('*').eq('id', id!).maybeSingle(),
        supabase
          .from('exhibition')
          // These live on the table, not the view. Every one of them has to be
          // read here or the edit form loads them empty and the next save
          // writes that emptiness back -- silently stripping a published
          // exhibition's description and contact.
          .select(
            'external_sponsor, description, focal_point, application_opens_on, ' +
              'application_closes_on, is_published, is_cancelled, created_at',
          )
          .eq('id', id!)
          .is('deleted_at', null)
          .maybeSingle(),
      ])
      const v = unwrap(viewRes as unknown as { data: ExhibitionSelect | null; error: unknown })
      const extra = rowRes.error
        ? null
        : (rowRes.data as {
            external_sponsor: string | null
            description: string | null
            focal_point: string | null
            application_opens_on: string | null
            application_closes_on: string | null
            is_published: boolean
            is_cancelled: boolean
            created_at: string
          } | null)
      return toRow({
        ...v,
        external_sponsor: extra?.external_sponsor ?? null,
        description: extra?.description ?? null,
        focal_point: extra?.focal_point ?? null,
        application_opens_on: extra?.application_opens_on ?? null,
        application_closes_on: extra?.application_closes_on ?? null,
        is_published: extra?.is_published ?? false,
        is_cancelled: extra?.is_cancelled ?? false,
        created_at: extra?.created_at ?? '',
      })
    },
  })
}

/** Inclusive of both end days: a single-day market is 1 day, not 0. */
export function durationDays(startDate: string, endDate: string): number {
  const a = new Date(startDate).getTime()
  const b = new Date(endDate).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type ExhibitionInput = {
  name: string
  startDate: string
  endDate: string
  location: string
  boothCapacity: number
  externalSponsor: string | null
  description: string | null
  focalPoint: string | null
  applicationOpensOn: string | null
  applicationClosesOn: string | null
}

/**
 * NO DURATION FIELD, and that is deliberate.
 *
 * A training asks for hours because a three-day course may be twelve hours of
 * teaching -- the dates say when, the hours say how much. A market runs for its
 * dates; days derived from them (durationDays) is the real unit, and an hours
 * field would be a number nobody could answer and nothing would read.
 *
 * `is_published` is also absent, as it is on the training form. Publishing is a
 * separate deliberate action.
 */

function payload(input: ExhibitionInput) {
  return {
    name: input.name.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    location: input.location.trim(),
    booth_capacity: input.boothCapacity,
    external_sponsor: input.externalSponsor?.trim() || null,
    description: input.description?.trim() || null,
    focal_point: input.focalPoint?.trim() || null,
    application_opens_on: input.applicationOpensOn,
    application_closes_on: input.applicationClosesOn,
  }
}

export function useCreateExhibition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExhibitionInput) => {
      const res = await supabase.from('exhibition').insert(payload(input)).select('id').single()
      const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
      return row.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.exhibitions.all })
    },
  })
}

export function useUpdateExhibition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ExhibitionInput }) => {
      const res = await supabase.from('exhibition').update(payload(input)).eq('id', id).select('id')
      if (res.error) throw toAppError(res.error)
      // Zero rows back means RLS filtered the row out of the UPDATE: the write
      // did not happen, and reporting success would be a lie.
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: qk.exhibitions.list() })
      const previous = qc.getQueryData<ExhibitionRow[]>(qk.exhibitions.list())
      qc.setQueryData<ExhibitionRow[]>(qk.exhibitions.list(), (cur) =>
        (cur ?? []).map((r) =>
          r.id === id
            ? {
                ...r,
                name: input.name,
                startDate: input.startDate,
                endDate: input.endDate,
                location: input.location,
                boothCapacity: input.boothCapacity,
                externalSponsor: input.externalSponsor,
              }
            : r,
        ),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.exhibitions.list(), ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.exhibitions.all })
    },
  })
}

/** Soft delete. Never a hard delete -- CLAUDE.md rule 2. */
export function useDeleteExhibition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('exhibition')
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
      await qc.cancelQueries({ queryKey: qk.exhibitions.list() })
      const previous = qc.getQueryData<ExhibitionRow[]>(qk.exhibitions.list())
      qc.setQueryData<ExhibitionRow[]>(qk.exhibitions.list(), (cur) =>
        (cur ?? []).filter((r) => r.id !== id),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.exhibitions.list(), ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.exhibitions.all })
    },
  })
}

/* ── the municipality side: publishing and registrations ─────────────────── */

/**
 * Registrations for one market, with everything the approval decision needs.
 *
 * ── APPROVAL IS THE ACTION THAT MOVES E0.2 ──
 *
 * `v_ind_e0_2` counts DISTINCT people with `status = 'approved'`. A
 * registration sitting at `submitted` counts for nothing, so approving is not
 * tidying a queue -- it is the moment a figure in the donor return changes.
 * The screen says so rather than letting a coordinator assume that applying
 * was enough.
 *
 * `is_first_time` is DERIVED by trg_exhibition_registration_check from prior
 * approved registrations. It is displayed and never offered as a field: asking
 * someone to remember would produce a worse answer than the database already
 * has.
 */
export type RegistrationRow = {
  id: string
  personId: string
  fullName: string
  nationalId: string
  village: string | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  isFirstTime: boolean
  submittedByParticipant: boolean
  producerType: string | null
  products: string[]
}

export function useExhibitionRegistrations(exhibitionId: string | undefined, locale: string) {
  return useQuery({
    queryKey: qk.exhibitions.detail(exhibitionId ?? '').concat('registrations'),
    enabled: !!exhibitionId,
    queryFn: async (): Promise<RegistrationRow[]> => {
      const res = await supabase
        .from('exhibition_registration')
        .select(
          'id, person_id, status, is_first_time, submitted_by_participant, ' +
            'person:person_id (full_name, national_id, village), ' +
            'producer:producer_type_id (label_en, label_ar), ' +
            'exhibition_registration_product (ref_product (label_en, label_ar))',
        )
        .eq('exhibition_id', exhibitionId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      type Raw = {
        id: string
        person_id: string
        status: RegistrationRow['status']
        is_first_time: boolean
        submitted_by_participant: boolean
        person: { full_name: string; national_id: string; village: string | null } | null
        producer: { label_en: string; label_ar: string | null } | null
        exhibition_registration_product: {
          ref_product: { label_en: string; label_ar: string | null } | null
        }[]
      }
      const rows = unwrapList(res as unknown as { data: Raw[] | null; error: unknown })
      const lbl = (r: { label_en: string; label_ar: string | null } | null) =>
        r ? (locale.startsWith('ar') ? r.label_ar || r.label_en : r.label_en) : null
      return rows.map((r) => ({
        id: r.id,
        personId: r.person_id,
        fullName: r.person?.full_name ?? '',
        nationalId: r.person?.national_id ?? '',
        village: r.person?.village ?? null,
        status: r.status,
        isFirstTime: r.is_first_time,
        submittedByParticipant: r.submitted_by_participant,
        producerType: lbl(r.producer),
        products: r.exhibition_registration_product
          .map((p) => lbl(p.ref_product))
          .filter((x): x is string => !!x),
      }))
    },
  })
}

/**
 * Approve or reject.
 *
 * The database refuses this for anyone but a coordinator
 * (guard_registration_status), and refuses an approval that would exceed booth
 * capacity or land on an ended market (trg_exhibition_registration_check).
 * None of that is re-implemented here -- the screen surfaces the refusal in
 * plain language and does not try to predict it.
 */
export function useDecideRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      id: string
      exhibitionId: string
      status: 'approved' | 'rejected' | 'submitted'
    }) => {
      const res = await supabase
        .from('exhibition_registration')
        .update({ status: v.status })
        .eq('id', v.id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return v.id
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.exhibitions.detail(v.exhibitionId) })
      void qc.invalidateQueries({ queryKey: qk.exhibitions.list() })
      // Approving moves E0.2.
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

/**
 * What is missing before this market can go public.
 *
 * The GATE is shared with training; the "needs details" badge deliberately is
 * not. A training created from a completion is incomplete by construction and
 * belongs in a queue to clear. Most incomplete exhibitions are past markets
 * recorded for E0.1 that were never meant to have a public page -- badging
 * those would flag rows that are fine forever, and a badge that is usually
 * wrong is one people learn to ignore.
 */
export function missingForExhibitionPublish(e: ExhibitionRow): string[] {
  const gaps: string[] = []
  if (!e.description) gaps.push('description')
  if (!e.focalPoint) gaps.push('focalPoint')
  return gaps
}

export function usePublishExhibition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; on: boolean }) => {
      const res = await supabase
        .from('exhibition')
        .update({ is_published: v.on })
        .eq('id', v.id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return v.id
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.exhibitions.detail(v.id) })
      void qc.invalidateQueries({ queryKey: qk.exhibitions.list() })
      void qc.invalidateQueries({ queryKey: ['public', 'opportunities'] })
    },
  })
}
