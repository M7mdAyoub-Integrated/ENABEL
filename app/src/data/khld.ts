import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { KhldTable } from '../khld/types'
import type { RefRow } from './refTables'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Khalidiyah's records (Khaldia_2_reviewed.xlsx, 0156-0164).
 *
 *  Reads go straight to the tables under RLS (the municipality gate does the
 *  scoping, 0160). Every write of a form goes through `save_khld_record`
 *  (0161): one payload, one exception block, the person resolved by the ID
 *  type the form chose, the multi-select and partner rows replaced with a
 *  read-back, the rules over them checked. The only other writes are the
 *  four a coordinator makes on a record's page -- delete / restore, publish,
 *  a volunteer's review, restoring a deleted person -- each read back,
 *  because RLS filters an UPDATE it will not permit rather than refusing it.
 *  Nothing here computes an indicator.
 *
 *  Query keys are under ['khld', table, ...] so a save invalidates the list,
 *  the record and every picker over that table -- the screen the user is
 *  standing on changes (CLAUDE.md, "the screen that denies a write that
 *  happened").
 *
 *  `supabase` is used through a loosely typed handle: 23 tables, one code
 *  path, columns read by the generated definitions, so a regeneration of
 *  types/database.ts cannot change what these hooks do.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A row, loosely typed: the tables have different columns and the screens read them by definition. */
export type KhldRow = Record<string, unknown> & {
  id: string
  municipality_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type KhldOption = { question_code: string; option_id: string; option_other: string | null }

export type KhldPerson = {
  id: string
  national_id: string | null
  unhcr_number: string | null
  other_id_number: string | null
  full_name: string
  phone: string | null
  sex: string | null
  date_of_birth: string | null
}

export type KhldRecord = {
  row: KhldRow
  options: KhldOption[]
  /** F118 / F131: the partners at a meeting or on an activity. */
  partners: string[]
  /** The person the row names (FORM-12, -15, -17, and the person pickers of -18, -23, -24). */
  person: KhldPerson | null
}

/** The column a table's option and partner rows point at it by (catalogue.CHILD_FK, 0161). */
export const CHILD_FK: Partial<Record<KhldTable, string>> = {
  khld_meeting: 'meeting_id',
  khld_rehab_report: 'report_id',
  khld_campaign: 'campaign_id',
  khld_activity: 'activity_id',
  khld_activity_attendance: 'attendance_id',
  khld_volunteer: 'volunteer_id',
  khld_milestone_record: 'milestone_record_id',
}

/** The partner junction of the two tables that have one. */
export const PARTNER_JUNCTION: Partial<Record<KhldTable, string>> = {
  khld_meeting: 'khld_meeting_partner',
  khld_activity: 'khld_activity_partner',
}

/** The loosely-typed handle. */
type AnyQuery = {
  select: (c: string, o?: Record<string, unknown>) => AnyQuery
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

export const khldKeys = {
  all: (table: KhldTable) => ['khld', table] as const,
  list: (table: KhldTable, deleted: boolean) => ['khld', table, 'list', deleted] as const,
  record: (table: KhldTable, id: string) => ['khld', table, 'record', id] as const,
  picker: (table: KhldTable) => ['khld', table, 'picker'] as const,
  people: (table: KhldTable) => ['khld', table, 'people'] as const,
  ref: (list: string) => ['ref', `ref_khld_${list}`] as const,
  person: (idType: string, idNumber: string) => ['khld', 'person', idType, idNumber] as const,
}

/** One `ref_khld_*` list: the same shape as every other ref_ table. */
export function khldRefQuery(list: string) {
  return {
    queryKey: khldKeys.ref(list),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<RefRow[]> =>
      rowsOf<RefRow>(
        db.from(`ref_khld_${list}`)
          .select('id, code, label_en, label_ar, sort_order, allows_free_text')
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('sort_order'),
      ),
  }
}

export function useKhldRef(list: string | undefined) {
  return useQuery({ ...khldRefQuery(list ?? ''), enabled: !!list })
}

/** Several lists at once, by name: useQueries, because one screen serves every form. */
export function useKhldRefs(lists: readonly string[]): Record<string, RefRow[]> {
  const results = useQueries({ queries: lists.map((n) => khldRefQuery(n)) })
  const out: Record<string, RefRow[]> = {}
  lists.forEach((n, i) => { out[n] = (results[i]?.data as RefRow[] | undefined) ?? [] })
  return out
}

/** Every live record of a table, newest first; or the deleted ones. */
export function useKhldList(table: KhldTable, deleted = false) {
  return useQuery({
    queryKey: khldKeys.list(table, deleted),
    staleTime: 15_000,
    queryFn: async (): Promise<KhldRow[]> => {
      let q = db.from(table).select('*')
      q = deleted ? q.order('deleted_at', { ascending: false }) : q.is('deleted_at', null)
      q = q.order('created_at', { ascending: false })
      return rowsOf<KhldRow>(q)
    },
  })
}

const PERSON_COLS = 'id, national_id, unhcr_number, other_id_number, full_name, phone, sex, date_of_birth'

/** Everything a detail or edit screen needs about one record. */
export function useKhldRecord(table: KhldTable, id: string | undefined) {
  return useQuery({
    queryKey: khldKeys.record(table, id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<KhldRecord> => {
      const head = await db.from(table).select('*').eq('id', id!).maybeSingle()
      if (head.error) throw toAppError(head.error)
      if (!head.data) throw toAppError({ code: 'PGRST116', message: 'not found' })
      const row = head.data as KhldRow
      const fk = CHILD_FK[table]
      const options = fk && OPTION_TABLES.has(table)
        ? await rowsOf<KhldOption>(db.from(`${table}_option`).select('question_code, option_id, option_other').eq(fk, id!))
        : []
      const junction = PARTNER_JUNCTION[table]
      const partners = junction && fk
        ? (await rowsOf<{ partner_id: string }>(db.from(junction).select('partner_id').eq(fk, id!))).map((r) => r.partner_id)
        : []
      let person: KhldPerson | null = null
      if (typeof row['person_id'] === 'string') {
        const p = await db.from('person').select(PERSON_COLS).eq('id', row['person_id']).maybeSingle()
        if (p.error) throw toAppError(p.error)
        person = (p.data as KhldPerson | null) ?? null
      }
      return { row, options, partners, person }
    },
  })
}

/** The tables with a multi-select (khld_<table>_option, 0159-0160). */
const OPTION_TABLES = new Set<KhldTable>([
  'khld_rehab_report', 'khld_campaign', 'khld_activity_attendance', 'khld_volunteer', 'khld_milestone_record',
])

/* ── the person spine ─────────────────────────────────────────────────────── */

/** The three identifiers of ref_khld_id_type (F144, F151, F156). */
export type KhldIdType = 'national_id' | 'unhcr_number' | 'other_id'

export type PersonLookup = KhldPerson & { deleted_at: string | null; deleted_by: string | null }

/** The database's own normalisation (khld_ensure_person, 0161): digits for a national ID, else trimmed and upper-cased. */
export function normaliseIdNumber(idType: KhldIdType | '', raw: string): string {
  if (idType === 'national_id') return raw.replace(/\D/g, '')
  return raw.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function isCompleteId(idType: KhldIdType | '', norm: string): boolean {
  if (!idType) return false
  return idType === 'national_id' ? /^\d{9}$/.test(norm) : norm.length > 0
}

/** The identifier a person is known by, of the type given, and which type that is. */
export function identifierOf(p: KhldPerson): { type: KhldIdType; value: string } | null {
  if (p.national_id) return { type: 'national_id', value: p.national_id }
  if (p.unhcr_number) return { type: 'unhcr_number', value: p.unhcr_number }
  if (p.other_id_number) return { type: 'other_id', value: p.other_id_number }
  return null
}

/**
 * Who is behind an identifier, deleted or not (khld_person_lookup, 0161). A
 * soft-deleted match comes back with deleted_at and the deleter's name, which
 * is what the screen needs to offer restore instead of a refusal.
 */
export function useKhldPersonLookup(idType: KhldIdType | '', idNumber: string) {
  const norm = normaliseIdNumber(idType, idNumber)
  return useQuery({
    queryKey: khldKeys.person(idType, norm),
    enabled: isCompleteId(idType, norm),
    staleTime: 30_000,
    queryFn: async (): Promise<PersonLookup | null> => {
      const { data, error } = await db.rpc('khld_person_lookup', { p_id_type: idType, p_id_number: norm })
      if (error) throw toAppError(error)
      const rows = (data ?? []) as PersonLookup[]
      return rows[0] ?? null
    },
  })
}

/** Names for the person columns of a list, one query for the page. */
export function usePersonNames(ids: string[]) {
  const key = ids.slice().sort().join(',')
  return useQuery({
    queryKey: ['people', 'names', 'khld', key],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, KhldPerson>> => {
      const rows = await rowsOf<KhldPerson>(db.from('person').select(PERSON_COLS).in('id', ids))
      return Object.fromEntries(rows.map((r) => [r.id, r]))
    },
  })
}

/* ── pickers ──────────────────────────────────────────────────────────────── */

/** A row of a picker: id, reference, a name, a date, and the columns a filter reads. */
export type KhldPick = {
  id: string
  reference: string | null
  label: string
  /** The row's name alone: its title, or its person's name. */
  name: string
  date: string | null
  personId?: string
  raw: Record<string, unknown>
}

/** What names a row of each table a picker lists. */
export const PICK: Partial<Record<KhldTable, { title?: string; date?: string; person?: string; extra?: readonly string[] }>> = {
  khld_partner: { title: 'name' },
  khld_activity: { title: 'activity_name', date: 'start_date', extra: ['end_date'] },
  khld_campaign: { title: 'campaign_name', date: 'start_date', extra: ['end_date'] },
  khld_volunteer: { person: 'person_id', extra: ['application_status'] },
  khld_guidance_session: { title: 'title', date: 'start_date', extra: ['end_date'] },
  khld_market: { title: 'name', date: 'start_date', extra: ['end_date', 'applications_open', 'applications_close', 'status_id'] },
}

const HAS_REFERENCE = new Set<KhldTable>(['khld_activity', 'khld_campaign', 'khld_volunteer', 'khld_guidance_session', 'khld_market'])

export function useKhldPicker(table: KhldTable | undefined) {
  return useQuery({
    queryKey: khldKeys.picker(table ?? 'khld_activity'),
    enabled: !!table && !!PICK[table],
    staleTime: 30_000,
    queryFn: async (): Promise<KhldPick[]> => {
      const t = table!
      const p = PICK[t]!
      const cols = ['id', HAS_REFERENCE.has(t) ? 'reference' : null, p.title ?? null, p.date ?? null, p.person ?? null, ...(p.extra ?? [])]
        .filter((c): c is string => !!c)
      const rows = await rowsOf<Record<string, unknown>>(
        db.from(t).select(Array.from(new Set(cols)).join(', ')).is('deleted_at', null).order('created_at', { ascending: false }),
      )
      let names: Record<string, KhldPerson> = {}
      if (p.person) {
        const ids = Array.from(new Set(rows.map((r) => r[p.person!]).filter((v): v is string => typeof v === 'string')))
        if (ids.length) {
          const people = await rowsOf<KhldPerson>(db.from('person').select(PERSON_COLS).in('id', ids))
          names = Object.fromEntries(people.map((x) => [x.id, x]))
        }
      }
      return rows.map((r) => {
        const ref = typeof r['reference'] === 'string' ? (r['reference'] as string) : null
        const title = p.title && typeof r[p.title] === 'string' ? (r[p.title] as string) : ''
        const personId = p.person && typeof r[p.person] === 'string' ? (r[p.person] as string) : undefined
        const who = personId ? names[personId]?.full_name ?? '' : ''
        const date = p.date && typeof r[p.date] === 'string' ? (r[p.date] as string) : null
        const label = [ref, who || title].filter(Boolean).join(' · ') || (r['id'] as string).slice(0, 8)
        return { id: r['id'] as string, reference: ref, label, name: who || title, date, ...(personId ? { personId } : {}), raw: r }
      })
    },
  })
}

/** A person picked from another form's registrations: one entry per live person of that table. */
export type KhldPersonPick = { id: string; label: string; identifier: string }

export function usePersonPicker(source: KhldTable | undefined) {
  return useQuery({
    queryKey: khldKeys.people(source ?? 'khld_vendor_application'),
    enabled: !!source,
    staleTime: 30_000,
    queryFn: async (): Promise<KhldPersonPick[]> => {
      const rows = await rowsOf<{ person_id: string }>(db.from(source!).select('person_id').is('deleted_at', null))
      const ids = Array.from(new Set(rows.map((r) => r.person_id)))
      if (!ids.length) return []
      const people = await rowsOf<KhldPerson>(db.from('person').select(PERSON_COLS).in('id', ids).is('deleted_at', null))
      return people
        .map((p) => ({ id: p.id, label: p.full_name, identifier: identifierOf(p)?.value ?? '' }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type PersonPayload = {
  id_number: string
  full_name?: string
  phone?: string
  sex?: string
  date_of_birth?: string
}

export type SavePayload = {
  id?: string
  row: Record<string, unknown>
  person?: PersonPayload
  option_questions?: string[]
  options?: KhldOption[]
  partners?: string[]
}

export type SaveRefusal = 'unknown_table' | 'unknown_column' | 'unknown_block' | 'not_found' | 'person_deleted' | 'invalid'

export type SaveResult =
  | { ok: true; id: string; reference: string | null; person_id?: string }
  | { ok: false; result: SaveRefusal; column?: string; block?: string; person_id?: string; code?: string; constraint?: string | null; message?: string }

export function useSaveKhld(table: KhldTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', table, 'save'],
    retry: false,
    mutationFn: async (payload: SavePayload): Promise<SaveResult> => {
      const { data, error } = await db.rpc('save_khld_record', { p_table: table, p: payload })
      if (error) throw toAppError(error)
      return data as SaveResult
    },
    onSuccess: (res) => {
      if (res.ok) {
        // the list, the record, every picker over this table, and the dashboard
        void qc.invalidateQueries({ queryKey: khldKeys.all(table) })
        void qc.invalidateQueries({ queryKey: ['indicators'] })
        void qc.invalidateQueries({ queryKey: ['overview'] })
        // a person-level save may have created a person
        void qc.invalidateQueries({ queryKey: ['people'] })
      }
    },
  })
}

/** Soft delete / restore: a plain UPDATE under RLS and guard_soft_delete (coordinator only), read back. */
export function useSetKhldDeleted(table: KhldTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', table, 'deleted'],
    retry: false,
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      updateOne(table, id, { deleted_at: deleted ? new Date().toISOString() : null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khldKeys.all(table) })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
      void qc.invalidateQueries({ queryKey: ['public', 'whatsOn'] })
    },
  })
}

/**
 * Publishing an activity or a market on the public page (0163's
 * v_public_khld_whats_on): `is_published` is a plain column a coordinator
 * flips, never a form field, because no sheet asks for it.
 */
export function useSetKhldPublished(table: 'khld_activity' | 'khld_market') {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', table, 'published'],
    retry: false,
    mutationFn: ({ id, published }: { id: string; published: boolean }) => updateOne(table, id, { is_published: published }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khldKeys.all(table) })
      void qc.invalidateQueries({ queryKey: ['public', 'whatsOn'] })
    },
  })
}

export type VolunteerStatus = 'submitted' | 'approved' | 'rejected'

/**
 * A volunteer registration's review (0159): application_status, stamped with
 * who and when by khld_stamp_review. Only an approved registration counts
 * (F2, SO3-0), so the figures move with it.
 */
export function useSetVolunteerStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', 'khld_volunteer', 'review'],
    retry: false,
    mutationFn: ({ id, status }: { id: string; status: VolunteerStatus }) => updateOne('khld_volunteer', id, { application_status: status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khldKeys.all('khld_volunteer') })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

/**
 * Restoring a soft-deleted person the save refused on (restore_person, 0107:
 * a coordinator's, with its own read-back). The person is the platform's, not
 * Khalidiyah's, so the same function serves all three municipalities.
 */
export function useRestoreKhldPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', 'restore', 'person'],
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
