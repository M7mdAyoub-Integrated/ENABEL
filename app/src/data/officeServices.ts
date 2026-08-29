import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'
import { resolvePerson, type PersonDraft } from './completions'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module 8 — the coordination office (`office_service`).
 *
 *  ── THE NATIONAL ID IS THE INDICATOR, NOT A CONVENIENCE ──
 *
 *  B1.2 counts DISTINCT PEOPLE reaching office services, not visits:
 *
 *      select os.person_id, min(os.service_date)
 *        from office_service os join person pe on pe.id = os.person_id ...
 *       group by os.person_id
 *
 *  The same farmer coming six times is one person and six rows. If the office
 *  identified people by name, six spellings of one name would become six
 *  people, and B1.2 would inflate permanently and invisibly -- nothing
 *  downstream can tell "Umm Ali" from "Om Ali".
 *
 *  So this form is national-ID-first, and it creates people through
 *  `resolvePerson` in completions.ts rather than inserting its own. One
 *  creation path, shared, deliberately: a second one with its own trimming
 *  would eventually disagree with the first.
 *
 *  ── NO ELIGIBILITY, NO PUBLISHING, NO APPLICATION ──
 *
 *  The office serves whoever walks in. There is no prerequisite chain here and
 *  no public page. This module is a record of what the office did.
 *
 *  ── ON THE FUTURE OFFICE-STAFF ROLE ──
 *
 *  `office_service` policies are `is_staff()` to read and coordinator or
 *  data_entry to write -- the same shape as every other operational table.
 *  Nothing here narrows that or depends on it: adding an `office_staff` role
 *  later is a policy change plus an entry in MODULE_ACCESS, not a restructure.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const officeKeys = {
  all: ['office-services'] as const,
  list: () => ['office-services', 'list'] as const,
  one: (id: string) => ['office-services', 'one', id] as const,
}

export type OfficeServiceRow = {
  id: string
  personId: string
  nationalId: string
  fullName: string
  sex: string | null
  village: string | null
  phone: string | null
  serviceTypeId: string
  serviceDate: string
  adviser: string | null
  notes: string | null
  createdAt: string
}

type OfficeSelect = {
  id: string
  person_id: string
  service_type_id: string
  service_date: string
  adviser: string | null
  notes: string | null
  created_at: string
  person: {
    national_id: string
    full_name: string
    sex: string | null
    village: string | null
    phone: string | null
  }
}

const SELECT = `
  id, person_id, service_type_id, service_date, adviser, notes, created_at,
  person!inner ( national_id, full_name, sex, village, phone )
`

function toRow(r: OfficeSelect): OfficeServiceRow {
  return {
    id: r.id,
    personId: r.person_id,
    nationalId: r.person.national_id,
    fullName: r.person.full_name,
    sex: r.person.sex,
    village: r.person.village,
    phone: r.person.phone,
    serviceTypeId: r.service_type_id,
    serviceDate: r.service_date,
    adviser: r.adviser,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

/**
 * `deleted_at is null` on BOTH the service and the person, matching the
 * cascade the indicator views apply. Soft-deleting someone must take their
 * office visits out of the list as well as out of B1.2, or the screen and the
 * dashboard disagree about the same quarter.
 */
export function useOfficeServices(enabled = true) {
  return useQuery({
    queryKey: officeKeys.list(),
    enabled,
    queryFn: async (): Promise<OfficeServiceRow[]> => {
      const res = await supabase
        .from('office_service')
        .select(SELECT)
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .order('service_date', { ascending: false })
      return unwrapList(res as unknown as { data: OfficeSelect[] | null; error: unknown }).map(toRow)
    },
  })
}

export function useOfficeService(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: officeKeys.one(id ?? ''),
    enabled: enabled && !!id,
    queryFn: async (): Promise<OfficeServiceRow> => {
      const res = await supabase
        .from('office_service')
        .select(SELECT)
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      return toRow(unwrap(res as unknown as { data: OfficeSelect | null; error: unknown }))
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type OfficeServiceInput = PersonDraft & {
  serviceTypeId: string
  serviceDate: string
  adviser: string | null
  notes: string | null
  /** One per attempt. A field officer who loses signal must not create two visits. */
  clientUuid?: string
}

export function useCreateOfficeService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: OfficeServiceInput) => {
      const person = await resolvePerson(input)
      const res = await supabase
        .from('office_service')
        .insert({
          person_id: person.id,
          service_type_id: input.serviceTypeId,
          service_date: input.serviceDate,
          adviser: input.adviser?.trim() || null,
          notes: input.notes?.trim() || null,
          ...(input.clientUuid ? { client_uuid: input.clientUuid } : {}),
        })
        .select('id')
        .single()
      const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
      return { id: row.id, personCreated: person.created }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: officeKeys.all })
      // B1.2 moves the first time a person is seen, so a new visit can change
      // the dashboard even though it is "just another row".
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/**
 * Edit a visit.
 *
 * The person is NOT re-resolved and person_id is never rewritten. Correcting a
 * mistyped national ID by moving the visit to a different person would move
 * B1.2 for two people at once -- one may drop out of the quarter entirely if
 * this was their first visit. That is a delete-and-re-enter, done deliberately,
 * not a quiet field edit.
 */
export function useUpdateOfficeService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Pick<OfficeServiceInput, 'serviceTypeId' | 'serviceDate' | 'adviser' | 'notes'>
    }) => {
      const res = await supabase
        .from('office_service')
        .update({
          service_type_id: input.serviceTypeId,
          service_date: input.serviceDate,
          adviser: input.adviser?.trim() || null,
          notes: input.notes?.trim() || null,
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
      void qc.invalidateQueries({ queryKey: officeKeys.all })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/**
 * Soft delete. Never a hard delete -- CLAUDE.md rule 2.
 *
 * Since 0069 this is coordinator-only, enforced by `guard_soft_delete`. A
 * data_entry user gets 42501, which maps to "Your role does not allow this
 * change. Ask the Coordinator to make it." Only the person's LAST remaining
 * visit changes B1.2; deleting one of six does not.
 */
export function useDeleteOfficeService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('office_service')
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: officeKeys.all })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}
