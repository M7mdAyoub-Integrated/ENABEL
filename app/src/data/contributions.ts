import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Partner contributions — the G0.4 log.
 *
 *  ── WHY THIS LIVES ON THE PARTNERSHIP ──
 *
 *  `partner_contribution.partnership_id` is NOT NULL, so the parent must be
 *  chosen before any other field means anything. Same argument as mentorship
 *  sessions on an initiative.
 *
 *  ── G0.4 RESETS EVERY QUARTER, AND COUNTS PARTNERS NOT ROWS ──
 *
 *  `v_ind_g0_4` is `count(distinct partner_id)` over contributions whose
 *  `contributed_on` falls inside the period. Three consequences the screen has
 *  to state rather than leave to be inferred:
 *
 *    - a partner with an agreement and no activity this quarter does NOT count;
 *    - a second contribution from the same partner in the same quarter moves
 *      nothing;
 *    - the DATE decides the quarter, so a contribution recorded in October for
 *      something done in September belongs to the September quarter.
 *
 *  It also counts distinct PARTNERS, not partnerships. One organisation holding
 *  both a training and a production-support partnership is one partner, so
 *  G0.4 is never the sum of A1.2 and C1.1.
 *
 *  ── MOST OF THESE SHOULD NOT BE TYPED ──
 *
 *  Three sources write a contribution on their own, and each stamps the row it
 *  came from in `entity_type`/`entity_id`:
 *
 *    coordination_meeting   a partner attending a meeting        (0010)
 *    market_linkage         a linkage that is active or ended    (0101)
 *    training_session       a session marked delivered           (0102)
 *
 *  Those rows are shown here and are NOT editable from this screen. They track
 *  their parent in both directions -- reverse the parent and the credit is
 *  withdrawn -- so editing one here would be overwritten the next time the
 *  parent was touched, and deleting one would leave the log disagreeing with
 *  the record it was derived from.
 *
 *  Typing by hand is for what nothing else records: a referral, a donation of
 *  inputs, an agreed contribution with no row of its own anywhere.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const contributionKeys = {
  all: ['contributions'] as const,
  forPartnership: (id: string) => ['contributions', 'partnership', id] as const,
}

/** Mirrors the check constraint on `partner_contribution.contribution_type`. */
export const CONTRIBUTION_TYPES = [
  'training',
  'service',
  'referral',
  'market',
  'funding',
  'coordination',
  'other',
] as const
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number]

/** The three parents that write a contribution on their own. */
export const AUTO_ENTITY_TYPES = [
  'coordination_meeting',
  'market_linkage',
  'training_session',
] as const

export type ContributionRow = {
  id: string
  partnershipId: string
  contributedOn: string
  contributionType: string
  entityType: string | null
  entityId: string | null
  description: string
  createdAt: string
  /** True when a trigger wrote it. Such a row is read-only on this screen. */
  isAutomatic: boolean
  /** Which agreement it was made under. Only set by the partner-level read. */
  partnershipType?: string
}

type ContributionSelect = {
  id: string
  partnership_id: string
  contributed_on: string
  contribution_type: string
  entity_type: string | null
  entity_id: string | null
  description: string
  created_at: string
}

function toRow(r: ContributionSelect): ContributionRow {
  return {
    id: r.id,
    partnershipId: r.partnership_id,
    contributedOn: r.contributed_on,
    contributionType: r.contribution_type,
    entityType: r.entity_type,
    entityId: r.entity_id,
    description: r.description,
    createdAt: r.created_at,
    isAutomatic:
      r.entity_type !== null &&
      (AUTO_ENTITY_TYPES as readonly string[]).includes(r.entity_type),
  }
}

const SELECT =
  'id, partnership_id, contributed_on, contribution_type, entity_type, entity_id, description, created_at'

/**
 * Every contribution made by ONE ORGANISATION, across all its partnerships.
 *
 * Keyed on the partner rather than the partnership since the merge, because
 * that is what G0.4 counts: a body holding a training and a production-support
 * agreement is ONE partner with one contribution history, and a log split in
 * two would invite it being read as two.
 *
 * `partnership_id` stays NOT NULL on the row -- a contribution is always made
 * under an agreement -- so each entry still says which one it belongs to.
 */
export function useContributionsForPartner(partnerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...contributionKeys.all, 'partner', partnerId ?? ''],
    enabled: enabled && !!partnerId,
    queryFn: async (): Promise<ContributionRow[]> => {
      const res = await supabase
        .from('partner_contribution')
        .select(SELECT + ', partnership!partner_contribution_partnership_id_fkey!inner ( partner_id, partnership_type )')
        .eq('partnership.partner_id', partnerId!)
        .is('deleted_at', null)
        .order('contributed_on', { ascending: false })
      return unwrapList(
        res as unknown as {
          data: (ContributionSelect & {
            partnership: { partner_id: string; partnership_type: string }
          })[] | null
          error: unknown
        },
      ).map((r) => ({ ...toRow(r), partnershipType: r.partnership.partnership_type }))
    },
  })
}

export function useContributions(partnershipId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: contributionKeys.forPartnership(partnershipId ?? ''),
    enabled: enabled && !!partnershipId,
    queryFn: async (): Promise<ContributionRow[]> => {
      const res = await supabase
        .from('partner_contribution')
        .select(SELECT)
        .eq('partnership_id', partnershipId!)
        .is('deleted_at', null)
        .order('contributed_on', { ascending: false })
      return unwrapList(
        res as unknown as { data: ContributionSelect[] | null; error: unknown },
      ).map(toRow)
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type ContributionInput = {
  partnershipId: string
  contributedOn: string
  contributionType: ContributionType
  description: string
}

function invalidate(qc: ReturnType<typeof useQueryClient>, partnershipId: string) {
  // The whole `contributions` tree, not just this partnership's key: the
  // partner-level log reads a different key and would otherwise keep showing
  // a row that has just been withdrawn.
  void qc.invalidateQueries({ queryKey: contributionKeys.all })
  void qc.invalidateQueries({ queryKey: contributionKeys.forPartnership(partnershipId) })
  // G0.4 moves the first time a partner contributes in a quarter, so a new row
  // can change the dashboard even though it is "just another row".
  void qc.invalidateQueries({ queryKey: ['indicators'] })
}

export function useCreateContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContributionInput) => {
      const res = await supabase
        .from('partner_contribution')
        .insert({
          partnership_id: input.partnershipId,
          contributed_on: input.contributedOn,
          contribution_type: input.contributionType,
          description: input.description.trim(),
          // entity_type and entity_id stay null. They are provenance: a row
          // that names a parent was DERIVED from one, and a hand-entered row
          // must not claim to have been. See migration 0063 on recording
          // provenance rather than inferring it.
        })
        .select('id')
        .single()
      const row = unwrap(res as unknown as { data: { id: string } | null; error: unknown })
      return row.id
    },
    onSuccess: (_id, input) => invalidate(qc, input.partnershipId),
  })
}

export function useUpdateContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ContributionInput }) => {
      const res = await supabase
        .from('partner_contribution')
        .update({
          contributed_on: input.contributedOn,
          contribution_type: input.contributionType,
          description: input.description.trim(),
        })
        .eq('id', id)
        .is('deleted_at', null)
        // A derived row is not editable here: the trigger that wrote it would
        // overwrite the edit the next time its parent was touched, and the two
        // would silently disagree until then.
        .is('entity_type', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      // RLS filters an update it will not permit rather than raising, so the
      // statement reports success having changed nothing. Count what came back.
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: (_id, v) => invalidate(qc, v.input.partnershipId),
  })
}

/**
 * Soft delete. Never a hard delete — CLAUDE.md rule 2, and coordinator-only via
 * `guard_soft_delete`.
 *
 * `entity_type is null` again: a derived credit is withdrawn by reversing the
 * record that earned it — un-deliver the session, take the linkage back to
 * proposed, delete the meeting — not from this log. Deleting it here would
 * leave the credit gone while the parent still says the partner contributed.
 */
export function useDeleteContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; partnershipId: string }) => {
      const res = await supabase
        .from('partner_contribution')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .is('entity_type', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },
    onSuccess: (_id, v) => invalidate(qc, v.partnershipId),
  })
}
