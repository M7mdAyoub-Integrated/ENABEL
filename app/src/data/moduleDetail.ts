import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import { useDetail, type DetailRecord } from '../hooks/useData'
import type { Translate } from '../i18n/tx'
import { usePartnership, type PartnershipType } from './partnerships'
import { refLabel, useRef } from './refTables'
import { formatDate, formatDateRange } from '../lib/format'
import { useExhibition, durationDays } from './exhibitions'
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

function usePartnershipDetail(
  module: 'tp' | 'pp',
  id: string | undefined,
  enabled: boolean,
  t: Translate,
  locale: string,
): ModuleDetail {
  const type: PartnershipType = module === 'tp' ? 'training' : 'production_support'
  const q = usePartnership(enabled ? id : undefined)
  const training = type === 'training'
  const types = useRef(training ? 'partner_type_training' : 'partner_type_production')
  const roles = useRef(training ? 'partner_role_training' : 'partner_role_production')

  const record = useMemo((): DetailRecord | null => {
    const p = q.data
    if (!p) return null

    const typeRow = types.find((r) => r.id === p.partnerTypeId)
    const typeText =
      typeRow?.allows_free_text && p.partnerTypeOther
        ? p.partnerTypeOther
        : refLabel(typeRow, locale)
    const roleText = p.roleIds
      .map((rid) => {
        const row = roles.find((r) => r.id === rid)
        if (row?.allows_free_text && p.roleOther[rid]) return p.roleOther[rid] as string
        return refLabel(row, locale)
      })
      .filter(Boolean)
      .join(', ')

    return {
      id: p.id,
      title: p.name,
      subtitle: p.unit ?? '',
      status: p.isActive
        ? { text: t('common:chips.active'), tone: 'ok' }
        : { text: t('common:chips.ended'), tone: 'mute' },
      fields: [
        { labelKey: `columns.${module}.0`, value: p.name },
        { labelKey: `columns.${module}.1`, value: typeText },
        { labelKey: `columns.${module}.2`, value: roleText },
        { labelKey: `columns.${module}.3`, value: p.contactPerson ?? '' },
        { labelKey: `columns.${module}.4`, value: p.phone ?? '', ltr: true },
        { labelKey: 'partner.email', value: p.email ?? '', ltr: true },
        { labelKey: 'detail.established', value: formatDate(new Date(p.establishedOn), locale) },
      ],
      by: t('forms:detail.coordinator'),
      at: p.createdAt,
    }
  }, [q.data, types, roles, locale, module, t])

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

export function useModuleDetail(
  module: ModuleId,
  id: string,
  t: Translate,
  locale: string,
): ModuleDetail {
  const mock = useDetail(module, id, t, locale)
  const tp = usePartnershipDetail('tp', id, module === 'tp', t, locale)
  const pp = usePartnershipDetail('pp', id, module === 'pp', t, locale)
  const ex = useExhibitionDetail(id, module === 'ex', t, locale)
  const tc = useCompletionDetail(id, module === 'tc', t, locale)

  if (module === 'tp') return tp
  if (module === 'pp') return pp
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
