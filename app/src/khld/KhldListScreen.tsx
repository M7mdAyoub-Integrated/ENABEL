import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHead, PrimaryButton, EmptyState } from '../ui/primitives'
import { DataTable, type RowAction } from '../ui/DataTable'
import { ErrorState, TableSkeleton } from '../ui/states'
import { refLabel } from '../data/refTables'
import {
  identifierOf, useKhldList, useKhldPicker, useKhldRefs, usePersonNames, type KhldPick, type KhldRow,
} from '../data/khld'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { listsOf } from './answers'
import { fieldOf, formDef, useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { KhldFieldDef, KhldTable } from './types'
import type { Cell, ListRow } from '../hooks/useData'
import { SEP } from '../ui/glyphs'

/**
 * The list behind each Khalidiyah form: the reference the database issued,
 * then the fields gen_forms.py's LIST names for the form, in the sheet's
 * wording. FORM-12's list also says where each registration stands, because
 * a public one counts only once approved (0159).
 */
export function KhldListScreen() {
  const { form } = useParams()
  return <ListFor key={form} fid={form as KhldFormId} />
}

/** The tables a list column can link to: one picker hook each, always called, enabled when needed. */
function useLinked(fields: KhldFieldDef[]) {
  const need = new Set<string>()
  for (const f of fields) {
    if (f.kind === 'record' && f.table) need.add(f.table)
    if (f.kind === 'occasion') { need.add('khld_campaign'); need.add('khld_activity') }
  }
  const pick = (t: KhldTable) => (need.has(t) ? t : undefined)
  const partner = useKhldPicker(pick('khld_partner'))
  const activity = useKhldPicker(pick('khld_activity'))
  const campaign = useKhldPicker(pick('khld_campaign'))
  const volunteer = useKhldPicker(pick('khld_volunteer'))
  const session = useKhldPicker(pick('khld_guidance_session'))
  const market = useKhldPicker(pick('khld_market'))
  const all: Partial<Record<KhldTable, KhldPick[] | undefined>> = {
    khld_partner: partner.data, khld_activity: activity.data, khld_campaign: campaign.data,
    khld_volunteer: volunteer.data, khld_guidance_session: session.data, khld_market: market.data,
  }
  return (table: string | undefined, id: unknown): string | undefined =>
    typeof id === 'string' ? all[table as KhldTable]?.find((r) => r.id === id)?.label : undefined
}

function ListFor({ fid }: { fid: KhldFormId }) {
  const def = formDef(fid)
  const L = useKhldLabels(fid)
  const { t, i18n } = useTranslation(['khld', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const { role } = useAuth()
  const [showDeleted, setShowDeleted] = useState(false)
  const [onlySubmitted, setOnlySubmitted] = useState(false)
  const list = useKhldList(def.table, showDeleted)
  const refs = useKhldRefs(useMemo(() => listsOf(def), [def]))
  const cols = useMemo(() => def.list.map((id) => fieldOf(def, id)).filter((f): f is KhldFieldDef => !!f), [def])
  const linked = useLinked(cols)
  const showReference = !!def.reference && !cols.some((f) => f.kind === 'reference')
  const personIds = useMemo(
    () => Array.from(new Set((list.data ?? []).map((r) => r['person_id']).filter((x): x is string => typeof x === 'string'))),
    [list.data],
  )
  const people = usePersonNames(personIds)

  const cellOf = (f: KhldFieldDef, r: KhldRow): Cell => {
    const v = f.column ? r[f.column] : undefined
    const dash: Cell = { kind: 'text', text: '—' }
    switch (f.kind) {
      case 'ident': case 'person_name': case 'person_ref': {
        const p = typeof r['person_id'] === 'string' ? people.data?.[r['person_id'] as string] : undefined
        if (!p) return { kind: 'text', text: typeof r['person_id'] === 'string' ? '…' : '—' }
        if (f.kind === 'ident') return { kind: 'ltr', text: identifierOf(p)?.value ?? '—' }
        return { kind: 'text', text: p.full_name }
      }
      case 'reference': return { kind: 'ltr', text: typeof r['reference'] === 'string' ? (r['reference'] as string) : '—' }
      case 'date': return typeof v === 'string' ? { kind: 'text', text: formatShortDate(v, locale) } : dash
      case 'stamp': return typeof v === 'string' ? { kind: 'text', text: formatShortDate(v, locale) } : dash
      case 'bool': return v == null ? dash : { kind: 'chip', text: L.opt(f, v ? 'true' : 'false'), tone: v ? 'ok' : 'mute' }
      case 'likert': return v == null ? dash : { kind: 'text', text: String(v) }
      case 'select': case 'id_type': {
        const row = (refs[f.list ?? ''] ?? []).find((x) => x.id === v)
        return row ? { kind: 'text', text: refLabel(row, locale) } : dash
      }
      case 'record': {
        if (f.extra && (f.extra.column ? r[f.extra.column] === true : v == null)) return { kind: 'text', text: L.extra(f) ?? '—' }
        return { kind: 'text', text: linked(f.table, v) ?? (typeof v === 'string' ? '…' : '—') }
      }
      case 'occasion': {
        const c = r['campaign_id']
        const a = r['activity_id']
        const text = typeof c === 'string' ? linked('khld_campaign', c) : typeof a === 'string' ? linked('khld_activity', a) : undefined
        return { kind: 'text', text: text ?? '—' }
      }
      case 'percent': return v == null ? dash : { kind: 'ltr', text: `${String(v)}%` }
      default: return v == null || v === '' ? dash : { kind: 'text', text: String(v) }
    }
  }

  const source = (list.data ?? []).filter((r) => !onlySubmitted || r['application_status'] === 'submitted')
  const rows: ListRow[] = source.map((r) => {
    const cells: Cell[] = []
    if (showReference) cells.push({ kind: 'ltr', text: typeof r['reference'] === 'string' ? (r['reference'] as string) : '—' })
    for (const f of cols) cells.push(cellOf(f, r))
    if (def.public) {
      const s = String(r['application_status'] ?? 'approved')
      cells.push({ kind: 'chip', text: t(`khld:detail.review.${s}`), tone: s === 'approved' ? 'ok' : s === 'rejected' ? 'err' : 'pending' })
    }
    if (r.deleted_at) cells.push({ kind: 'chip', text: t('khld:list.deleted'), tone: 'err' })
    return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
  })

  const columns = [
    ...(showReference ? [t('khld:list.reference')] : []),
    ...cols.map((f) => L.label(f)),
    ...(def.public ? [t('khld:detail.review.title')] : []),
    ...(showDeleted ? [t('khld:list.status')] : []),
  ]

  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open', { defaultValue: 'Open' }), onSelect: () => navigate(`/khld/${fid}/${row.id}`) },
  ]

  return (
    <>
      <PageHead
        eyebrow={L.sheet}
        title={L.title}
        description={def.indicators.join(` ${SEP} `)}
        action={can(role, 'record.create') ? <PrimaryButton onClick={() => navigate(`/khld/${fid}/new`)}>{t('khld:list.new')}</PrimaryButton> : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink pb-2">
        <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
          {list.data ? t('khld:list.count', { count: source.length }) : ''}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {def.public ? (
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" checked={onlySubmitted} onChange={(e) => setOnlySubmitted(e.target.checked)} />
              {t('khld:list.onlySubmitted')}
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            {t('khld:list.showDeleted')}
          </label>
        </div>
      </div>
      {list.isLoading ? <TableSkeleton columns={columns.length} /> : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && source.length === 0 ? (
        <div className="mt-[18px]">
          <EmptyState title={t('khld:list.empty')} description={t('khld:list.emptyBody')} />
        </div>
      ) : null}
      {list.data && source.length > 0 ? <DataTable columns={columns} rows={rows} actions={actions} recordLabel={L.short} /> : null}
    </>
  )
}

export default KhldListScreen
