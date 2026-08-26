import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import { useDetail, type DetailRecord } from '../hooks/useData'
import type { Translate } from '../i18n/tx'
import { usePartnership, type PartnershipType } from './partnerships'
import { refLabel, useRef } from './refTables'
import { formatDate } from '../lib/format'

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

export function useModuleDetail(
  module: ModuleId,
  id: string,
  t: Translate,
  locale: string,
): ModuleDetail {
  const mock = useDetail(module, id, t, locale)
  const tp = usePartnershipDetail('tp', id, module === 'tp', t, locale)
  const pp = usePartnershipDetail('pp', id, module === 'pp', t, locale)

  if (module === 'tp') return tp
  if (module === 'pp') return pp
  return {
    record: mock,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => undefined,
    isLive: false,
  }
}
