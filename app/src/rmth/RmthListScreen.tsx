import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PageHead, PrimaryButton, EmptyState } from '../ui/primitives'
import { DataTable, type RowAction } from '../ui/DataTable'
import { ErrorState, TableSkeleton } from '../ui/states'
import { refLabel } from '../data/refTables'
import { useRmthList, useRmthRef, type RmthRow } from '../data/rmth'
import { supabase } from '../lib/supabase'
import { unwrapList } from '../data/errors'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { formDef, useRmthLabels } from './labels'
import type { RmthFormId } from './forms.generated'
import type { Cell, ListRow } from '../hooks/useData'

/**
 * The list behind each Ramtha form: reference, what it is, when, and whether
 * it counts. What "counts" means is per form and comes from the sheet's
 * counting field, read from the row -- never computed here.
 */
type Column = { col: string; kind: 'text' | 'date' | 'bool' | 'ref' | 'person'; ref?: string }

const COLUMNS: Record<RmthFormId, Column[]> = {
  imp0: [{ col: 'person_id', kind: 'person' }, { col: 'contact_date', kind: 'date' }, { col: 'imp0_criterion_id', kind: 'ref', ref: 'imp0_criterion' }],
  so10: [{ col: 'person_id', kind: 'person' }, { col: 'contact_date', kind: 'date' }, { col: 'so10_threshold_id', kind: 'ref', ref: 'so10_threshold' }],
  a12: [{ col: 'reference', kind: 'text' }, { col: 'title', kind: 'text' }, { col: 'start_date', kind: 'date' }, { col: 'solely_guidance', kind: 'bool' }],
  a13: [{ col: 'reference', kind: 'text' }, { col: 'title', kind: 'text' }, { col: 'start_date', kind: 'date' }],
  b1: [{ col: 'entity_name', kind: 'text' }, { col: 'interviewed_on', kind: 'date' }, { col: 'any_essential', kind: 'bool' }],
  b11: [{ col: 'reference', kind: 'text' }, { col: 'title', kind: 'text' }, { col: 'completed_on', kind: 'date' }, { col: 'tailoring_met', kind: 'bool' }],
  b12: [{ col: 'reference', kind: 'text' }, { col: 'title', kind: 'text' }, { col: 'submitted_on', kind: 'date' }, { col: 'decision_id', kind: 'ref', ref: 'b12_decision' }],
  so20: [{ col: 'person_id', kind: 'person' }, { col: 'contact_date', kind: 'date' }, { col: 'so20_outcome_id', kind: 'ref', ref: 'so20_outcome' }],
  so2c1: [{ col: 'person_id', kind: 'person' }, { col: 'contact_date', kind: 'date' }, { col: 'headline_id', kind: 'ref', ref: 'so2c1_headline' }],
  c11: [{ col: 'reference', kind: 'text' }, { col: 'title', kind: 'text' }, { col: 'start_date', kind: 'date' }, { col: 'joint_development_met', kind: 'bool' }],
  c12: [{ col: 'person_id', kind: 'person' }, { col: 'created_at', kind: 'date' }, { col: 'met_criteria', kind: 'bool' }],
  so30: [{ col: 'person_id', kind: 'person' }, { col: 'contact_date', kind: 'date' }, { col: 'so30_criterion_id', kind: 'ref', ref: 'so30_criterion' }],
  e01: [{ col: 'reference', kind: 'text' }, { col: 'name', kind: 'text' }, { col: 'achieved_on', kind: 'date' }, { col: 'established_id', kind: 'ref', ref: 'e01_status' }],
  e02: [{ col: 'person_id', kind: 'person' }, { col: 'admitted_on', kind: 'date' }, { col: 'status_id', kind: 'ref', ref: 'e02_status' }],
  e03: [{ col: 'person_id', kind: 'person' }, { col: 'created_at', kind: 'date' }, { col: 'met_criteria', kind: 'bool' }],
  f01: [{ col: 'person_id', kind: 'person' }, { col: 'created_at', kind: 'date' }, { col: 'met_criteria', kind: 'bool' }],
  f02: [{ col: 'reference', kind: 'text' }, { col: 'title', kind: 'text' }, { col: 'completed_on', kind: 'date' }, { col: 'development_complete_id', kind: 'ref', ref: 'f02_complete' }],
}

/** Names for the person-level lists, one query for the page. */
function usePersonNames(ids: string[]) {
  const key = ids.slice().sort().join(',')
  return useQuery({
    queryKey: ['people', 'names', key],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, { full_name: string; national_id: string }>> => {
      const res = await (supabase.from('person').select('id, full_name, national_id').in('id', ids) as unknown as Promise<{ data: { id: string; full_name: string; national_id: string }[] | null; error: unknown }>)
      const rows = unwrapList(res)
      return Object.fromEntries(rows.map((r) => [r.id, { full_name: r.full_name, national_id: r.national_id }]))
    },
  })
}

export function RmthListScreen() {
  const { form: fidParam } = useParams()
  const fid = fidParam as RmthFormId
  const def = formDef(fid)
  const L = useRmthLabels(fid)
  const { t, i18n } = useTranslation(['rmth', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const { role } = useAuth()
  const [showDeleted, setShowDeleted] = useState(false)
  const list = useRmthList(def.table, def.filter, showDeleted)
  const cols = COLUMNS[fid]
  const refCols = cols.filter((c) => c.kind === 'ref')
  const ref0 = useRmthRef(refCols[0]?.ref)
  const personIds = useMemo(
    () => (cols.some((c) => c.kind === 'person') ? Array.from(new Set((list.data ?? []).map((r) => r['person_id']).filter((v): v is string => typeof v === 'string'))) : []),
    [list.data, cols],
  )
  const names = usePersonNames(personIds)

  const rows: ListRow[] = useMemo(() => {
    return (list.data ?? []).map((r: RmthRow) => {
      const cells: Cell[] = cols.map((c) => {
        const v = r[c.col]
        if (c.kind === 'person') {
          const p = typeof v === 'string' ? names.data?.[v] : undefined
          return { kind: 'text', text: p?.full_name ?? '…', ...(p ? { sub: p.national_id } : {}) }
        }
        if (c.kind === 'date') return { kind: 'text', text: typeof v === 'string' ? formatShortDate(v, locale) : '—' }
        if (c.kind === 'bool') {
          if (v == null) return { kind: 'chip', text: t('rmth:form.undecided'), tone: 'pending' }
          // A1.2's decision is inverted: "No - record it here" is the one that counts
          const counts = fid === 'a12' ? v === false : v === true
          return { kind: 'chip', text: counts ? t('rmth:detail.counts') : t('rmth:detail.notCounts'), tone: counts ? 'ok' : 'mute' }
        }
        if (c.kind === 'ref') {
          const row = (ref0.data ?? []).find((x) => x.id === v)
          return { kind: 'text', text: row ? refLabel(row, locale) : '—' }
        }
        if (c.col === 'reference') return { kind: 'ltr', text: typeof v === 'string' ? v : '—' }
        return { kind: 'text', text: typeof v === 'string' ? v : '—' }
      })
      if (r.deleted_at) cells.push({ kind: 'chip', text: t('rmth:list.deleted'), tone: 'err' })
      return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
    })
  }, [list.data, cols, names.data, ref0.data, locale, t, fid])

  const columns = cols.map((c) =>
    c.kind === 'person' ? t('rmth:list.columns.person')
    : c.kind === 'date' ? t('rmth:list.columns.date')
    : c.kind === 'bool' || c.kind === 'ref' ? t('rmth:list.columns.counts')
    : c.col === 'reference' ? t('rmth:list.columns.reference')
    : t('rmth:list.columns.title'),
  )
  if (showDeleted) columns.push(t('rmth:list.columns.status'))

  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open', { defaultValue: 'Open' }), onSelect: () => navigate(`/rmth/${fid}/${row.id}`) },
  ]

  return (
    <>
      <PageHead
        eyebrow={L.indicator}
        title={L.title}
        description={L.calc}
        action={can(role, 'record.create') ? <PrimaryButton onClick={() => navigate(`/rmth/${fid}/new`)}>{t('rmth:list.new')}</PrimaryButton> : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink pb-2">
        <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
          {list.data ? t('rmth:list.count', { count: list.data.length }) : ''}
        </span>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          {t('rmth:list.showDeleted')}
        </label>
      </div>
      {list.isLoading ? <TableSkeleton columns={columns.length} /> : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && list.data.length === 0 ? (
        <div className="mt-[18px]">
          <EmptyState title={t('rmth:list.empty')} description={t('rmth:list.emptyBody')} />
        </div>
      ) : null}
      {list.data && list.data.length > 0 ? <DataTable columns={columns} rows={rows} actions={actions} recordLabel={L.title} /> : null}
    </>
  )
}

export default RmthListScreen
