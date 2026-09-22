import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { KhldTable } from '../khld/types'
import type { RefRow } from './refTables'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Khalidiyah's records.
 *
 *  Reads go straight to the tables under RLS (the municipality gate does the
 *  scoping, 0145-0147). Every write goes through `save_khld_record` (0148):
 *  one payload, one exception block, the person and entity resolution the
 *  sheets need, the children replaced with a read-back, participations merged
 *  by volunteer. Nothing here computes an indicator; the two figures a screen
 *  shows beside a record (a milestone's status, an attendance sheet's
 *  reconciliation) come from the database's own functions (0147).
 *
 *  Query keys are under ['khld', table, ...] so a save invalidates the list,
 *  the record, and every picker over that table -- the screen the user is
 *  standing on changes (CLAUDE.md, "the screen that denies a write that
 *  happened").
 *
 *  `supabase` is used through a loosely typed handle. The generated types
 *  (types/database.ts) are regenerated with each migration set; the 22 tables
 *  and their functions are read here by name, as the Ramtha layer reads its
 *  ten, so a regeneration cannot change what these hooks do.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A header row, loosely typed: the tables have different columns and the screens read them by definition. */
export type KhldRow = Record<string, unknown> & {
  id: string
  municipality_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type KhldOption = { question_code: string; option_id: string; option_other: string | null }
export type KhldCount = { field_code: string; cell_id: string; count: number }
export type KhldChecklistRow = {
  item_no: number
  field_code: string
  status_id: string
  detail: string | null
  status_date: string | null
  evidence_ref: string | null
}
export type KhldRating = { item_id: string; rating_id: string }
export type KhldParticipation = {
  id: string
  volunteer_id: string
  kind: string
  campaign_id: string | null
  action_day_id: string | null
  activity_id: string | null
  market_id: string | null
  participated_on: string
  hours: number | null
  verified: boolean
  reference_text: string | null
  notes: string | null
  deleted_at: string | null
}

export type KhldPerson = {
  id: string
  national_id: string | null
  unhcr_number: string | null
  full_name: string
  phone: string | null
  sex: string | null
  date_of_birth: string | null
  age_recorded: number | null
}

export type KhldPartnerRow = { id: string; name: string; partner_type_id: string | null; partner_type_other: string | null; contact: string | null; deleted_at: string | null }
export type KhldEnterpriseRow = { id: string; reference: string | null; owner_person_id: string | null; owner_name: string | null; owner_phone: string | null; enterprise_name: string | null; deleted_at: string | null }
export type KhldVendorRow = { id: string; reference: string | null; person_id: string; deleted_at: string | null }

export type KhldRecord = {
  row: KhldRow
  options: KhldOption[]
  counts: KhldCount[]
  checklist: KhldChecklistRow[]
  ratings: KhldRating[]
  /** The occasion's participations (campaign, action day, activity, market), live only. */
  participations: KhldParticipation[]
  /** The person the record keys on: the volunteer's, the vendor's, the enterprise owner's. */
  person: KhldPerson | null
  partner: KhldPartnerRow | null
  enterprise: KhldEnterpriseRow | null
  vendor: KhldVendorRow | null
}

/** The junction column of each table's children, as save_khld_record names it (0148). */
export const CHILD_FK: Record<KhldTable, string | null> = {
  khld_partner: 'partner_id',
  khld_enterprise: 'enterprise_id',
  khld_vendor: 'vendor_id',
  khld_works_item: 'works_item_id',
  khld_coordination_meeting: 'meeting_id',
  khld_contribution: 'contribution_id',
  khld_campaign: 'campaign_id',
  khld_activity: 'activity_id',
  khld_market: 'market_id',
  khld_action_day: 'action_day_id',
  khld_volunteer: 'volunteer_id',
  khld_attendance: 'attendance_id',
  khld_guidance_completion: 'completion_id',
  khld_enterprise_support: 'support_id',
  khld_vendor_registration: 'registration_id',
  khld_interaction_survey: 'survey_id',
  khld_partner_survey: 'survey_id',
  khld_user_feedback: 'feedback_id',
  khld_volunteer_tracking: 'tracking_id',
  khld_producer_survey: 'survey_id',
  khld_milestone_verification: 'verification_id',
  khld_volunteer_participation: null,
}

/** Tables with an option junction (0145-0147). */
const OPTION_TABLES = new Set<KhldTable>([
  'khld_works_item', 'khld_coordination_meeting', 'khld_contribution', 'khld_campaign', 'khld_activity',
  'khld_market', 'khld_action_day', 'khld_volunteer', 'khld_guidance_completion', 'khld_enterprise_support',
  'khld_vendor_registration', 'khld_interaction_survey', 'khld_partner_survey', 'khld_user_feedback',
  'khld_volunteer_tracking', 'khld_producer_survey', 'khld_milestone_verification',
])
/** Tables with a count child (the "by ..." fields). */
const COUNT_TABLES = new Set<KhldTable>([
  'khld_coordination_meeting', 'khld_campaign', 'khld_attendance', 'khld_action_day', 'khld_market', 'khld_milestone_verification',
])
/** The occasions a participation links to, by its column. */
export const OCCASION_FK: Partial<Record<KhldTable, string>> = {
  khld_campaign: 'campaign_id',
  khld_action_day: 'action_day_id',
  khld_activity: 'activity_id',
  khld_market: 'market_id',
}

/** The loosely-typed handle: 22 tables, one code path, columns read by definition. */
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

export const khldKeys = {
  all: (table: KhldTable) => ['khld', table] as const,
  list: (table: KhldTable, filter: Readonly<Record<string, string>>, deleted: boolean) =>
    ['khld', table, 'list', filter, deleted] as const,
  record: (table: KhldTable, id: string) => ['khld', table, 'record', id] as const,
  picker: (table: KhldTable) => ['khld', table, 'picker'] as const,
  ref: (list: string) => ['ref', `ref_khld_${list}`] as const,
  person: (idType: string, idNumber: string) => ['khld', 'person', idType, idNumber] as const,
  milestone: (id: string) => ['khld', 'khld_milestone_verification', 'status', id] as const,
  attendance: (id: string) => ['khld', 'khld_attendance', 'figures', id] as const,
  participationsOf: (volunteerId: string) => ['khld', 'khld_volunteer_participation', 'of', volunteerId] as const,
  rules: ['khld', 'rules'] as const,
  items: ['khld', 'milestone_items'] as const,
}

/** One `ref_khld_*` list: same shape as every other ref_ table. */
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

/** Every live record of a table for one form, newest first. */
export function useKhldList(table: KhldTable, filter: Readonly<Record<string, string>>, deleted = false) {
  return useQuery({
    queryKey: khldKeys.list(table, filter, deleted),
    staleTime: 15_000,
    queryFn: async (): Promise<KhldRow[]> => {
      let q = db.from(table).select('*')
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v)
      q = deleted ? q.order('deleted_at', { ascending: false }) : q.is('deleted_at', null)
      q = q.order('created_at', { ascending: false })
      return rowsOf<KhldRow>(q)
    },
  })
}

const PERSON_COLS = 'id, national_id, unhcr_number, full_name, phone, sex, date_of_birth, age_recorded'

async function personById(id: string): Promise<KhldPerson | null> {
  const p = await db.from('person').select(PERSON_COLS).eq('id', id).maybeSingle()
  if (p.error) throw toAppError(p.error)
  return (p.data as KhldPerson | null) ?? null
}

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
      const counts = fk && COUNT_TABLES.has(table)
        ? await rowsOf<KhldCount>(db.from(`${table}_count`).select('field_code, cell_id, count').eq(fk, id!))
        : []
      const checklist = table === 'khld_milestone_verification'
        ? await rowsOf<KhldChecklistRow>(db.from('khld_milestone_checklist_item').select('item_no, field_code, status_id, detail, status_date, evidence_ref').eq('verification_id', id!).order('item_no'))
        : []
      const ratings = table === 'khld_user_feedback'
        ? await rowsOf<KhldRating>(db.from('khld_user_feedback_rating').select('item_id, rating_id').eq('feedback_id', id!))
        : []
      const occ = OCCASION_FK[table]
      const participations = occ
        ? await rowsOf<KhldParticipation>(db.from('khld_volunteer_participation').select('*').eq(occ, id!).is('deleted_at', null).order('created_at'))
        : []

      let partner: KhldPartnerRow | null = null
      if (typeof row['partner_id'] === 'string') {
        const r = await db.from('khld_partner').select('id, name, partner_type_id, partner_type_other, contact, deleted_at').eq('id', row['partner_id']).maybeSingle()
        if (r.error) throw toAppError(r.error)
        partner = (r.data as KhldPartnerRow | null) ?? null
      }
      let enterprise: KhldEnterpriseRow | null = null
      if (typeof row['enterprise_id'] === 'string') {
        const r = await db.from('khld_enterprise').select('id, reference, owner_person_id, owner_name, owner_phone, enterprise_name, deleted_at').eq('id', row['enterprise_id']).maybeSingle()
        if (r.error) throw toAppError(r.error)
        enterprise = (r.data as KhldEnterpriseRow | null) ?? null
      }
      let vendor: KhldVendorRow | null = null
      if (typeof row['vendor_id'] === 'string') {
        const r = await db.from('khld_vendor').select('id, reference, person_id, deleted_at').eq('id', row['vendor_id']).maybeSingle()
        if (r.error) throw toAppError(r.error)
        vendor = (r.data as KhldVendorRow | null) ?? null
      }

      // The person the record keys on: a volunteer's own, a vendor's, an
      // enterprise's owner (SO4-G1 registers the owner; SO4-G2 shows them).
      let person: KhldPerson | null = null
      const personId =
        typeof row['person_id'] === 'string' ? (row['person_id'] as string)
        : typeof row['owner_person_id'] === 'string' ? (row['owner_person_id'] as string)
        : vendor?.person_id ?? enterprise?.owner_person_id ?? null
      if (personId) person = await personById(personId)

      return { row, options, counts, checklist, ratings, participations, person, partner, enterprise, vendor }
    },
  })
}

/* ── the person spine ─────────────────────────────────────────────────────── */

export type KhldIdType = 'national_id' | 'unhcr_number'

export type PersonLookup = KhldPerson & { deleted_at: string | null; deleted_by: string | null }

export function normaliseIdNumber(idType: KhldIdType, raw: string): string {
  if (idType === 'national_id') return raw.replace(/\D/g, '')
  return raw.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function isCompleteId(idType: KhldIdType, norm: string): boolean {
  return idType === 'national_id' ? /^\d{9}$/.test(norm) : norm.length > 0
}

/**
 * Who is behind an identifier, deleted or not (khld_person_lookup, 0144).
 * A soft-deleted match comes back with deleted_at and the deleter's name,
 * which is what the screen needs to offer restore instead of a refusal.
 */
export function useKhldPersonLookup(idType: KhldIdType, idNumber: string) {
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

/** Names for the person-level lists, one query for the page. */
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

/** Rows of a table for a picker: id, reference, a title, a date. Live only. */
export type KhldPick = { id: string; reference: string | null; label: string; date: string | null; personId?: string }

/** What names a row of each table, for pickers and links. */
export const PICK: Partial<Record<KhldTable, { title?: string; date?: string; reference?: boolean; person?: string }>> = {
  khld_partner: { title: 'name' },
  khld_enterprise: { title: 'enterprise_name', reference: true },
  khld_vendor: { reference: true, person: 'person_id' },
  khld_works_item: { title: 'description', reference: true, date: 'report_date' },
  khld_coordination_meeting: { reference: true, date: 'meeting_date' },
  khld_campaign: { reference: true, date: 'campaign_date' },
  khld_activity: { title: 'event_title', reference: true, date: 'event_date' },
  khld_market: { title: 'market_name', reference: true, date: 'market_date' },
  khld_action_day: { reference: true, date: 'date' },
  khld_volunteer: { reference: true, date: 'reg_date', person: 'person_id' },
}

export function useKhldPicker(table: KhldTable | undefined) {
  return useQuery({
    queryKey: khldKeys.picker(table ?? 'khld_activity'),
    enabled: !!table && !!PICK[table],
    staleTime: 30_000,
    queryFn: async (): Promise<KhldPick[]> => {
      const t = table!
      const p = PICK[t]!
      const cols = ['id', p.reference ? 'reference' : null, p.title ?? null, p.date ?? null, p.person ?? null].filter((c): c is string => !!c)
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
        return { id: r['id'] as string, reference: ref, label, date, ...(personId ? { personId } : {}) }
      })
    },
  })
}

/** One volunteer's participations, all occasions, live only -- SO3-0's log. */
export function useVolunteerParticipations(volunteerId: string | undefined) {
  return useQuery({
    queryKey: khldKeys.participationsOf(volunteerId ?? ''),
    enabled: !!volunteerId,
    queryFn: async (): Promise<KhldParticipation[]> =>
      rowsOf<KhldParticipation>(db.from('khld_volunteer_participation').select('*').eq('volunteer_id', volunteerId!).is('deleted_at', null).order('participated_on')),
  })
}

/* ── the database's own figures beside a record ───────────────────────────── */

export type MilestoneStatus = {
  status: 'established' | 'partly_established' | 'not_established' | 'not_computable'
  reason?: 'not_found' | 'no_rule' | 'rule_not_evaluable' | 'items_missing'
  broken?: string
  missing?: number[]
  source_items?: number[]
  critical_items?: number[]
  in_place?: number
  partly?: number
  not_in_place?: number
}

export function useKhldMilestoneStatus(verificationId: string | undefined) {
  return useQuery({
    queryKey: khldKeys.milestone(verificationId ?? ''),
    enabled: !!verificationId,
    queryFn: async (): Promise<MilestoneStatus> => {
      const { data, error } = await db.rpc('khld_milestone_status', { p_verification_id: verificationId! })
      if (error) throw toAppError(error)
      return data as MilestoneStatus
    },
  })
}

export type AttendanceFigures = {
  total: number
  by_sex_sum: number
  by_age_sex_sum: number | null
  agrees: boolean
  distinct_individuals: number | null
  distinct_reason: 'repeat_count_missing' | 'not_yet' | 'not_possible' | 'not_checked' | null
}

export function useKhldAttendanceFigures(attendanceId: string | undefined) {
  return useQuery({
    queryKey: khldKeys.attendance(attendanceId ?? ''),
    enabled: !!attendanceId,
    queryFn: async (): Promise<AttendanceFigures> => {
      const { data, error } = await db.rpc('khld_attendance_figures', { p_attendance_id: attendanceId! })
      if (error) throw toAppError(error)
      return data as AttendanceFigures
    },
  })
}

/* ── the milestone rules (0147): the critical items, as data ──────────────── */

export type KhldMilestoneRule = {
  municipality_id: string
  milestone_code: string
  source_rule_en: string
  source_rule_ar: string
  source_items: number[]
  critical_items: number[] | null
  decided_by: string | null
  decided_on: string | null
  note_en: string | null
  note_ar: string | null
}

export type KhldMilestoneItem = {
  milestone_code: string
  item_no: number
  field_code: string
  field_type: string
  list_name: string | null
  label_en: string
  label_ar: string
}

export function useKhldMilestoneRules() {
  return useQuery({
    queryKey: khldKeys.rules,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<KhldMilestoneRule[]> =>
      rowsOf<KhldMilestoneRule>(db.from('khld_milestone_rule').select('*').order('milestone_code')),
  })
}

export function useKhldMilestoneItems() {
  return useQuery({
    queryKey: khldKeys.items,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<KhldMilestoneItem[]> =>
      rowsOf<KhldMilestoneItem>(db.from('khld_milestone_item').select('*').order('milestone_code').order('item_no')),
  })
}

/**
 * Deciding a milestone's critical items: an UPDATE of its rule row. The
 * guard (0147) refuses a number that is not a checklist row of that
 * milestone and stamps who decided and when. RLS filters rather than
 * refuses for the wrong role, so the rows that came back are counted.
 */
export function useSetKhldMilestoneRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', 'rules', 'set'],
    retry: false,
    mutationFn: async ({ municipalityId, code, items }: { municipalityId: string; code: string; items: number[] | null }) => {
      const res = await (db.from('khld_milestone_rule')
        .update({ critical_items: items })
        .eq('municipality_id', municipalityId)
        .eq('milestone_code', code)
        .select('milestone_code') as unknown as Promise<{ data: { milestone_code: string }[] | null; error: unknown }>)
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length !== 1) throw toAppError({ code: '42501', message: 'forbidden' })
      return res.data[0]!.milestone_code
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khldKeys.rules })
      void qc.invalidateQueries({ queryKey: ['khld', 'khld_milestone_verification'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type PersonPayload = {
  id_type: KhldIdType
  id_number: string
  full_name?: string
  phone?: string
  sex?: string
  date_of_birth?: string
  age_years?: number
}
export type PartnerPayload = { id?: string; name?: string; partner_type_id?: string; partner_type_other?: string; contact?: string }
export type EnterprisePayload = { id?: string; enterprise_name?: string; owner_name?: string; owner_phone?: string }
export type ParticipationPayload = {
  volunteer_id: string
  participated_on?: string
  hours?: number | null
  verified?: boolean
  reference_text?: string
  notes?: string
}

export type SavePayload = {
  id?: string
  row: Record<string, unknown>
  person?: PersonPayload
  partner?: PartnerPayload
  enterprise?: EnterprisePayload
  option_questions?: string[]
  options?: KhldOption[]
  count_fields?: string[]
  counts?: KhldCount[]
  checklist?: KhldChecklistRow[]
  ratings?: KhldRating[]
  participations?: ParticipationPayload[]
}

export type SaveRefusal =
  | 'unknown_table' | 'unknown_column' | 'unknown_block' | 'not_found' | 'consent_refused'
  | 'person_deleted' | 'partner_deleted' | 'enterprise_deleted' | 'vendor_deleted' | 'invalid'

export type SaveResult =
  | { ok: true; id: string; reference: string | null; person_id?: string; partner_id?: string; enterprise_id?: string; enterprise_reference?: string | null; vendor_id?: string; vendor_reference?: string | null }
  | {
      ok: false
      result: SaveRefusal
      column?: string
      block?: string
      person_id?: string
      partner_id?: string
      enterprise_id?: string
      vendor_id?: string
      code?: string
      constraint?: string | null
      message?: string
    }

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
        // a person-level save may have created a person, an entity, or participations
        void qc.invalidateQueries({ queryKey: ['people'] })
        if (res.partner_id) void qc.invalidateQueries({ queryKey: khldKeys.all('khld_partner') })
        if (res.enterprise_id) void qc.invalidateQueries({ queryKey: khldKeys.all('khld_enterprise') })
        if (res.vendor_id) void qc.invalidateQueries({ queryKey: khldKeys.all('khld_vendor') })
        if (OCCASION_FK[table]) void qc.invalidateQueries({ queryKey: khldKeys.all('khld_volunteer_participation') })
      }
    },
  })
}

/** Soft delete / restore of a record or an entity: a plain UPDATE under RLS and guard_soft_delete (coordinator only). */
export function useSetKhldDeleted(table: KhldTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['khld', table, 'deleted'],
    retry: false,
    mutationFn: async ({ id, deleted }: { id: string; deleted: boolean }) => {
      const res = await (db.from(table)
        .update({ deleted_at: deleted ? new Date().toISOString() : null })
        .eq('id', id)
        .select('id') as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>)
      if (res.error) throw toAppError(res.error)
      // RLS filters rather than refuses: a zero-row update is a refusal
      if (!res.data || res.data.length !== 1) throw toAppError({ code: '42501', message: 'forbidden' })
      return res.data[0]!.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khldKeys.all(table) })
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
