import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Restore, instead of failing on a key that belongs to a deleted row.
 *
 *  ── THE OBLIGATION THIS DISCHARGES ──
 *
 *  CLAUDE.md: "An entity with history hanging off it is RESTORED, never
 *  recreated", and, in the same breath, "when someone tries to create a person
 *  or partner whose key matches a soft-deleted row, offer RESTORE rather than
 *  failing with a constraint error. The rule is correct; without the restore
 *  path the UI makes it look like a bug."
 *
 *  It looked like a bug. `person.national_id` is globally unique on purpose --
 *  0059 deliberately did NOT make it partial -- so saving a completion for
 *  somebody who had been soft-deleted came back as
 *  "person_national_id_key: someone is already on file with this national ID",
 *  which is TRUE, UNHELPFUL, and describes a row the coordinator cannot see or
 *  reach. The only move left was to type a different national ID, which is the
 *  duplicate the global index exists to prevent.
 *
 *  ── WHY IT IS NOT AUTOMATIC ──
 *
 *  Restoring a person brings back everything attached to them, and every
 *  indicator that counts a person dates them on their FIRST record. So a
 *  restore today can change A1.3 for a quarter eighteen months ago, one that
 *  may already have been reported. That is a coordinator's decision with the
 *  consequences in front of them, not a save that silently does something
 *  larger than it was asked to.
 *
 *  So the flow is: the save is refused -> we look up who is behind the key ->
 *  we ask the database what restoring them would move -> we show that, named
 *  and dated -> and only then is there a button. `submit_followup` set this
 *  pattern; this follows it.
 *
 *  All of it is migration 0107. Nothing here computes an indicator.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type RestoreCandidate = {
  id: string
  full_name: string
  /** Person only. */
  national_id?: string
  village?: string | null
  /** Partner only. */
  name?: string
  unit?: string | null
  deleted_at: string
  /** Email of whoever deleted them, from audit_log. Null on a seeded delete. */
  deleted_by: string | null
}

export type RestoreImpactRow = {
  code: string
  period_code: string
  /** Null when `recomputed` — a percentage has no meaningful delta. */
  delta: number | null
  recomputed: boolean
}

export const restoreKeys = {
  person: (nid: string) => ['restore', 'person', nid] as const,
  partner: (name: string, unit: string) => ['restore', 'partner', name, unit] as const,
  impact: (kind: 'person' | 'partner', id: string) => ['restore', 'impact', kind, id] as const,
}

/**
 * Who is behind a national ID that a save was just refused on.
 *
 * Returns null when the ID is free or belongs to a LIVE person — in which case
 * the refusal was an ordinary duplicate and the constraint message is the right
 * answer. Only a soft-deleted match produces a candidate.
 */
export function usePersonRestoreCandidate(nationalId: string, enabled: boolean) {
  const nid = nationalId.replace(/\D/g, '')
  return useQuery({
    queryKey: restoreKeys.person(nid),
    enabled: enabled && nid.length === 9,
    queryFn: async (): Promise<RestoreCandidate | null> => {
      const { data, error } = await supabase.rpc('person_restore_candidate', {
        p_national_id: nid,
      })
      if (error) throw toAppError(error)
      const rows = (data ?? []) as RestoreCandidate[]
      return rows[0] ?? null
    },
  })
}

export function usePartnerRestoreCandidate(name: string, unit: string, enabled: boolean) {
  return useQuery({
    queryKey: restoreKeys.partner(name.trim(), unit.trim()),
    enabled: enabled && name.trim().length > 0,
    queryFn: async (): Promise<RestoreCandidate | null> => {
      // `exactOptionalPropertyTypes` is on, so an optional argument is either
      // present with a string or absent -- not present-and-undefined. The
      // function's own default is null, which is what the empty case means.
      const u = unit.trim()
      const { data, error } = await supabase.rpc(
        'partner_restore_candidate',
        u ? { p_name: name.trim(), p_unit: u } : { p_name: name.trim() },
      )
      if (error) throw toAppError(error)
      const rows = (data ?? []) as RestoreCandidate[]
      return rows[0] ?? null
    },
  })
}

/**
 * What restoring this row would move.
 *
 * Never computed here. The front end must not compute an indicator, and this
 * one is harder than it looks: the period a restored record lands in is the one
 * its FIRST qualifying date falls in, per indicator, with each view's own
 * filters. 0107 does it in SQL, next to the views it mirrors.
 */
export function useRestoreImpact(kind: 'person' | 'partner', id: string | undefined) {
  return useQuery({
    queryKey: restoreKeys.impact(kind, id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<RestoreImpactRow[]> => {
      // `enabled` guarantees an id here; the assertion is for the generated
      // signature, which does not know that.
      const rowId = id as string
      const res =
        kind === 'person'
          ? await supabase.rpc('person_restore_impact', { p_person_id: rowId })
          : await supabase.rpc('partner_restore_impact', { p_partner_id: rowId })
      return unwrapList(res as unknown as { data: RestoreImpactRow[] | null; error: unknown })
    },
  })
}

export type RestoreResult = { ok: boolean; result: string }

export function useRestore(kind: 'person' | 'partner') {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['restore', kind],
    mutationFn: async (id: string): Promise<RestoreResult> => {
      const { data, error } =
        kind === 'person'
          ? await supabase.rpc('restore_person', { p_person_id: id })
          : await supabase.rpc('restore_partner', { p_partner_id: id })
      // `guard_soft_delete` RAISES for a non-coordinator, and 0107's read-back
      // guard raises when RLS filtered the update instead of refusing it --
      // which is what an enumerator gets, because `person_update` does not
      // include them. Both arrive here as an error, which is correct: a
      // restore that did not happen must not look like one that did.
      if (error) throw toAppError(error)
      return data as RestoreResult
    },
    onSuccess: () => {
      // A restore moves indicator figures and puts a row back into every list
      // that filters deleted_at. Nothing narrower than a full invalidation is
      // honest about how far it reaches.
      void qc.invalidateQueries()
    },
  })
}

/* ── the other direction: a key that PERMITS re-entry ──────────────────────── */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  "There was an earlier one, and it was withdrawn."
 *
 *  The five `_live` indexes (0059) exclude soft-deleted rows on purpose, so a
 *  withdrawn enrolment, registration, survey or partnership may be entered
 *  again. Withdrawal is not a ban — OQ-24 settled that.
 *
 *  But the re-entry then succeeds SILENTLY, which is the mirror of the defect
 *  RestorePanel above exists to fix. There a global key refuses and offers no
 *  way forward, so a correct rule looks like a bug. Here a partial key permits
 *  and says nothing, so a deliberate decision looks like the system having
 *  forgotten. Someone re-entering a withdrawn record is often doing it BECAUSE
 *  they do not know it was withdrawn.
 *
 *  0110 answers it. `security invoker`, so a role that cannot read the table
 *  gets nothing — verified as all five.
 *
 *  ── WHY THE NAME IS OFTEN ABSENT, AND WHY THAT IS RIGHT ──
 *
 *  `withdrawn_by` comes from `audit_log`, whose only policy is SELECT for a
 *  coordinator. So `data_entry` and `enumerator` get the DATE and a null name.
 *  That is the audit boundary doing its job, not a lookup failing, and the
 *  component has a separate sentence for each case — the same split
 *  RestorePanel already makes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type WithdrawnKind =
  | 'training_enrolment'
  | 'advisory_enrolment'
  | 'exhibition_registration'
  | 'followup_survey'
  | 'partnership'

export type WithdrawnPredecessor = {
  withdrawn_at: string
  withdrawn_by: string | null
  how_many: number
}

export function useWithdrawnPredecessor(
  kind: WithdrawnKind,
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return useQuery({
    queryKey: ['withdrawn', kind, a ?? '', b ?? ''],
    enabled: !!a && !!b,
    queryFn: async (): Promise<WithdrawnPredecessor | null> => {
      const { data, error } = await supabase.rpc('withdrawn_predecessor', {
        p_kind: kind,
        p_a: a as string,
        p_b: b as string,
      })
      if (error) throw toAppError(error)
      const rows = (data ?? []) as WithdrawnPredecessor[]
      return rows[0] ?? null
    },
  })
}
