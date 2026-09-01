import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import { useDetail, type DetailRecord } from '../hooks/useData'
import type { Translate } from '../i18n/tx'
import { usePartner } from './partnerships'
import { refLabel, useRef } from './refTables'
import { formatDateRange } from '../lib/format'
import { useExhibition, durationDays } from './exhibitions'
import { useOfficeService } from './officeServices'
import { useGuidanceRecord } from './guidance'
import { useCompletion } from './completions'
import { formatShortDate } from '../lib/format'

/**
 * The detail-screen half of the migration seam. Same rules as `moduleRows`:
 * a module is live when its branch returns a real query, and every branch's
 * hooks run unconditionally so the hook order cannot shift between renders.
 */
export type ModuleDetail = {
  record: DetailRecord | null
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  isLive: boolean
}

/**
 * Partners (pn) — the merged module 1.
 *
 * The flat key/value list holds the ORGANISATION only. Partner type, roles and
 * the established date belong to a partnership, and an organisation may hold
 * two — so squeezing them in here would mean either showing one of two at
 * random or repeating every label with a type prefix. They render in their own
 * panel on the detail screen instead, one block per partnership.
 *
 * No status chip. `is_active` is per partnership, and a single chip on a body
 * holding an active training agreement and an ended production one would be
 * wrong whichever way it pointed.
 */
function usePartnerDetail(
  id: string | undefined,
  enabled: boolean,
  t: Translate,
  locale: string,
): ModuleDetail {
  const q = usePartner(enabled ? id : undefined, enabled)

  const record = useMemo((): DetailRecord | null => {
    const p = q.data
    if (!p) return null
    return {
      id: p.id,
      title: p.name,
      subtitle: p.unit ?? '',
      status: null,
      fields: [
        { labelKey: 'columns.pn.0', value: p.name },
        { labelKey: 'partner.unit', value: p.unit ?? '' },
        { labelKey: 'columns.pn.2', value: p.contactPerson ?? '' },
        { labelKey: 'columns.pn.3', value: p.phone ?? '', ltr: true },
        { labelKey: 'columns.pn.4', value: p.email ?? '', ltr: true },
      ],
      by: t('forms:detail.coordinator'),
      at: p.createdAt,
    }
  }, [q.data, t])

  void locale

  return {
    record,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

/** Exhibitions — module 2. */
function useExhibitionDetail(
  id: string | undefined,
  enabled: boolean,
  t: Translate,
  locale: string,
): ModuleDetail {
  const q = useExhibition(enabled ? id : undefined)
  const record = useMemo((): DetailRecord | null => {
    const e = q.data
    if (!e) return null
    return {
      id: e.id,
      title: e.name,
      subtitle: e.location,
      status: e.hasEnded
        ? { text: t('common:chips.held'), tone: 'mute' }
        : { text: t('common:chips.upcoming'), tone: 'warn' },
      fields: [
        { labelKey: 'columns.ex.0', value: e.name },
        { labelKey: 'columns.ex.1', value: formatDateRange(e.startDate, e.endDate, locale) },
        { labelKey: 'columns.ex.2', value: e.location },
        {
          labelKey: 'columns.ex.3',
          value: t('common:units.days', { count: durationDays(e.startDate, e.endDate) }),
        },
        { labelKey: 'columns.ex.4', value: t('common:units.booths', { count: e.boothCapacity }) },
        {
          labelKey: 'exhibition.boothsTaken',
          value: t('forms:registration.boothsTaken', {
            taken: e.boothsTaken,
            capacity: e.boothCapacity,
          }),
        },
        { labelKey: 'exhibition.sponsor', value: e.externalSponsor ?? '' },
      ],
      by: t('forms:detail.coordinator'),
      at: e.createdAt,
    }
  }, [q.data, t, locale])

  return {
    record,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

/** Training completion — module 3. */
function useCompletionDetail(
  id: string | undefined,
  enabled: boolean,
  t: Translate,
  locale: string,
): ModuleDetail {
  const q = useCompletion(enabled ? id : undefined)
  const topics = useRef('training_topic')

  const record = useMemo((): DetailRecord | null => {
    const c = q.data
    if (!c) return null
    return {
      id: c.id,
      title: c.fullName,
      subtitle: c.nationalId,
      status:
        c.metCriteria === null
          ? { text: t('common:chips.pending'), tone: 'pending' }
          : c.metCriteria
            ? { text: t('common:chips.metCriteria'), tone: 'ok' }
            : { text: t('common:chips.notMet'), tone: 'err' },
      fields: [
        { labelKey: 'columns.tc.0', value: c.nationalId, ltr: true },
        { labelKey: 'columns.tc.1', value: c.fullName },
        { labelKey: 'columns.tc.2', value: c.sex ? t(`common:enums.sex.${c.sex}`) : '' },
        { labelKey: 'columns.tc.3', value: c.ageRecorded == null ? '' : String(c.ageRecorded) },
        {
          labelKey: 'columns.tc.4',
          value: refLabel(topics.find((r) => r.id === c.topicId), locale),
        },
        { labelKey: 'columns.tc.5', value: formatShortDate(c.startDate, locale) },
        {
          labelKey: 'completion.decidedOn',
          value: c.decidedOn ? formatShortDate(c.decidedOn, locale) : '',
        },
        { labelKey: 'completion.phone', value: c.phone ?? '', ltr: true },
      ],
      by: t('forms:detail.coordinator'),
      at: c.createdAt,
    }
  }, [q.data, topics, t, locale])

  return {
    record,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

/**
 * Coordination office — module 8.
 *
 * No status chip. A visit has no decision attached to it and nothing to
 * approve; giving it a chip would invent a state the table does not have.
 */
function useOfficeDetail(
  id: string,
  enabled: boolean,
  t: Translate,
  locale: string,
): ModuleDetail {
  const q = useOfficeService(enabled ? id : undefined, enabled)
  const types = useRef('office_service_type')

  const record = useMemo(() => {
    const o = q.data
    if (!o) return null
    return {
      id: o.id,
      title: o.fullName,
      subtitle: o.nationalId,
      // No chip. A visit carries no decision and nothing to approve, and
      // inventing a status would show a state office_service does not have.
      status: null,
      fields: [
        { labelKey: 'columns.os.0', value: o.nationalId, ltr: true },
        { labelKey: 'columns.os.1', value: o.fullName },
        {
          labelKey: 'columns.os.2',
          value: refLabel(types.find((r) => r.id === o.serviceTypeId), locale),
        },
        { labelKey: 'columns.os.3', value: formatShortDate(o.serviceDate, locale) },
        { labelKey: 'columns.os.4', value: o.adviser ?? '' },
        { labelKey: 'office.village', value: o.village ?? '' },
        { labelKey: 'office.phone', value: o.phone ?? '', ltr: true },
        { labelKey: 'office.notes', value: o.notes ?? '' },
      ],
      by: t('forms:detail.coordinator'),
      at: o.createdAt,
    }
  }, [q.data, types, t, locale])

  return {
    record,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

/**
 * Guidance log — module 9.
 *
 * No status chip, for the same reason as the office: guidance carries no
 * decision and nothing to approve, and a chip would show a state
 * `guidance_record` does not have.
 */
function useGuidanceDetail(
  id: string,
  enabled: boolean,
  t: Translate,
  locale: string,
): ModuleDetail {
  const q = useGuidanceRecord(enabled ? id : undefined, enabled)
  const types = useRef('guidance_type')

  const record = useMemo(() => {
    const g = q.data
    if (!g) return null
    return {
      id: g.id,
      title: g.fullName,
      subtitle: g.nationalId,
      status: null,
      fields: [
        { labelKey: 'columns.gd.0', value: g.nationalId, ltr: true },
        { labelKey: 'columns.gd.1', value: g.fullName },
        {
          labelKey: 'columns.gd.2',
          value: refLabel(types.find((r) => r.id === g.guidanceTypeId), locale),
        },
        { labelKey: 'columns.gd.3', value: formatShortDate(g.guidanceDate, locale) },
        { labelKey: 'columns.gd.4', value: g.deliveredBy ?? '' },
        { labelKey: 'guidance.village', value: g.village ?? '' },
        { labelKey: 'guidance.phone', value: g.phone ?? '', ltr: true },
      ],
      by: t('forms:detail.coordinator'),
      at: g.createdAt,
    }
  }, [q.data, types, t, locale])

  return {
    record,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
    isLive: true,
  }
}

export function useModuleDetail(
  module: ModuleId,
  id: string,
  t: Translate,
  locale: string,
): ModuleDetail {
  const mock = useDetail(module, id, t, locale)
  const pn = usePartnerDetail(id, module === 'pn', t, locale)
  const ex = useExhibitionDetail(id, module === 'ex', t, locale)
  const tc = useCompletionDetail(id, module === 'tc', t, locale)
  const os = useOfficeDetail(id, module === 'os', t, locale)
  const gd = useGuidanceDetail(id, module === 'gd', t, locale)

  if (module === 'gd') return gd
  if (module === 'os') return os
  if (module === 'pn') return pn
  if (module === 'ex') return ex
  if (module === 'tc') return tc
  return {
    record: mock,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => undefined,
    isLive: false,
  }
}
