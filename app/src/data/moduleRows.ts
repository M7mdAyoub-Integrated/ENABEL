import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import type { Cell, ListRow } from '../hooks/useData'
import { useListRows } from '../hooks/useData'
import type { Translate } from '../i18n/tx'
import { usePartners } from './partnerships'
import { refLabel, useRef } from './refTables'
import { useExhibitions, durationDays } from './exhibitions'
import { useCompletions } from './completions'
import { useOfficeServices } from './officeServices'
import { useGuidanceRecords } from './guidance'
import { formatShortDate } from '../lib/format'
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
 *      pn       Partners           LIVE     module 1
 *      tp / pp  (retired)          ->       redirect to pn
 *      ex       Exhibitions        LIVE     module 2
 *      tc       Training completion LIVE     module 3
 *      rg       Registrations      mock     module 4
 *      ln       Market linkages    mock     module 5
 *      fu       Follow-up          mock     module 7
 *      os       Coordination office LIVE    module 8
 *      gd       Guidance log       LIVE     module 9
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

/**
 * Partners (pn) — the merged module 1.
 *
 * ONE ROW PER ORGANISATION. The cell that used to hold a single partner type
 * now holds the partnership TYPES the organisation holds, which is what makes
 * "this body both trains and buys" visible at a glance — and it is also the
 * filter column, so a coordinator can still see just the training partners
 * without there being two lists.
 *
 * The partner type and roles differ per partnership, so they are not on the
 * list at all: showing one of two would be a coin toss and showing both would
 * need a row per partnership, which is the shape this merge removed. They are
 * on the detail screen, under the partnership they belong to.
 */
function usePartnerRows(t: Translate, enabled: boolean): ModuleRows {
  const q = usePartners(enabled)

  const rows = useMemo(
    () =>
      (q.data ?? []).map((p): ListRow => {
        const typeNames = p.partnerships.map((ps) => t(`common:enums.partnershipType.${ps.type}`))
        // A body with no live partnership feeds no indicator. Say so rather
        // than rendering an empty cell that reads like a loading state.
        const held = typeNames.length > 0 ? typeNames.join(', ') : t('forms:partner.noPartnership')
        const cells: Cell[] = [
          { kind: 'text', text: p.name, ...(p.unit ? { sub: p.unit } : {}) },
          { kind: 'text', text: held },
          { kind: 'text', text: p.contactPerson ?? '' },
          { kind: 'ltr', text: p.phone ?? '' },
          { kind: 'ltr', text: p.email ?? '' },
        ]
        return {
          id: p.id,
          // MODULES.pn.filterColumn is 1 -- the partnership types held.
          filterValue: held,
          search: [p.name, p.unit ?? '', p.contactPerson ?? '', p.phone ?? '', p.email ?? '']
            .join(' ')
            .toLowerCase(),
          cells,
        }
      }),
    [q.data, t],
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
 * `tp` and `pp` are RETIRED and redirect to `pn` (see App.tsx). They listed
 * PARTNERSHIPS, so one organisation holding both agreements appeared twice with
 * nothing saying it was the same body -- the opposite of what G0.4 counts.
 * They stay in MODULE_IDS so the redirects and their locale keys keep working;
 * they have no branch here, and a request for one falls through to the mock
 * path exactly as `rg`, `ln` and `fu` do.
 */

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

/** Training completion (tc) — module 3. */
function useCompletionRows(t: Translate, locale: string, enabled: boolean): ModuleRows {
  const q = useCompletions(enabled)
  const topics = useRef('training_topic')

  const rows = useMemo(
    () =>
      (q.data ?? []).map((c): ListRow => {
        const topic = refLabel(
          topics.find((r) => r.id === c.topicId),
          locale,
        )
        const met = c.metCriteria === true
        const cells: Cell[] = [
          { kind: 'ltr', text: c.nationalId },
          { kind: 'text', text: c.fullName },
          { kind: 'text', text: c.sex ? t(`common:enums.sex.${c.sex}`) : '' },
          { kind: 'text', text: c.ageRecorded == null ? '' : String(c.ageRecorded) },
          { kind: 'text', text: topic },
          { kind: 'text', text: formatShortDate(c.startDate, locale) },
          c.metCriteria === null
            ? { kind: 'chip', text: t('common:chips.pending'), tone: 'pending' }
            : met
              ? { kind: 'chip', text: t('common:chips.metCriteria'), tone: 'ok' }
              : { kind: 'chip', text: t('common:chips.notMet'), tone: 'err' },
        ]
        return {
          id: c.id,
          filterValue: topic,
          search: `${c.nationalId} ${c.fullName}`,
          cells,
        }
      }),
    [q.data, topics, t, locale],
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
 * Coordination office (os) — module 8.
 *
 * The list shows VISITS, one row each. It is not a list of people, and the
 * count beside it is not B1.2 -- the same farmer coming six times is six rows
 * here and one person there. Anyone reading this list as the indicator will be
 * wrong the moment somebody returns.
 */
function useOfficeRows(locale: string, enabled: boolean): ModuleRows {
  const q = useOfficeServices(enabled)
  const types = useRef('office_service_type')

  const rows = useMemo(
    () =>
      (q.data ?? []).map((o): ListRow => {
        const typeLabel = refLabel(types.find((r) => r.id === o.serviceTypeId), locale)
        const cells: Cell[] = [
          { kind: 'ltr', text: o.nationalId },
          { kind: 'text', text: o.fullName, ...(o.village ? { sub: o.village } : {}) },
          { kind: 'text', text: typeLabel },
          { kind: 'text', text: formatShortDate(o.serviceDate, locale) },
          { kind: 'text', text: o.adviser ?? '' },
        ]
        return {
          id: o.id,
          cells,
          // MODULES.os.filterColumn is 2 -- the service type.
          filterValue: typeLabel,
          // The national ID is searchable because that is how the office will
          // look someone up: a returning farmer hands over the same card.
          search: [o.nationalId, o.fullName, o.village ?? '', typeLabel, o.adviser ?? '']
            .join(' ')
            .toLowerCase(),
        }
      }),
    [q.data, types, locale],
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
 * Guidance log (gd) — module 9.
 *
 * The list shows RECORDS, one row each. It is not a list of producers and the
 * count beside it is not D0.1 -- one producer helped three times is three rows
 * here and one person there. Anyone reading this list as the indicator will be
 * wrong the moment somebody comes back.
 */
function useGuidanceRows(locale: string, enabled: boolean): ModuleRows {
  const q = useGuidanceRecords(enabled)
  const types = useRef('guidance_type')

  const rows = useMemo(
    () =>
      (q.data ?? []).map((g): ListRow => {
        const typeLabel = refLabel(types.find((r) => r.id === g.guidanceTypeId), locale)
        const cells: Cell[] = [
          { kind: 'ltr', text: g.nationalId },
          { kind: 'text', text: g.fullName, ...(g.village ? { sub: g.village } : {}) },
          { kind: 'text', text: typeLabel },
          { kind: 'text', text: formatShortDate(g.guidanceDate, locale) },
          { kind: 'text', text: g.deliveredBy ?? '' },
        ]
        return {
          id: g.id,
          cells,
          // MODULES.gd.filterColumn is 2 -- the guidance type.
          filterValue: typeLabel,
          // The national ID is searchable because that is how a returning
          // producer is found: they hand over the same card.
          search: [g.nationalId, g.fullName, g.village ?? '', typeLabel, g.deliveredBy ?? '']
            .join(' ')
            .toLowerCase(),
        }
      }),
    [q.data, types, locale],
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
  const partners = usePartnerRows(t, module === 'pn')
  const exhibitions = useExhibitionRows(t, locale, module === 'ex')
  const completions = useCompletionRows(t, locale, module === 'tc')
  const office = useOfficeRows(locale, module === 'os')
  const guidance = useGuidanceRows(locale, module === 'gd')

  if (module === 'gd') return guidance
  if (module === 'os') return office
  if (module === 'pn') return partners
  if (module === 'ex') return exhibitions
  if (module === 'tc') return completions
  return { ...MOCK, rows: mockRows }
}
