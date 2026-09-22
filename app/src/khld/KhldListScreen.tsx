import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PageHead, PrimaryButton, EmptyState } from '../ui/primitives'
import { DataTable, type RowAction } from '../ui/DataTable'
import { ErrorState, TableSkeleton } from '../ui/states'
import { refLabel } from '../data/refTables'
import { useKhldList, useKhldRef, usePersonNames, type KhldRow } from '../data/khld'
import { supabase } from '../lib/supabase'
import { unwrapList } from '../data/errors'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { allFields, formDef, useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { Cell, ListRow } from '../hooks/useData'

/**
 * The list behind each Khalidiyah form: reference, what it is, when, and
 * the sheet's count gate where it has one. What "counts" means is per form
 * and is read from the row's gate column -- the codes the views test (0150)
 * -- never computed here.
 */
type Column =
  | { kind: 'text' | 'date'; col: string }
  | { kind: 'ref'; col: string; ref: string; counting?: readonly string[] }
  | { kind: 'bool'; col: string }
  | { kind: 'person' | 'partner' | 'enterprise' | 'vendor' | 'volunteer' | 'activity' | 'market'; col: string }

const COLUMNS: Record<KhldFormId, Column[]> = {
  imp0: [{ kind: 'date', col: 'int_date' }, { kind: 'ref', col: 'opportunity_increase_id', ref: 'agree_scale', counting: ['strongly_agree', 'agree'] }],
  so10: [{ kind: 'partner', col: 'partner_id' }, { kind: 'date', col: 'resp_date' }, { kind: 'ref', col: 'q_improved_id', ref: 'agree_scale', counting: ['strongly_agree', 'agree'] }],
  a1: [{ kind: 'date', col: 'verif_date' }, { kind: 'text', col: 'verif_by' }],
  a2: [{ kind: 'text', col: 'reference' }, { kind: 'date', col: 'meeting_date' }, { kind: 'ref', col: 'minutes_prepared_id', ref: 'a2_minutes_prepared', counting: ['yes_filed'] }],
  a3: [{ kind: 'text', col: 'reference' }, { kind: 'text', col: 'contributor_name' }, { kind: 'date', col: 'date_pledged' }, { kind: 'ref', col: 'status_id', ref: 'a3_status', counting: ['received_full', 'partly_received'] }],
  b1: [{ kind: 'date', col: 'verif_date' }, { kind: 'text', col: 'verif_by' }],
  so20: [{ kind: 'activity', col: 'activity_id' }, { kind: 'date', col: 'feedback_date' }, { kind: 'ref', col: 'overall_satisfaction_id', ref: 'so20_overall_satisfaction', counting: ['very_satisfied', 'satisfied'] }],
  c1: [{ kind: 'text', col: 'reference' }, { kind: 'text', col: 'description' }, { kind: 'date', col: 'report_date' }, { kind: 'ref', col: 'status_id', ref: 'c1_status', counting: ['completed'] }],
  c2: [{ kind: 'text', col: 'reference' }, { kind: 'date', col: 'campaign_date' }, { kind: 'text', col: 'volunteers_total' }],
  d1: [{ kind: 'text', col: 'reference' }, { kind: 'text', col: 'event_title' }, { kind: 'date', col: 'event_date' }],
  d2: [{ kind: 'activity', col: 'activity_id' }, { kind: 'text', col: 'total_participants' }, { kind: 'ref', col: 'duplicate_check_id', ref: 'd2_duplicate_check' }],
  so30: [{ kind: 'volunteer', col: 'volunteer_id' }, { kind: 'date', col: 'period_to' }, { kind: 'ref', col: 'status_end_period_id', ref: 'so30_status_end_period' }],
  e1: [{ kind: 'date', col: 'verif_date' }, { kind: 'text', col: 'verif_by' }],
  f1: [{ kind: 'date', col: 'verif_date' }, { kind: 'text', col: 'verif_by' }],
  f2: [{ kind: 'text', col: 'reference' }, { kind: 'person', col: 'person_id' }, { kind: 'date', col: 'reg_date' }],
  f3: [{ kind: 'text', col: 'reference' }, { kind: 'date', col: 'date' }, { kind: 'text', col: 'volunteers_total' }],
  so40: [{ kind: 'vendor', col: 'vendor_id' }, { kind: 'date', col: 'int_date' }, { kind: 'ref', col: 'overall_opportunity_id', ref: 'so40_overall_opportunity', counting: ['yes_significantly', 'yes_to_some_extent'] }],
  g1: [{ kind: 'enterprise', col: 'enterprise_id' }, { kind: 'text', col: 'cycle_reference' }, { kind: 'bool', col: 'completion' }],
  g2: [{ kind: 'enterprise', col: 'enterprise_id' }, { kind: 'date', col: 'first_support_date' }, { kind: 'text', col: 'support_types_count' }],
  h1: [{ kind: 'text', col: 'reference' }, { kind: 'text', col: 'market_name' }, { kind: 'date', col: 'market_date' }],
  h2: [{ kind: 'vendor', col: 'vendor_id' }, { kind: 'market', col: 'market_id' }, { kind: 'ref', col: 'attended_id', ref: 'h2_attended', counting: ['whole', 'part'] }],
}

type Named = { id: string; label: string; personId?: string | null }

/** Names for the rows of a linked table, one query for the page. */
function useNamesOf(table: string | undefined, ids: string[]) {
  const key = ids.slice().sort().join(',')
  return useQuery({
    queryKey: ['khld', table ?? '', 'names', key],
    enabled: !!table && ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, Named>> => {
      const cols: Record<string, string> = {
        khld_partner: 'id, name',
        khld_enterprise: 'id, reference, enterprise_name, owner_person_id, owner_name',
        khld_vendor: 'id, reference, person_id',
        khld_volunteer: 'id, reference, person_id',
        khld_activity: 'id, reference, event_title',
        khld_market: 'id, reference, market_name',
      }
      const res = await ((supabase as unknown as { from: (t: string) => { select: (c: string) => { in: (c: string, v: string[]) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }> } } })
        .from(table!).select(cols[table!] ?? 'id').in('id', ids))
      const rows = unwrapList(res)
      return Object.fromEntries(rows.map((r) => {
        const ref = typeof r['reference'] === 'string' ? (r['reference'] as string) : ''
        const title = ['name', 'enterprise_name', 'event_title', 'market_name', 'owner_name'].map((c) => r[c]).find((x) => typeof x === 'string' && x) as string | undefined
        const personId = typeof r['person_id'] === 'string' ? (r['person_id'] as string) : typeof r['owner_person_id'] === 'string' ? (r['owner_person_id'] as string) : null
        return [r['id'] as string, { id: r['id'] as string, label: [ref, title].filter(Boolean).join(' · '), personId }]
      }))
    },
  })
}

const LINKED_TABLE: Record<string, string> = {
  partner: 'khld_partner', enterprise: 'khld_enterprise', vendor: 'khld_vendor', volunteer: 'khld_volunteer', activity: 'khld_activity', market: 'khld_market',
}

export function KhldListScreen() {
  const { form: fidParam } = useParams()
  const fid = fidParam as KhldFormId
  const def = formDef(fid)
  const L = useKhldLabels(fid)
  const { t, i18n } = useTranslation(['khld', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const { role } = useAuth()
  const [showDeleted, setShowDeleted] = useState(false)
  const list = useKhldList(def.table, def.filter, showDeleted)
  const cols = COLUMNS[fid]
  const refCol = cols.find((c): c is Extract<Column, { kind: 'ref' }> => c.kind === 'ref')
  const ref0 = useKhldRef(refCol?.ref)
  const linked = cols.find((c) => c.kind in LINKED_TABLE)
  const linkedTable = linked ? LINKED_TABLE[linked.kind] : undefined
  const linkedIds = useMemo(
    () => (linked ? Array.from(new Set((list.data ?? []).map((r) => r[linked.col]).filter((x): x is string => typeof x === 'string'))) : []),
    [list.data, linked],
  )
  const names = useNamesOf(linkedTable, linkedIds)
  const personIds = useMemo(() => {
    const direct = cols.some((c) => c.kind === 'person') ? (list.data ?? []).map((r) => r['person_id']).filter((x): x is string => typeof x === 'string') : []
    const viaLinked = Object.values(names.data ?? {}).map((n) => n.personId).filter((x): x is string => typeof x === 'string')
    return Array.from(new Set([...direct, ...viaLinked]))
  }, [list.data, cols, names.data])
  const people = usePersonNames(personIds)
  // the gate column the sheet marks (labels.ts knows which field is `counting`)
  const gateLabel = useMemo(() => allFields(def).find((f) => f.counting), [def])

  const rows: ListRow[] = useMemo(() => {
    return (list.data ?? []).map((r: KhldRow) => {
      const cells: Cell[] = cols.map((c) => {
        const v = r[c.col]
        if (c.kind === 'person') {
          const p = typeof v === 'string' ? people.data?.[v] : undefined
          return { kind: 'text', text: p?.full_name ?? '…', ...(p ? { sub: p.national_id ?? p.unhcr_number ?? '' } : {}) }
        }
        if (c.kind in LINKED_TABLE) {
          const n = typeof v === 'string' ? names.data?.[v] : undefined
          const who = n?.personId ? people.data?.[n.personId]?.full_name : undefined
          return { kind: 'text', text: n ? [n.label, who].filter(Boolean).join(' · ') || n.id.slice(0, 8) : typeof v === 'string' ? '…' : '—' }
        }
        if (c.kind === 'date') return { kind: 'text', text: typeof v === 'string' ? formatShortDate(v, locale) : '—' }
        if (c.kind === 'bool') {
          if (v == null) return { kind: 'chip', text: t('khld:form.undecided'), tone: 'pending' }
          return { kind: 'chip', text: v ? t('khld:detail.counts') : t('khld:detail.notCounts'), tone: v ? 'ok' : 'mute' }
        }
        if (c.kind === 'ref') {
          const row = (ref0.data ?? []).find((x) => x.id === v)
          if (!row) return { kind: 'text', text: '—' }
          if (c.counting) return { kind: 'chip', text: refLabel(row, locale), tone: c.counting.includes(row.code) ? 'ok' : 'mute' }
          return { kind: 'text', text: refLabel(row, locale) }
        }
        if (c.col === 'reference') return { kind: 'ltr', text: typeof v === 'string' ? v : '—' }
        return { kind: 'text', text: v == null ? '—' : String(v) }
      })
      if (r.deleted_at) cells.push({ kind: 'chip', text: t('khld:list.deleted'), tone: 'err' })
      return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
    })
  }, [list.data, cols, names.data, people.data, ref0.data, locale, t])

  const columns = cols.map((c) =>
    c.kind === 'person' ? t('khld:list.columns.person')
    : c.kind === 'partner' ? t('khld:list.columns.partner')
    : c.kind === 'enterprise' ? t('khld:list.columns.enterprise')
    : c.kind in LINKED_TABLE ? t('khld:list.columns.linked')
    : c.kind === 'date' ? t('khld:list.columns.date')
    : c.kind === 'bool' || (c.kind === 'ref' && c.counting) ? (gateLabel ? L.label(gateLabel) : t('khld:list.columns.counts'))
    : c.kind === 'ref' ? t('khld:list.columns.status')
    : c.col === 'reference' ? t('khld:list.columns.reference')
    : t('khld:list.columns.title'),
  )
  if (showDeleted) columns.push(t('khld:list.columns.status'))

  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open', { defaultValue: 'Open' }), onSelect: () => navigate(`/khld/${fid}/${row.id}`) },
  ]

  return (
    <>
      <PageHead
        eyebrow={L.code}
        title={L.title}
        description={L.calc}
        action={can(role, 'record.create') ? <PrimaryButton onClick={() => navigate(`/khld/${fid}/new`)}>{t('khld:list.new')}</PrimaryButton> : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink pb-2">
        <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
          {list.data ? t('khld:list.count', { count: list.data.length }) : ''}
        </span>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          {t('khld:list.showDeleted')}
        </label>
      </div>
      {list.isLoading ? <TableSkeleton columns={columns.length} /> : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && list.data.length === 0 ? (
        <div className="mt-[18px]">
          <EmptyState title={t('khld:list.empty')} description={t('khld:list.emptyBody')} />
        </div>
      ) : null}
      {list.data && list.data.length > 0 ? <DataTable columns={columns} rows={rows} actions={actions} recordLabel={L.short} /> : null}
    </>
  )
}

export default KhldListScreen
