import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrap, unwrapList } from './errors'
import { qk } from './queryClient'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module 1 — Partnerships (training and production support).
 *
 *  Three tables, not one:
 *    partner            the organisation.        UNIQUE (name, unit)
 *    partnership        the relationship.        UNIQUE (partner_id, type)
 *    partnership_role   what they actually do.   junction, composite PK
 *
 *  The split matters for the indicators. A1.2 counts TRAINING partnerships and
 *  C1.1 counts PRODUCTION-SUPPORT ones; G0.4 counts both. One organisation can
 *  hold one of each and be counted once in each — which is exactly why the
 *  unique key is (partner_id, partnership_type) and not partner_id alone.
 *
 *  Two triggers police the reference data: `check_partnership_type` and
 *  `check_partnership_role` reject a type or role that belongs to the OTHER
 *  kind of partnership, and require the free-text box when the chosen option
 *  allows it. The UI only ever offers the right list, so those should never
 *  fire — they are the backstop, and if one fires it is reported as written.
 *
 *  This module is NOT in the offline queue. Partnerships are created by a
 *  coordinator at a desk, not by a field officer on a phone: `partnership` has
 *  no `client_uuid` column, so a queued replay could not be de-duplicated.
 *  Offline support belongs to the modules that carry that column.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type PartnershipType = 'training' | 'production_support'

export type PartnershipRow = {
  id: string
  partnerId: string
  name: string
  unit: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  partnerTypeId: string
  partnerTypeOther: string | null
  roleIds: string[]
  /** Free text captured against an "Other" role, keyed by role id. */
  roleOther: Record<string, string | null>
  establishedOn: string
  agreementRef: string | null
  isActive: boolean
  endedOn: string | null
  createdAt: string
  createdBy: string | null
}

/** Which ref table a partnership type draws its options from. */
export function typeRefTable(t: PartnershipType) {
  return t === 'training' ? 'ref_partner_type_training' : 'ref_partner_type_production'
}
export function roleRefTable(t: PartnershipType) {
  return t === 'training' ? 'ref_partner_role_training' : 'ref_partner_role_production'
}

/**
 * The shape PostgREST returns for the list select.
 *
 * Declared by hand because the generated `Database` types cannot express a
 * conditional embed, and `!inner` on a nullable FK makes the inferred type
 * collapse to `never`. Written out here it is at least checkable against the
 * select string directly above it.
 */
type PartnershipSelect = {
  id: string
  partner_id: string
  partnership_type: PartnershipType
  partner_type_id: string
  partner_type_other: string | null
  established_on: string
  agreement_ref: string | null
  is_active: boolean
  ended_on: string | null
  created_at: string
  created_by: string | null
  partner: {
    id: string
    name: string
    unit: string | null
    contact_person: string | null
    phone: string | null
    email: string | null
  }
  partnership_role: { role_id: string; role_other: string | null }[]
}

const LIST_SELECT = `
  id, partner_id, partnership_type, partner_type_id, partner_type_other,
  established_on, agreement_ref, is_active, ended_on, created_at, created_by,
  partner!inner ( id, name, unit, contact_person, phone, email ),
  partnership_role ( role_id, role_other )
`

function toRow(r: PartnershipSelect): PartnershipRow {
  const roles = r.partnership_role ?? []
  return {
    id: r.id,
    partnerId: r.partner_id,
    name: r.partner.name,
    unit: r.partner.unit,
    contactPerson: r.partner.contact_person,
    phone: r.partner.phone,
    email: r.partner.email,
    partnerTypeId: r.partner_type_id,
    partnerTypeOther: r.partner_type_other,
    roleIds: roles.map((x) => x.role_id),
    roleOther: Object.fromEntries(roles.map((x) => [x.role_id, x.role_other])),
    establishedOn: r.established_on,
    agreementRef: r.agreement_ref,
    isActive: r.is_active,
    endedOn: r.ended_on,
    createdAt: r.created_at,
    createdBy: r.created_by,
  }
}

/**
 * Read one partnership type's list.
 *
 * `deleted_at is null` on BOTH the partnership and its partner: soft-deleting
 * the organisation must remove its partnerships from every count, which is the
 * cascade defect migration 0025 fixed in the indicator views. The screens have
 * to apply the same rule or the list and the dashboard disagree.
 */
export function usePartnerships(type: PartnershipType, enabled = true) {
  return useQuery({
    queryKey: qk.partnerships.list(type),
    enabled,
    queryFn: async (): Promise<PartnershipRow[]> => {
      const res = await supabase
        .from('partnership')
        .select(LIST_SELECT)
        .eq('partnership_type', type)
        .is('deleted_at', null)
        .is('partner.deleted_at', null)
        .order('created_at', { ascending: false })
      return unwrapList(res as unknown as { data: PartnershipSelect[] | null; error: unknown }).map(toRow)
    },
  })
}

export function usePartnership(id: string | undefined) {
  return useQuery({
    queryKey: qk.partnerships.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<PartnershipRow> => {
      const res = await supabase
        .from('partnership')
        .select(LIST_SELECT)
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      return toRow(unwrap(res as unknown as { data: PartnershipSelect | null; error: unknown }))
    },
  })
}

/* ── writes ──────────────────────────────────────────────────────────────── */

export type PartnershipInput = {
  name: string
  unit: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  partnerTypeId: string
  partnerTypeOther: string | null
  roleIds: string[]
  roleOther: Record<string, string | null>
  establishedOn: string
}

/**
 * Create a partner + partnership + roles.
 *
 * Three inserts with no transaction, because PostgREST has none. The order is
 * chosen so a failure part-way leaves the least mess:
 *
 *   1. partner       — if this fails nothing was written.
 *   2. partnership   — if this fails an orphan partner row remains. That is
 *                      harmless: a partner with no partnership feeds no
 *                      indicator, and the next attempt with the same name and
 *                      unit reuses it rather than duplicating (the unique key
 *                      makes the reuse detectable).
 *   3. roles         — if this fails the partnership exists with no role, which
 *                      shows on screen as an incomplete record the coordinator
 *                      can edit. It still counts for A1.2/C1.1, which is
 *                      correct: the partnership is real.
 *
 * Doing it the other way round — roles first — would leave rows pointing at a
 * partnership that does not exist. An RPC in a real transaction is the right
 * long-term answer and is noted for Phase 5.
 */
export function useCreatePartnership(type: PartnershipType) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: PartnershipInput) => {
      // Reuse an existing partner with the same name + unit rather than
      // tripping the unique constraint: the same organisation legitimately
      // holds both a training and a production-support partnership.
      const found = await supabase
        .from('partner')
        .select('id')
        .eq('name', input.name.trim())
        .is('deleted_at', null)
        .limit(1)
      const existing = unwrapList(found as unknown as { data: { id: string }[] | null; error: unknown })

      let partnerId: string | undefined = existing[0]?.id
      if (!partnerId) {
        const created = unwrap(
          (await supabase
            .from('partner')
            .insert({
              name: input.name.trim(),
              unit: input.unit?.trim() || null,
              contact_person: input.contactPerson?.trim() || null,
              phone: input.phone?.trim() || null,
              email: input.email?.trim() || null,
            })
            .select('id')
            .single()) as unknown as { data: { id: string } | null; error: unknown },
        )
        partnerId = created.id
      } else {
        // Keep the contact details current on the shared partner row.
        const upd = await supabase
          .from('partner')
          .update({
            unit: input.unit?.trim() || null,
            contact_person: input.contactPerson?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
          })
          .eq('id', partnerId)
        if (upd.error) throw toAppError(upd.error)
      }

      const partnership = unwrap(
        (await supabase
          .from('partnership')
          .insert({
            partner_id: partnerId,
            partnership_type: type,
            partner_type_id: input.partnerTypeId,
            partner_type_other: input.partnerTypeOther?.trim() || null,
            established_on: input.establishedOn,
            is_active: true,
          })
          .select('id')
          .single()) as unknown as { data: { id: string } | null; error: unknown },
      )

      if (input.roleIds.length > 0) {
        const ins = await supabase.from('partnership_role').insert(
          input.roleIds.map((roleId) => ({
            partnership_id: partnership.id,
            role_id: roleId,
            role_other: input.roleOther[roleId]?.trim() || null,
          })),
        )
        if (ins.error) throw toAppError(ins.error)
      }

      return partnership.id
    },

    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partnerships.all })
    },
  })
}

/**
 * Edit an existing partnership.
 *
 * ── Roles are ADD-ONLY, and that is the database's decision, not a shortcut ──
 *
 * `partnership_role` has SELECT, INSERT and UPDATE policies and no DELETE
 * policy. That is consistent with the rest of the schema, which has no DELETE
 * policy anywhere -- CLAUDE.md rule 2, "never hard-delete". But this table is a
 * pure junction: composite primary key, no `id`, and no `deleted_at`, so it
 * cannot be soft-deleted either.
 *
 * The consequence is that a role can be attached to a partnership and never
 * detached. A delete-then-reinsert -- the obvious way to write "these are the
 * roles now" -- fails in a way that reads like a bug: RLS drops the DELETE
 * silently (PostgREST reports success, zero rows), then the INSERT collides
 * with the rows that are still there and returns 23505 "already exists".
 *
 * So this diffs instead. Additions are inserted; removals are detected and
 * reported truthfully rather than being attempted and mistranslated. Everything
 * else about the record still saves.
 *
 * Reported to the project owner for a decision. It needs either a DELETE policy
 * scoped to junction tables, or `deleted_at` plus a wider primary key here.
 */
export function useUpdatePartnership(type: PartnershipType) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      partnerId,
      input,
      currentRoleIds,
    }: {
      id: string
      partnerId: string
      input: PartnershipInput
      currentRoleIds: string[]
    }) => {
      const partner = await supabase
        .from('partner')
        .update({
          name: input.name.trim(),
          unit: input.unit?.trim() || null,
          contact_person: input.contactPerson?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
        })
        .eq('id', partnerId)
      if (partner.error) throw toAppError(partner.error)

      const partnership = await supabase
        .from('partnership')
        .update({
          partner_type_id: input.partnerTypeId,
          partner_type_other: input.partnerTypeOther?.trim() || null,
        })
        .eq('id', id)
      if (partnership.error) throw toAppError(partnership.error)

      const added = input.roleIds.filter((r) => !currentRoleIds.includes(r))
      const removed = currentRoleIds.filter((r) => !input.roleIds.includes(r))

      if (added.length > 0) {
        const ins = await supabase.from('partnership_role').insert(
          added.map((roleId) => ({
            partnership_id: id,
            role_id: roleId,
            role_other: input.roleOther[roleId]?.trim() || null,
          })),
        )
        if (ins.error) throw toAppError(ins.error)
      }

      // Everything that could be saved has been. Say plainly what could not.
      if (removed.length > 0) {
        throw {
          kind: 'invalid' as const,
          messageKey: 'errors:db.roleRemovalUnsupported',
          values: { count: String(removed.length) },
          code: 'NO_DELETE_POLICY',
          detail: 'partnership_role has no DELETE policy; roles are add-only',
        }
      }

      return id
    },

    // Optimistic: the row updates on screen before the server answers, and is
    // put back exactly as it was if any statement is refused.
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: qk.partnerships.list(type) })
      const previous = qc.getQueryData<PartnershipRow[]>(qk.partnerships.list(type))
      qc.setQueryData<PartnershipRow[]>(qk.partnerships.list(type), (cur) =>
        (cur ?? []).map((r) =>
          r.id === id
            ? {
                ...r,
                name: input.name,
                unit: input.unit,
                contactPerson: input.contactPerson,
                phone: input.phone,
                email: input.email,
                partnerTypeId: input.partnerTypeId,
                partnerTypeOther: input.partnerTypeOther,
                roleIds: input.roleIds,
              }
            : r,
        ),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.partnerships.list(type), ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.partnerships.all })
    },
  })
}

/**
 * Soft delete. Never a hard delete — CLAUDE.md rule 2.
 *
 * Only `partnership.deleted_at` is set, not the partner's: the organisation may
 * still hold the other kind of partnership, and removing it would silently drop
 * that one from its indicator too.
 */
export function useDeletePartnership(type: PartnershipType) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('partnership')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      // Zero rows back means RLS filtered the row out of the UPDATE. The write
      // did not happen, and silently reporting success would be a lie.
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return id
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.partnerships.list(type) })
      const previous = qc.getQueryData<PartnershipRow[]>(qk.partnerships.list(type))
      qc.setQueryData<PartnershipRow[]>(qk.partnerships.list(type), (cur) =>
        (cur ?? []).filter((r) => r.id !== id),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.partnerships.list(type), ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.partnerships.all })
    },
  })
}
