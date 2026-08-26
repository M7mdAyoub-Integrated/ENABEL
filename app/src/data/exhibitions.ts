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
          .select('external_sponsor, is_cancelled, created_at')
          .eq('id', id!)
          .is('deleted_at', null)
          .maybeSingle(),
      ])
      const v = unwrap(viewRes as unknown as { data: ExhibitionSelect | null; error: unknown })
      const extra = rowRes.error
        ? null
        : (rowRes.data as { external_sponsor: string | null; is_cancelled: boolean; created_at: string } | null)
      return toRow({
        ...v,
        external_sponsor: extra?.external_sponsor ?? null,
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
}

function payload(input: ExhibitionInput) {
  return {
    name: input.name.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    location: input.location.trim(),
    booth_capacity: input.boothCapacity,
    external_sponsor: input.externalSponsor?.trim() || null,
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
