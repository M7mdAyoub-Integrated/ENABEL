import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'
import { resolvePerson, type PersonDraft } from './completions'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module 9 — the guidance log (`guidance_record`).
 *
 *  ── WHY THIS IS ITS OWN MODULE AND NOT PART OF THE COMPLETION FORM ──
 *
 *  The workbook names `Completion_form (training title = food processing …)`
 *  as D0.1's source. That measures training completions, and a producer can be
 *  given licensing guidance at the counter without attending any course. The
 *  two are different events, so D0.1 has its own log. See 06 OQ-4 — and if the
 *  M&E lead decides the completion form really is the source, this module goes
 *  and `v_ind_d0_1` is repointed. It is not a detail either way.
 *
 *  ── THE NATIONAL ID IS THE INDICATOR, NOT A CONVENIENCE ──
 *
 *  D0.1 counts DISTINCT PEOPLE receiving guidance, not sessions of guidance.
 *  `v_ind_d0_1` groups by person and takes `min(guidance_date)`, so three
 *  visits from one producer are three rows here and ONE in the indicator.
 *
 *  If the log identified people by name, three spellings of one name would
 *  become three producers and D0.1 would inflate permanently — the same trap
 *  B1.2 has, in the same shape, which is why this module is national-ID-first
 *  and creates people through `resolvePerson` rather than inserting its own.
 *  There must stay exactly one creation path; see the note on that function.
 *
 *  ── WHAT MOVES THE FIGURE, AND WHAT DOES NOT ──
 *
 *  Because the view takes the FIRST guidance date per person, a producer lands
 *  in the quarter they were first helped in. So:
 *
 *    - a second record for someone already logged moves nothing;
 *    - editing the date of someone's ONLY record can move them between
 *      quarters;
 *    - deleting one of three records moves nothing; deleting their last one
 *      takes them out of D0.1 altogether.
 *
 *  ── NO ELIGIBILITY, NO PUBLISHING, NO APPLICATION ──
 *
 *  Guidance is given to whoever asks for it. There is no prerequisite chain
 *  and no public page: this module is a record of what was given.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const guidanceKeys = {
  all: ['guidance-records'] as const,
  list: () => ['guidance-records', 'list'] as const,
  one: (id: string) => ['guidance-records', 'one', id] as const,
}

export type GuidanceRow = {
  id: string
  personId: string
  nationalId: string
  fullName: string
  sex: string | null
  village: string | null
  phone: string | null
  guidanceTypeId: string
  guidanceDate: string
  deliveredBy: string | null
  createdAt: string
}

type GuidanceSelect = {
  id: string
  person_id: string
  guidance_type_id: string
  guidance_date: string
  delivered_by: string | null
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
  id, person_id, guidance_type_id, guidance_date, delivered_by, created_at,
  person!inner ( national_id, full_name, sex, village, phone )
`

function toRow(r: GuidanceSelect): GuidanceRow {
  return {
    id: r.id,
    personId: r.person_id,
    nationalId: r.person.national_id,
    fullName: r.person.full_name,
    sex: r.person.sex,
    village: r.person.village,
    phone: r.person.phone,
    guidanceTypeId: r.guidance_type_id,
    guidanceDate: r.guidance_date,
    deliveredBy: r.delivered_by,
    createdAt: r.created_at,
  }
}

/**
 * `deleted_at is null` on BOTH the record and the person, matching the cascade
 * `v_ind_d0_1` applies through its join to `person`. Soft-deleting somebody
 * must take their guidance out of this list as well as out of D0.1, or the
 * screen and the dashboard disagree about the same quarter.
 */
export function useGuidanceRecords(enabled = true) {
  return useQuery({
    queryKey: guidanceKeys.list(),
    enabled,
    queryFn: async (): Promise<GuidanceRow[]> => {
      const res = await supabase
        .from('guidance_record')
        .select(SELECT)
        .is('deleted_at', null)
        .is('person.deleted_at', null)
        .order('guidance_date', { ascending: false })
      return unwrapList(res as unknown as { data: GuidanceSelect[] | null; error: unknown }).map(
        toRow,
      )
    },
  })
}

export function useGuidanceRecord(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: guidanceKeys.one(id ?? ''),
    enabled: enabled && !!id,
    queryFn: async (): Promise<GuidanceRow> => {
      const res = await supabase
        .from('guidance_record')
        .select(SELECT)
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      return toRow(unwrap(res as unknown as { data: GuidanceSelect | null; error: unknown }))
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type GuidanceInput = PersonDraft & {
  guidanceTypeId: string
  guidanceDate: string
  deliveredBy: string | null
  /** One per attempt. A field officer who loses signal must not log twice. */
  clientUuid?: string
}

export function useCreateGuidanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: GuidanceInput) => {
      const person = await resolvePerson(input)
      const res = await supabase
        .from('guidance_record')
        .insert({
          person_id: person.id,
          guidance_type_id: input.guidanceTypeId,
          guidance_date: input.guidanceDate,
          delivered_by: input.deliveredBy?.trim() || null,
          ...(input.clientUuid ? { client_uuid: input.clientUuid } : {}),
        })
        .select('id')
        .single()
      const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
      return { id: row.id, personCreated: person.created }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: guidanceKeys.all })
      // D0.1 moves the first time a producer is logged, so a new record can
      // change the dashboard even though it is "just another row".
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/**
 * Edit a record.
 *
 * The person is NOT re-resolved and person_id is never rewritten. Correcting a
 * mistyped national ID by moving the record to a different producer would move
 * D0.1 for two people at once — one may drop out of the quarter entirely if
 * this was their first guidance. That is a delete-and-re-enter, done
 * deliberately, not a quiet field edit.
 */
export function useUpdateGuidanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Pick<GuidanceInput, 'guidanceTypeId' | 'guidanceDate' | 'deliveredBy'>
    }) => {
      const res = await supabase
        .from('guidance_record')
        .update({
          guidance_type_id: input.guidanceTypeId,
          guidance_date: input.guidanceDate,
          delivered_by: input.deliveredBy?.trim() || null,
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: guidanceKeys.all })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

/**
 * Soft delete. Never a hard delete — CLAUDE.md rule 2.
 *
 * Since 0069 this is coordinator-only, enforced by `guard_soft_delete`. A
 * data_entry user gets 42501, which maps to "Your role does not allow this
 * change. Ask the Coordinator to make it." Only a producer's LAST remaining
 * record changes D0.1; deleting one of three does not.
 */
export function useDeleteGuidanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('guidance_record')
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
      void qc.invalidateQueries({ queryKey: guidanceKeys.all })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}
