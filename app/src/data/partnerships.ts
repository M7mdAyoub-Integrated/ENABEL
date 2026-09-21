import { useMemo } from 'react'
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
  partner!partnership_partner_id_fkey!inner ( id, name, unit, contact_person, phone, email ),
  partnership_role!partnership_role_partnership_id_fkey ( role_id, role_other )
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
 * Create or update the organisation and ONE of its partnerships.
 *
 * -- WHY ONE FUNCTION AND NOT A CREATE PLUS AN UPDATE --
 *
 * The merged form has partnership type as a FIELD, so "save" means four
 * different things depending on what is already on file:
 *
 *   new organisation                  -> insert partner, insert partnership
 *   known organisation, new type      -> reuse partner, insert partnership
 *   known organisation, type it holds -> reuse partner, update partnership
 *   known organisation, details only  -> reuse partner, update partnership
 *
 * The second row is the one the merge exists for. Two separate forms made it
 * awkward to reach: the only way to give a training partner a
 * production-support agreement was to type its name into the other form, and
 * that form matched an existing organisation on NAME ALONE while the unique
 * index is on (name, unit). Two units of one university would have been
 * collapsed into one partner, and the second unit's details would have
 * overwritten the first's.
 *
 * `partnership_partner_type_live` -- unique on `(partner_id, partnership_type)`
 * where not deleted -- is what makes "the type it holds" a single row to update
 * rather than a set. The database has always been shaped for this.
 *
 * -- STILL THREE WRITES WITH NO TRANSACTION --
 *
 * PostgREST has none, so the order is chosen so a failure part-way leaves the
 * least mess, exactly as before: partner, then partnership, then roles. A
 * partner with no partnership feeds no indicator and is picked up by the next
 * attempt; a partnership with no role still counts for A1.2/C1.1, which is
 * correct because the partnership is real. An RPC in a real transaction is the
 * right long-term answer and is noted for Phase 5.
 */
export type SavePartnerInput = PartnershipInput & { partnershipType: PartnershipType }

export function useSavePartner() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      partnerId,
      input,
    }: {
      /** Absent when the form is creating an organisation from scratch. */
      partnerId?: string
      input: SavePartnerInput
    }) => {
      const unit = input.unit?.trim() || null
      const fields = {
        unit,
        contact_person: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
      }

      // Find or create the ORGANISATION. Matched on (name, unit) because that
      // is the unique index -- `partner_name_unique` is NULLS NOT DISTINCT on
      // the pair, so two units of one university are two partners, and matching
      // on name alone would silently merge them and split nothing back apart.
      let id = partnerId
      if (!id) {
        const q = supabase
          .from('partner')
          .select('id')
          .eq('name', input.name.trim())
          .is('deleted_at', null)
        const found = await (unit === null ? q.is('unit', null) : q.eq('unit', unit)).limit(1)
        id = unwrapList(
          found as unknown as { data: { id: string }[] | null; error: unknown },
        )[0]?.id
      }

      if (!id) {
        const created = unwrap(
          (await supabase
            .from('partner')
            .insert({ name: input.name.trim(), ...fields })
            .select('id')
            .single()) as unknown as { data: { id: string } | null; error: unknown },
        )
        id = created.id
      } else {
        const upd = await supabase
          .from('partner')
          .update({ name: input.name.trim(), ...fields })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
        if (upd.error) throw toAppError(upd.error)
        // RLS filters an update it will not permit rather than raising, so the
        // statement reports success having changed nothing. Count what came back.
        if (!upd.data || upd.data.length === 0) {
          throw toAppError({ code: '42501', message: 'partner update matched no visible row' })
        }
      }

      // Does this organisation already hold a partnership of the chosen type?
      const held = await supabase
        .from('partnership')
        .select('id')
        .eq('partner_id', id)
        .eq('partnership_type', input.partnershipType)
        .is('deleted_at', null)
        .maybeSingle()
      if (held.error) throw toAppError(held.error)
      let partnershipId: string | undefined = held.data?.id

      let currentRoleIds: string[] = []
      let currentRoleOther: Record<string, string | null> = {}
      if (partnershipId) {
        const roles = await supabase
          .from('partnership_role')
          .select('role_id, role_other')
          .eq('partnership_id', partnershipId)
        if (roles.error) throw toAppError(roles.error)
        currentRoleIds = (roles.data ?? []).map((r) => r.role_id as string)
        currentRoleOther = Object.fromEntries(
          (roles.data ?? []).map((r) => [r.role_id as string, (r.role_other as string | null) ?? null]),
        )

        const upd = await supabase
          .from('partnership')
          .update({
            partner_type_id: input.partnerTypeId,
            partner_type_other: input.partnerTypeOther?.trim() || null,
            established_on: input.establishedOn,
          })
          .eq('id', partnershipId)
          .is('deleted_at', null)
          .select('id')
        if (upd.error) throw toAppError(upd.error)
        if (!upd.data || upd.data.length === 0) {
          throw toAppError({ code: '42501', message: 'partnership update matched no visible row' })
        }
      } else {
        const created = unwrap(
          (await supabase
            .from('partnership')
            .insert({
              partner_id: id,
              partnership_type: input.partnershipType,
              partner_type_id: input.partnerTypeId,
              partner_type_other: input.partnerTypeOther?.trim() || null,
              established_on: input.establishedOn,
              is_active: true,
            })
            .select('id')
            .single()) as unknown as { data: { id: string } | null; error: unknown },
        )
        partnershipId = created.id
      }

      const added = input.roleIds.filter((r) => !currentRoleIds.includes(r))
      const removed = currentRoleIds.filter((r) => !input.roleIds.includes(r))
      // A role kept across the edit whose free text changed. `role_other` lives
      // on the junction row, so it is an UPDATE of that row, counted back.
      const retexted = input.roleIds.filter(
        (r) =>
          currentRoleIds.includes(r) &&
          (input.roleOther[r]?.trim() || null) !== (currentRoleOther[r] ?? null),
      )
      for (const roleId of retexted) {
        const upd = await supabase
          .from('partnership_role')
          .update({ role_other: input.roleOther[roleId]?.trim() || null })
          .eq('partnership_id', partnershipId)
          .eq('role_id', roleId)
          .select('role_id')
        if (upd.error) throw toAppError(upd.error)
        if (!upd.data || upd.data.length === 0) {
          throw toAppError({ code: '42501', message: 'partnership_role update matched no visible row' })
        }
      }

      if (added.length > 0) {
        const ins = await supabase.from('partnership_role').insert(
          added.map((roleId) => ({
            partnership_id: partnershipId,
            role_id: roleId,
            role_other: input.roleOther[roleId]?.trim() || null,
          })),
        )
        if (ins.error) throw toAppError(ins.error)
      }

      if (removed.length > 0) {
        // `.select()` so the deleted rows come BACK. Without it PostgREST
        // reports success on a delete RLS filtered to nothing, which is exactly
        // how this table stayed append-only for months while a comment
        // described the problem instead of a check catching it. Fixed in 0081.
        const del = await supabase
          .from('partnership_role')
          .delete()
          .eq('partnership_id', partnershipId)
          .in('role_id', removed)
          .select('role_id')
        if (del.error) throw toAppError(del.error)
        if ((del.data?.length ?? 0) !== removed.length) {
          throw toAppError({
            code: '42501',
            message:
              'expected to remove ' + removed.length + ' partnership_role rows, removed ' +
              (del.data?.length ?? 0) + ' -- a delete RLS refuses reports success',
          })
        }
      }

      return { partnerId: id, partnershipId }
    },

    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partnerships.all })
      // A1.2 counts training partnerships and C1.1 production-support ones, so
      // a new partnership moves whichever matches. G0.4 counts the PARTNER and
      // does not move until that partner contributes.
      void qc.invalidateQueries({ queryKey: ['indicators'] })
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

/* ── the merged partner view ──────────────────────────────────────────────── */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ONE ORGANISATION, ONE ROW.
 *
 *  Everything above this line is keyed on a PARTNERSHIP. That is the right key
 *  for A1.2 and C1.1, which count partnerships of one type each — and it was
 *  the wrong key for a screen, because it showed one organisation twice under
 *  two headings and gave a coordinator no way to see that they were the same
 *  body. Worse, it invited a second `partner` row: two forms, two "Name of
 *  Partner" fields, and only a unique index between them and a split history.
 *
 *  So the SCREENS are keyed on the partner and the INDICATORS stay keyed on the
 *  partnership. The type has not stopped doing work — `partnership_type` is
 *  still what separates A1.2 from C1.1, and `partnership_partner_type_live`
 *  (unique on `(partner_id, partnership_type) where deleted_at is null`) is
 *  still what lets one organisation hold one of each and no more.
 *
 *  G0.4 is the reason this matters beyond tidiness: it counts distinct
 *  PARTNERS, not partnerships, so an organisation that trains and buys is one.
 *  A screen that presents it as two teaches the opposite.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** One partnership held by an organisation, as the merged screens see it. */
export type HeldPartnership = {
  id: string
  type: PartnershipType
  partnerTypeId: string
  partnerTypeOther: string | null
  roleIds: string[]
  roleOther: Record<string, string | null>
  establishedOn: string
  agreementRef: string | null
  isActive: boolean
  endedOn: string | null
}

export type PartnerRow = {
  /** The PARTNER id. `/forms/pn/:id` is an organisation, not a partnership. */
  id: string
  name: string
  unit: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  createdAt: string
  /** Live partnerships, newest first. Empty is possible and is not an error. */
  partnerships: HeldPartnership[]
}

type PartnerSelect = {
  id: string
  name: string
  unit: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  created_at: string
  partnership: {
    id: string
    partnership_type: PartnershipType
    partner_type_id: string
    partner_type_other: string | null
    established_on: string
    agreement_ref: string | null
    is_active: boolean
    ended_on: string | null
    deleted_at: string | null
    partnership_role: { role_id: string; role_other: string | null }[]
  }[] | null
}

const PARTNER_SELECT = `
  id, name, unit, contact_person, phone, email, created_at,
  partnership!partnership_partner_id_fkey (
    id, partnership_type, partner_type_id, partner_type_other, established_on,
    agreement_ref, is_active, ended_on, deleted_at,
    partnership_role!partnership_role_partnership_id_fkey ( role_id, role_other )
  )
`

function toPartnerRow(r: PartnerSelect): PartnerRow {
  return {
    id: r.id,
    name: r.name,
    unit: r.unit,
    contactPerson: r.contact_person,
    phone: r.phone,
    email: r.email,
    createdAt: r.created_at,
    // Soft-deleted partnerships are filtered HERE, not in the select.
    // PostgREST applies a filter on an embedded table to the PARENT row, so
    // `.is('partnership.deleted_at', null)` would drop organisations that hold
    // no live partnership at all -- which are exactly the ones a coordinator
    // most needs to find. Same trap as useInitiativesForPerson in linkage.ts.
    partnerships: (r.partnership ?? [])
      .filter((p) => p.deleted_at === null)
      .map((p) => ({
        id: p.id,
        type: p.partnership_type,
        partnerTypeId: p.partner_type_id,
        partnerTypeOther: p.partner_type_other,
        roleIds: (p.partnership_role ?? []).map((x) => x.role_id),
        roleOther: Object.fromEntries(
          (p.partnership_role ?? []).map((x) => [x.role_id, x.role_other]),
        ),
        establishedOn: p.established_on,
        agreementRef: p.agreement_ref,
        isActive: p.is_active,
        endedOn: p.ended_on,
      }))
      .sort((a, b) => b.establishedOn.localeCompare(a.establishedOn)),
  }
}

export function usePartners(enabled = true) {
  return useQuery({
    queryKey: [...qk.partnerships.all, 'partners'],
    enabled,
    queryFn: async (): Promise<PartnerRow[]> => {
      const res = await supabase
        .from('partner')
        .select(PARTNER_SELECT)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      return unwrapList(
        res as unknown as { data: PartnerSelect[] | null; error: unknown },
      ).map(toPartnerRow)
    },
  })
}

export function usePartner(partnerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...qk.partnerships.all, 'partner', partnerId ?? ''],
    enabled: enabled && !!partnerId,
    queryFn: async (): Promise<PartnerRow> => {
      const res = await supabase
        .from('partner')
        .select(PARTNER_SELECT)
        .eq('id', partnerId!)
        .is('deleted_at', null)
        .maybeSingle()
      return toPartnerRow(
        unwrap(res as unknown as { data: PartnerSelect | null; error: unknown }),
      )
    },
  })
}

/**
 * Options for a partner dropdown, with the partnership type beside each.
 *
 * One entry per PARTNERSHIP, because that is what a market linkage points at
 * (`market_linkage.partnership_id`). An organisation holding both types
 * therefore appears twice — correctly, because the two are different
 * agreements and the coordinator is choosing one of them.
 *
 * Nothing is filtered by type. A training partner that also buys is a real
 * shape the schema anticipates, and refusing it here would be a rule we
 * invented; the type is SHOWN so the choice is informed instead. See OQ-29.
 */
export type PartnershipOption = {
  partnershipId: string
  partnerId: string
  name: string
  unit: string | null
  type: PartnershipType
  isActive: boolean
}

export function usePartnershipOptions(enabled = true) {
  const q = usePartners(enabled)
  const options = useMemo((): PartnershipOption[] => {
    const out: PartnershipOption[] = []
    for (const p of q.data ?? []) {
      for (const ps of p.partnerships) {
        out.push({
          partnershipId: ps.id,
          partnerId: p.id,
          name: p.name,
          unit: p.unit,
          type: ps.type,
          isActive: ps.isActive,
        })
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type))
  }, [q.data])
  return { ...q, options }
}

/**
 * Soft delete the ORGANISATION. Coordinator only, via `guard_soft_delete`.
 *
 * This is a bigger act than removing one agreement, and the screen has to say
 * so: every indicator view filters `partner.deleted_at is null`, so deleting
 * the partner takes ALL its partnerships out of A1.2 and C1.1 at once, and
 * every contribution it ever made out of G0.4 -- including in quarters that
 * have already been reported.
 *
 * Removing a single agreement is `useDeletePartnership`, offered per block on
 * the partnerships panel. Two different actions, deliberately not one control.
 *
 * The partner row is NOT recreated afterwards if the same name comes back: its
 * unique index is global on purpose (CLAUDE.md rule 2), so a returning
 * organisation is RESTORED. That path is still unbuilt -- see 06 OQ-24.
 */
export function useDeletePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (partnerId: string) => {
      const res = await supabase
        .from('partner')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', partnerId)
        .is('deleted_at', null)
        .select('id')
      if (res.error) throw toAppError(res.error)
      // RLS filters an update it will not permit rather than raising, so the
      // statement reports success having changed nothing. Count what came back.
      if (!res.data || res.data.length === 0) {
        throw toAppError({ code: '42501', message: 'update matched no visible row' })
      }
      return partnerId
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partnerships.all })
      void qc.invalidateQueries({ queryKey: ['contributions'] })
      void qc.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}
