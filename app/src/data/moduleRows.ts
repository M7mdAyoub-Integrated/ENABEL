import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import type { Cell, ListRow } from '../hooks/useData'
import { useListRows } from '../hooks/useData'
import type { Translate } from '../i18n/tx'
import { usePartnerships, type PartnershipType } from './partnerships'
import { refLabel, useRef } from './refTables'
import { useExhibitions, durationDays } from './exhibitions'
import { formatDateRange } from '../lib/format'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The migration seam.
 *
 *  Phase 4 replaces the mock data one module at a time. This file is where a
 *  module crosses over: everything above it (ListScreen, DataTable) is
 *  unchanged, and everything below it is either a real query or the old mock.
 *
 *  A module is live when its branch returns a real query result. Anything still
 *  on `useListRows` is still reading `mocks/data.ts`.
 *
 *      MODULE                      STATUS
 *      tp / pp  Partnerships       LIVE     module 1
 *      ex       Exhibitions        LIVE     module 2
 *      tc       Training completion mock    module 3
 *      rg       Registrations      mock     module 4
 *      ln       Market linkages    mock     module 5
 *      fu       Follow-up          mock     module 7
 *
 *  Keep this table honest. It is the only quick answer to "is this screen
 *  showing real rows?", and a wrong answer here is how a demo turns into a
 *  claim that the platform is further along than it is.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ModuleRows = {
  rows: ListRow[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  /** False while a module is still reading the mock file. */
  isLive: boolean
}

const MOCK: Omit<ModuleRows, 'rows'> = {
  isLoading: false,
  isError: false,
  error: null,
  refetch: () => undefined,
  isLive: false,
}

/** Partnerships (tp, pp) — module 1. */
function usePartnershipRows(type: PartnershipType, locale: string, enabled: boolean): ModuleRows {
  const q = usePartnerships(type, enabled)
  const training = type === 'training'
  const types = useRef(training ? 'partner_type_training' : 'partner_type_production')
  const roles = useRef(training ? 'partner_role_training' : 'partner_role_production')

  const rows = useMemo(() => {
    const typeLabel = (id: string, other: string | null) => {
      const row = types.find((r) => r.id === id)
      // An "Other (please specify)" option shows what was actually typed, not
      // the word "Other" -- the free text IS the answer for those rows.
      if (row?.allows_free_text && other) return other
      return refLabel(row, locale)
    }
    const roleLabel = (ids: string[], other: Record<string, string | null>) =>
      ids
        .map((id) => {
          const row = roles.find((r) => r.id === id)
          if (row?.allows_free_text && other[id]) return other[id] as string
          return refLabel(row, locale)
        })
        .filter(Boolean)
        .join(', ')

    return (q.data ?? []).map((p): ListRow => {
      const t = typeLabel(p.partnerTypeId, p.partnerTypeOther)
      const cells: Cell[] = [
        { kind: 'text', text: p.name, ...(p.unit ? { sub: p.unit } : {}) },
        { kind: 'text', text: t },
        { kind: 'text', text: roleLabel(p.roleIds, p.roleOther) },
        { kind: 'text', text: p.contactPerson ?? '' },
        { kind: 'ltr', text: p.phone ?? '' },
      ]
      return {
        id: p.id,
        filterValue: t,
        search: `${p.name} ${p.unit ?? ''} ${p.contactPerson ?? ''} ${p.phone ?? ''}`,
        cells,
      }
    })
  }, [q.data, types, roles, locale])

  return {
    rows,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

/** Exhibitions (ex) — module 2. */
function useExhibitionRows(t: Translate, locale: string, enabled: boolean): ModuleRows {
  const q = useExhibitions(enabled)

  const rows = useMemo(
    () =>
      (q.data ?? []).map((e): ListRow => {
        const held = e.hasEnded
        const status = held ? t('common:chips.held') : t('common:chips.upcoming')
        const cells: Cell[] = [
          { kind: 'text', text: e.name },
          { kind: 'text', text: formatDateRange(e.startDate, e.endDate, locale) },
          { kind: 'text', text: e.location },
          { kind: 'text', text: t('common:units.days', { count: durationDays(e.startDate, e.endDate) }) },
          { kind: 'text', text: t('common:units.booths', { count: e.boothCapacity }) },
          held
            ? { kind: 'chip', text: status, tone: 'mute' }
            : { kind: 'chip', text: status, tone: 'warn' },
        ]
        return {
          id: e.id,
          filterValue: status,
          search: `${e.name} ${e.location} ${e.externalSponsor ?? ''}`,
          cells,
        }
      }),
    [q.data, t, locale],
  )

  return {
    rows,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

/**
 * Rows for a module's list screen.
 *
 * EVERY branch's hooks run on EVERY render, and the inactive ones are disabled
 * rather than skipped. React Router reuses this component when the `:module`
 * param changes -- /forms/tp to /forms/pp is not a remount -- so calling a hook
 * conditionally would reorder hooks between renders and corrupt state. The
 * disabled queries cost nothing: TanStack Query does not fetch them.
 */
export function useModuleRows(module: ModuleId, t: Translate, locale: string): ModuleRows {
  const mockRows = useListRows(module, t, locale)
  const training = usePartnershipRows('training', locale, module === 'tp')
  const production = usePartnershipRows('production_support', locale, module === 'pp')
  const exhibitions = useExhibitionRows(t, locale, module === 'ex')

  if (module === 'tp') return training
  if (module === 'pp') return production
  if (module === 'ex') return exhibitions
  return { ...MOCK, rows: mockRows }
}
