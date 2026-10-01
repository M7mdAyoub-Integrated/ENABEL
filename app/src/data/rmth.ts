import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { RmthTable } from '../rmth/types'
import type { RefRow } from './refTables'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Ramtha's records (RMTH_Forms_and_Calculations_v2.xlsx, 0176-0181).
 *
 *  Reads go straight to the tables under RLS (the municipality gate does the
 *  scoping, 0177). Every write of a form goes through `save_rmth_record`
 *  (0178): one payload, one exception block, FORM-01's person resolved by
 *  national ID, the ticks of a multi-select replaced with a read-back, the
 *  rules over them checked. The only other writes are the three a
 *  coordinator makes on a record's page -- delete / restore, publishing an
 *  activity, restoring a deleted person -- each read back, because RLS
 *  filters an UPDATE it will not permit rather than refusing it. Nothing
 *  here computes an indicator.
 *
 *  Query keys are under ['rmth', table, ...] so a save invalidates the list,
 *  the record and every picker over that table -- the screen the user is
 *  standing on changes (CLAUDE.md, "the screen that denies a write that
 *  happened").
 *
 *  `supabase` is used through a loosely typed handle: seven tables, one code
 *  path, columns read by the generated definitions, so a regeneration of
 *  types/database.ts cannot change what these hooks do.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A row, loosely typed: the tables have different columns and the screens read them by definition. */
export type RmthRow = Record<string, unknown> & {
  id: string
  municipality_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type RmthOption = { question_code: string; option_id: string; option_other: string | null }

export type RmthPerson = {
  id: string
  national_id: string | null
  full_name: string
  sex: string | null
  deleted_at?: string | null
}

export type RmthRecord = {
  row: RmthRow
  options: RmthOption[]
  /** FORM-01's person, and the person a FORM-04 / -05 / -06 record names. */
  person: RmthPerson | null
}

/** The column a table's option rows point at it by (0177). */
export const OPTION_FK: Partial<Record<RmthTable, string>> = {
  rmth_activity: 'activity_id',
  rmth_participation: 'participation_id',
  rmth_followup: 'followup_id',
}

type AnyQuery = {
  select: (c: string) => AnyQuery
  eq: (c: string, v: unknown) => AnyQuery
  is: (c: string, v: null) => AnyQuery
  in: (c: string, v: unknown[]) => AnyQuery
  order: (c: string, o?: { ascending: boolean }) => AnyQuery
  update: (v: Record<string, unknown>) => AnyQuery
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  then: Promise<{ data: unknown; error: unknown }>['then']
}
type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
const db = supabase as unknown as { from: (t: string) => AnyQuery; rpc: Rpc }

async function rowsOf<T>(q: AnyQuery): Promise<T[]> {
  const res = await (q as unknown as Promise<{ data: T[] | null; error: unknown }>)
  return unwrapList(res)
}

/** An UPDATE by id, read back: zero rows is a refusal (RLS filters rather than refuses). */
async function updateOne(table: string, id: string, patch: Record<string, unknown>): Promise<string> {
  const res = await (db.from(table).update(patch).eq('id', id).select('id') as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>)
  if (res.error) throw toAppError(res.error)
  if (!res.data || res.data.length !== 1) throw toAppError({ code: '42501', message: 'forbidden' })
  return res.data[0]!.id
}

export const rmthKeys = {
  all: (table: RmthTable) => ['rmth', table] as const,
  list: (table: RmthTable, deleted: boolean) => ['rmth', table, 'list', deleted] as const,
  record: (table: RmthTable, id: string) => ['rmth', table, 'record', id] as const,
  picker: (table: RmthTable) => ['rmth', table, 'picker'] as const,
  register: () => ['rmth', 'rmth_beneficiary', 'register'] as const,
  ref: (list: string) => ['ref', `ref_rmth_${list}`] as const,
  person: (nid: string) => ['rmth', 'person', nid] as const,
}

/** One `ref_rmth_*` list: the same shape as every other ref_ table. */
export function rmthRefQuery(list: string) {
  return {
    queryKey: rmthKeys.ref(list),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<RefRow[]> =>
      rowsOf<RefRow>(
        db.from(`ref_rmth_${list}`)
          .select('id, code, label_en, label_ar, sort_order, allows_free_text')
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('sort_order'),
      ),
  }
}

/** Several lists at once, by name: useQueries, because one screen serves every form. */
export function useRmthRefs(lists: readonly string[]): Record<string, RefRow[]> {
  const results = useQueries({ queries: lists.map((n) => rmthRefQuery(n)) })
  const out: Record<string, RefRow[]> = {}
  lists.forEach((n, i) => { out[n] = (results[i]?.data as RefRow[] | undefined) ?? [] })
  return out
}

/** Every live record of a table, newest first; or the deleted ones. */
export function useRmthList(table: RmthTable, deleted = false) {
  return useQuery({
    queryKey: rmthKeys.list(table, deleted),
    staleTime: 15_000,
    queryFn: async (): Promise<RmthRow[]> => {
      let q = db.from(table).select('*')
      q = deleted ? q.order('deleted_at', { ascending: false }) : q.is('deleted_at', null)
      q = q.order('created_at', { ascending: false })
      return rowsOf<RmthRow>(q)
    },
  })
}

const PERSON_COLS = 'id, national_id, full_name, sex'

/** Everything a detail or edit screen needs about one record. */
export function useRmthRecord(table: RmthTable, id: string | undefined) {
  return useQuery({
    queryKey: rmthKeys.record(table, id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<RmthRecord> => {
      const head = await db.from(table).select('*').eq('id', id!).maybeSingle()
      if (head.error) throw toAppError(head.error)
      if (!head.data) throw toAppError({ code: 'PGRST116', message: 'not found' })
      const row = head.data as RmthRow
      const fk = OPTION_FK[table]
      const options = fk
        ? await rowsOf<RmthOption>(db.from(`${table}_option`).select('question_code, option_id, option_other').eq(fk, id!))
        : []
      let person: RmthPerson | null = null
      if (typeof row['person_id'] === 'string') {
        const p = await db.from('person').select(PERSON_COLS).eq('id', row['person_id']).maybeSingle()
        if (p.error) throw toAppError(p.error)
        person = (p.data as RmthPerson | null) ?? null
      }
      return { row, options, person }
    },
  })
}

/** Names and national IDs for the person columns of a list, one query for the page. */
export function usePersonNames(ids: string[]) {
  const key = ids.slice().sort().join(',')
  return useQuery({
    queryKey: ['people', 'names', 'rmth', key],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, RmthPerson>> => {
      const rows = await rowsOf<RmthPerson>(db.from('person').select(PERSON_COLS).in('id', ids))
      return Object.fromEntries(rows.map((r) => [r.id, r]))
    },
  })
}

/* ── FORM-01's lookup, and the register the other forms pick from ─────────── */

/** rmth_person_lookup (0178): the person, deleted or not, and their Ramtha registration, live or deleted. */
export type PersonLookup = {
  id: string
  national_id: string
  full_name: string
  sex: string | null
  deleted_at: string | null
  deleted_by: string | null
  beneficiary_id: string | null
  beneficiary_deleted_at: string | null
}

export function normaliseNid(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function useRmthPersonLookup(nid: string) {
  const norm = normaliseNid(nid)
  return useQuery({
    queryKey: rmthKeys.person(norm),
    enabled: /^\d{9}$/.test(norm),
    staleTime: 30_000,
    queryFn: async (): Promise<PersonLookup | null> => {
      const { data, error } = await db.rpc('rmth_person_lookup', { p_national_id: norm })
      if (error) throw toAppError(error)
      return ((data ?? []) as PersonLookup[])[0] ?? null
    },
  })
}

/** A person of the register: "prepopulated <PR-01>" on FORM-04, -05 and -06. */
export type RegisterPick = { id: string; name: string; nid: string }

export function useRegisterPicker(enabled = true) {
  return useQuery({
    queryKey: rmthKeys.register(),
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<RegisterPick[]> => {
      const rows = await rowsOf<{ person_id: string }>(db.from('rmth_beneficiary').select('person_id').is('deleted_at', null))
      const ids = Array.from(new Set(rows.map((r) => r.person_id)))
      if (!ids.length) return []
      const people = await rowsOf<RmthPerson>(db.from('person').select(PERSON_COLS).in('id', ids).is('deleted_at', null))
      return people
        .map((p) => ({ id: p.id, name: p.full_name, nid: p.national_id ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

/* ── pickers over projects and activities ─────────────────────────────────── */

/** A row of a record picker: the columns its label and the conditions read. */
export type RmthPick = { id: string; reference: string | null; raw: Record<string, unknown> }

const PICK_COLS: Partial<Record<RmthTable, string>> = {
  rmth_project: 'id, reference, approved_on, sub_sector, sector_id',
  rmth_activity: 'id, reference, category_id, networking_type_id, start_date, end_date',
}

export function useRmthPicker(table: RmthTable | undefined) {
  return useQuery({
    queryKey: rmthKeys.picker(table ?? 'rmth_project'),
    enabled: !!table && !!PICK_COLS[table],
    staleTime: 30_000,
    queryFn: async (): Promise<RmthPick[]> => {
      const rows = await rowsOf<Record<string, unknown>>(
        db.from(table!).select(PICK_COLS[table!]!).is('deleted_at', null).order('created_at', { ascending: false }),
      )
      return rows.map((r) => ({ id: r['id'] as string, reference: typeof r['reference'] === 'string' ? (r['reference'] as string) : null, raw: r }))
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type SavePayload = {
  id?: string
  row: Record<string, unknown>
  person?: { national_id: string; full_name?: string; sex?: string }
  option_questions?: string[]
  options?: RmthOption[]
}

export type SaveRefusal =
  | 'unknown_table' | 'unknown_column' | 'unknown_block' | 'not_found' | 'person_deleted'
  | 'already_registered' | 'registration_deleted' | 'invalid'

export type SaveResult =
  | { ok: true; id: string; reference: string | null; person_id?: string }
  | { ok: false; result: SaveRefusal; id?: string; column?: string; block?: string; person_id?: string; code?: string; constraint?: string | null; message?: string }

export function useSaveRmth(table: RmthTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', table, 'save'],
    retry: false,
    mutationFn: async (payload: SavePayload): Promise<SaveResult> => {
      const { data, error } = await db.rpc('save_rmth_record', { p_table: table, p: payload })
      if (error) throw toAppError(error)
      return data as SaveResult
    },
    onSuccess: (res) => {
      if (res.ok) {
        // the list, the record, every picker over this table, and the dashboard
        void qc.invalidateQueries({ queryKey: rmthKeys.all(table) })
        void qc.invalidateQueries({ queryKey: ['indicators'] })
        void qc.invalidateQueries({ queryKey: ['overview'] })
        // a registration may have created a person
        void qc.invalidateQueries({ queryKey: ['people'] })
        void qc.invalidateQueries({ queryKey: ['public', 'whatsOn'] })
      }
    },
  })
}

/** Soft delete / restore: a plain UPDATE under RLS and guard_soft_delete (coordinator only), read back. */
export function useSetRmthDeleted(table: RmthTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', table, 'deleted'],
    retry: false,
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      updateOne(table, id, { deleted_at: deleted ? new Date().toISOString() : null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rmthKeys.all(table) })
      // a registration deleted or restored moves every person-level picker
      void qc.invalidateQueries({ queryKey: rmthKeys.register() })
      void qc.invalidateQueries({ queryKey: ['rmth', 'person'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
      void qc.invalidateQueries({ queryKey: ['public', 'whatsOn'] })
    },
  })
}

/**
 * Publishing an activity on the public page (0181): `is_published` is a
 * plain column a coordinator flips on the activity's page, never a form
 * field, because the sheet does not ask for it.
 */
export function useSetRmthPublished() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', 'rmth_activity', 'published'],
    retry: false,
    mutationFn: ({ id, published }: { id: string; published: boolean }) => updateOne('rmth_activity', id, { is_published: published }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rmthKeys.all('rmth_activity') })
      void qc.invalidateQueries({ queryKey: ['public', 'whatsOn'] })
    },
  })
}

/**
 * Restoring a soft-deleted person the save refused on (restore_person, 0107:
 * a coordinator's, with its own read-back). The person is the platform's, not
 * Ramtha's, so the same function serves every municipality.
 */
export function useRestoreRmthPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', 'restore', 'person'],
    retry: false,
    mutationFn: async (personId: string): Promise<{ ok: boolean; result: string }> => {
      const { data, error } = await db.rpc('restore_person', { p_person_id: personId })
      if (error) throw toAppError(error)
      return data as { ok: boolean; result: string }
    },
    onSuccess: () => {
      // A restore moves figures and puts a row back into every list that filters deleted_at.
      void qc.invalidateQueries()
    },
  })
}
