import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { RmthTable } from '../rmth/types'
import type { RefRow } from './refTables'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Ramtha's records.
 *
 *  Reads go straight to the tables under RLS (the municipality gate does the
 *  scoping, 0125). Every write goes through `save_rmth_record` (0127): one
 *  payload, one exception block, the derivations the sheets ask for, and a
 *  read-back on every delete. Nothing here computes an indicator.
 *
 *  Query keys are under ['rmth', table, ...] so a save invalidates the list,
 *  the record, and every picker that lists that table -- the screen the user
 *  is standing on changes (CLAUDE.md, "the screen that denies a write that
 *  happened").
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A header row, loosely typed: the ten tables have different columns and the screens read them by definition. */
export type RmthRow = Record<string, unknown> & {
  id: string
  municipality_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type RmthOption = {
  question_code: string
  option_id: string
  option_other: string | null
}

export type RmthSupportRow = { component_id: string; rating_id: string; component_other: string | null }
export type RmthServiceRow = { service_id: string; began_on: string | null }

export type RmthRecord = {
  row: RmthRow
  options: RmthOption[]
  support: RmthSupportRow[]
  servicesLive: RmthServiceRow[]
  proposalIds: string[]
  /** A person-level record's person, when it has one. */
  person: { id: string; national_id: string; full_name: string; phone: string | null; sex: string | null } | null
  /** Ramtha option rows resolved to labels for the detail screen. */
}

const OPTION_TABLE: Record<RmthTable, { table: string; fk: string } | null> = {
  rmth_event: { table: 'rmth_event_option', fk: 'event_id' },
  rmth_proposal: { table: 'rmth_proposal_option', fk: 'proposal_id' },
  rmth_training_programme: { table: 'rmth_training_programme_option', fk: 'programme_id' },
  rmth_training_cycle: { table: 'rmth_training_cycle_option', fk: 'cycle_id' },
  rmth_training_enrolment: { table: 'rmth_training_enrolment_option', fk: 'enrolment_id' },
  rmth_project_implementer: { table: 'rmth_project_implementer_option', fk: 'implementer_id' },
  rmth_incubator: { table: 'rmth_incubator_option', fk: 'incubator_id' },
  rmth_enterprise: null,
  rmth_incubation_service: { table: 'rmth_incubation_service_option', fk: 'service_id' },
  rmth_outcome_survey: { table: 'rmth_outcome_survey_option', fk: 'survey_id' },
}

/** The loosely-typed handle: ten tables, one code path, columns read by definition. */
type AnyQuery = {
  select: (c: string) => AnyQuery
  eq: (c: string, v: unknown) => AnyQuery
  is: (c: string, v: null) => AnyQuery
  in: (c: string, v: unknown[]) => AnyQuery
  order: (c: string, o?: { ascending: boolean }) => AnyQuery
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  then: Promise<{ data: unknown; error: unknown }>['then']
}
const db = supabase as unknown as { from: (t: string) => AnyQuery }

export const rmthKeys = {
  all: (table: RmthTable) => ['rmth', table] as const,
  list: (table: RmthTable, filter: Readonly<Record<string, string>>, deleted: boolean) =>
    ['rmth', table, 'list', filter, deleted] as const,
  record: (table: RmthTable, id: string) => ['rmth', table, 'record', id] as const,
  picker: (table: RmthTable, kind: Readonly<Record<string, string>> | undefined) =>
    ['rmth', table, 'picker', kind ?? {}] as const,
  ref: (list: string) => ['ref', `ref_rmth_${list}`] as const,
}

/** One `ref_rmth_*` list: same shape as every other ref_ table. */
export function rmthRefQuery(list: string) {
  return {
    queryKey: rmthKeys.ref(list),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<RefRow[]> => {
      const res = await (db
        .from(`ref_rmth_${list}`)
        .select('id, code, label_en, label_ar, sort_order, allows_free_text')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order') as unknown as Promise<{ data: RefRow[] | null; error: unknown }>)
      return unwrapList(res)
    },
  }
}

export function useRmthRef(list: string | undefined) {
  return useQuery({ ...rmthRefQuery(list ?? ''), enabled: !!list })
}

/** Every live record of a table for one form's kind, newest first. */
export function useRmthList(table: RmthTable, filter: Readonly<Record<string, string>>, deleted = false) {
  return useQuery({
    queryKey: rmthKeys.list(table, filter, deleted),
    staleTime: 15_000,
    queryFn: async (): Promise<RmthRow[]> => {
      let q = db.from(table).select('*')
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v)
      q = deleted ? q.order('deleted_at', { ascending: false }) : q.is('deleted_at', null)
      q = q.order('created_at', { ascending: false })
      const res = await (q as unknown as Promise<{ data: RmthRow[] | null; error: unknown }>)
      return unwrapList(res)
    },
  })
}

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

      const opt = OPTION_TABLE[table]
      let options: RmthOption[] = []
      if (opt) {
        const res = await (db
          .from(opt.table)
          .select('question_code, option_id, option_other')
          .eq(opt.fk, id!) as unknown as Promise<{ data: RmthOption[] | null; error: unknown }>)
        options = unwrapList(res)
      }

      let support: RmthSupportRow[] = []
      let servicesLive: RmthServiceRow[] = []
      let proposalIds: string[] = []
      if (table === 'rmth_project_implementer') {
        support = unwrapList(await (db.from('rmth_implementer_support').select('component_id, rating_id, component_other').eq('implementer_id', id!) as unknown as Promise<{ data: RmthSupportRow[] | null; error: unknown }>))
        const links = unwrapList(await (db.from('rmth_project_implementer_proposal').select('proposal_id').eq('implementer_id', id!) as unknown as Promise<{ data: { proposal_id: string }[] | null; error: unknown }>))
        proposalIds = links.map((l) => l.proposal_id)
      }
      if (table === 'rmth_incubator') {
        servicesLive = unwrapList(await (db.from('rmth_incubator_service_live').select('service_id, began_on').eq('incubator_id', id!) as unknown as Promise<{ data: RmthServiceRow[] | null; error: unknown }>))
      }
      if (table === 'rmth_training_programme') {
        const links = unwrapList(await (db.from('rmth_training_programme_proposal').select('proposal_id').eq('programme_id', id!) as unknown as Promise<{ data: { proposal_id: string }[] | null; error: unknown }>))
        proposalIds = links.map((l) => l.proposal_id)
      }

      let person: RmthRecord['person'] = null
      if (typeof row['person_id'] === 'string') {
        const p = await db.from('person').select('id, national_id, full_name, phone, sex').eq('id', row['person_id']).maybeSingle()
        if (p.error) throw toAppError(p.error)
        person = (p.data as RmthRecord['person']) ?? null
      }

      return { row, options, support, servicesLive, proposalIds, person }
    },
  })
}

/** Rows of a table for a picker: id, reference, a title, a date. Live only. */
export type RmthPick = { id: string; reference: string | null; label: string; date: string | null }

const PICK_TITLE: Record<RmthTable, string> = {
  rmth_event: 'title',
  rmth_proposal: 'title',
  rmth_training_programme: 'title',
  rmth_training_cycle: 'title',
  rmth_training_enrolment: 'id',
  rmth_project_implementer: 'entity_name',
  rmth_incubator: 'name',
  rmth_enterprise: 'name',
  rmth_incubation_service: 'id',
  rmth_outcome_survey: 'id',
}
const PICK_DATE: Partial<Record<RmthTable, string>> = {
  rmth_event: 'start_date',
  rmth_proposal: 'submitted_on',
  rmth_training_cycle: 'start_date',
}

export function useRmthPicker(table: RmthTable | undefined, kind: Readonly<Record<string, string>> | undefined) {
  return useQuery({
    queryKey: rmthKeys.picker(table ?? 'rmth_event', kind),
    enabled: !!table,
    staleTime: 30_000,
    queryFn: async (): Promise<RmthPick[]> => {
      const t = table!
      const titleCol = PICK_TITLE[t]
      const dateCol = PICK_DATE[t]
      const cols = ['id', 'reference', titleCol, dateCol, t === 'rmth_training_cycle' ? 'programme_id' : null, t === 'rmth_training_cycle' ? 'cycle_no' : null]
        .filter((c): c is string => !!c)
      let q = db.from(t).select(Array.from(new Set(cols)).join(', ')).is('deleted_at', null)
      for (const [k, v] of Object.entries(kind ?? {})) q = q.eq(k, v)
      q = q.order('created_at', { ascending: false })
      const res = await (q as unknown as Promise<{ data: Record<string, unknown>[] | null; error: unknown }>)
      const rows = unwrapList(res)
      // an entrepreneurship delivery has no reference of its own: name it by its programme and cycle number
      let programmes: Record<string, string> = {}
      if (t === 'rmth_training_cycle' && rows.some((r) => r['programme_id'])) {
        const ids = Array.from(new Set(rows.map((r) => r['programme_id']).filter((v): v is string => typeof v === 'string')))
        const pr = unwrapList(await (db.from('rmth_training_programme').select('id, reference, title').in('id', ids) as unknown as Promise<{ data: { id: string; reference: string | null; title: string }[] | null; error: unknown }>))
        programmes = Object.fromEntries(pr.map((p) => [p.id, `${p.reference ?? ''} ${p.title}`.trim()]))
      }
      return rows.map((r) => {
        const title = typeof r[titleCol] === 'string' ? (r[titleCol] as string) : ''
        const ref = typeof r['reference'] === 'string' ? (r['reference'] as string) : null
        const prog = typeof r['programme_id'] === 'string' ? programmes[r['programme_id'] as string] : undefined
        const label = prog ? `${prog} · #${String(r['cycle_no'] ?? '')}` : [ref, title].filter(Boolean).join(' · ') || (r['id'] as string)
        return {
          id: r['id'] as string,
          reference: ref,
          label,
          date: dateCol && typeof r[dateCol] === 'string' ? (r[dateCol] as string) : null,
        }
      })
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type SavePayload = {
  id?: string
  row: Record<string, unknown>
  person?: { national_id: string; full_name?: string; phone?: string; sex?: string; age_years?: number | null }
  option_questions?: string[]
  options?: RmthOption[]
  support?: RmthSupportRow[]
  services_live?: RmthServiceRow[]
  proposal_ids?: string[]
}

export type SaveResult =
  | { ok: true; id: string; reference: string | null }
  | { ok: false; result: 'unknown_table' | 'unknown_column' | 'not_found' | 'person_deleted' | 'invalid'; column?: string; person_id?: string; code?: string; constraint?: string | null; message?: string }

export function useSaveRmth(table: RmthTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', table, 'save'],
    retry: false,
    mutationFn: async (payload: SavePayload): Promise<SaveResult> => {
      const { data, error } = await supabase.rpc('save_rmth_record', {
        p_table: table,
        p: payload as unknown as never,
      })
      if (error) throw toAppError(error)
      return data as unknown as SaveResult
    },
    onSuccess: (res) => {
      if (res.ok) {
        // the list, the record, every picker over this table, and the dashboard
        void qc.invalidateQueries({ queryKey: rmthKeys.all(table) })
        void qc.invalidateQueries({ queryKey: ['indicators'] })
        void qc.invalidateQueries({ queryKey: ['overview'] })
        // a person-level save may have created a person
        void qc.invalidateQueries({ queryKey: ['people'] })
      }
    },
  })
}

/** Soft delete / restore, a plain UPDATE under RLS and guard_soft_delete (coordinator only). */
export function useSetRmthDeleted(table: RmthTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['rmth', table, 'deleted'],
    retry: false,
    mutationFn: async ({ id, deleted }: { id: string; deleted: boolean }) => {
      const res = await (supabase
        .from(table)
        .update({ deleted_at: deleted ? new Date().toISOString() : null } as never)
        .eq('id', id)
        .select('id') as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>)
      if (res.error) throw toAppError(res.error)
      // RLS filters rather than refuses: a zero-row update is a refusal
      if (!res.data || res.data.length !== 1) throw toAppError({ code: '42501', message: 'forbidden' })
      return res.data[0]!.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rmthKeys.all(table) })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

/** Creates an enterprise from a picker ("New enterprise"), through the same save path. */
export function useCreateEnterprise() {
  const save = useSaveRmth('rmth_enterprise')
  return save
}

/* ── evidence ─────────────────────────────────────────────────────────────── */

export type Attachment = {
  id: string
  entity_type: string
  entity_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_at: string
  deleted_at: string | null
}

export function useAttachments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', entityType, entityId ?? ''],
    enabled: !!entityId,
    queryFn: async (): Promise<Attachment[]> => {
      const res = await (db
        .from('attachment')
        .select('id, entity_type, entity_id, storage_path, file_name, mime_type, size_bytes, uploaded_at, deleted_at')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false }) as unknown as Promise<{ data: Attachment[] | null; error: unknown }>)
      return unwrapList(res)
    },
  })
}

/**
 * Upload: the object first, under <municipality>/<entity_type>/<entity_id>/,
 * then the row. If the row is refused the object is removed again, so the
 * bucket never holds a file no row points at.
 */
export function useUploadAttachment(entityType: string, entityId: string, municipalityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['attachments', 'upload', entityType, entityId],
    retry: false,
    mutationFn: async (file: File) => {
      const safe = file.name.replace(/[^\w.\-()؀-ۿ ]+/g, '_').slice(0, 120)
      const path = `${municipalityId}/${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`
      const up = await supabase.storage.from('evidence').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
      if (up.error) throw toAppError({ code: 'storage', message: up.error.message })
      const ins = await (supabase
        .from('attachment')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          municipality_id: municipalityId,
        } as never)
        .select('id') as unknown as Promise<{ data: { id: string }[] | null; error: { message: string; code?: string } | null }>)
      if (ins.error || !ins.data?.length) {
        await supabase.storage.from('evidence').remove([path])
        throw toAppError(ins.error ?? { code: '42501', message: 'forbidden' })
      }
      return ins.data[0]!.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
    },
  })
}

/** A short-lived signed URL to open the file. */
export async function attachmentUrl(path: string): Promise<string> {
  const res = await supabase.storage.from('evidence').createSignedUrl(path, 60)
  if (res.error || !res.data) throw toAppError({ code: 'storage', message: res.error?.message ?? 'no url' })
  return res.data.signedUrl
}

/** Remove: soft-delete the row (coordinator, guard_soft_delete), then the object. */
export function useRemoveAttachment(entityType: string, entityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['attachments', 'remove', entityType, entityId],
    retry: false,
    mutationFn: async (a: Attachment) => {
      const res = await (supabase
        .from('attachment')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', a.id)
        .select('id') as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>)
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length !== 1) throw toAppError({ code: '42501', message: 'forbidden' })
      const rm = await supabase.storage.from('evidence').remove([a.storage_path])
      if (rm.error) throw toAppError({ code: 'storage', message: rm.error.message })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
    },
  })
}
