import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHead, PrimaryButton } from '../ui/primitives'
import type { RowAction } from '../ui/DataTable'
import { ListTable } from '../ui/ListTable'
import { refLabel } from '../data/refTables'
import { usePersonNames, useRmthList, useRmthPicker, useRmthRefs, type RmthRow } from '../data/rmth'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { listsOf } from './answers'
import { fieldOf, formDef, isRmthFormId, useRmthLabels } from './labels'
import { pickLabel } from './picks'
import NotFound from '../routes/NotFound'
import type { RmthFormId } from './forms.generated'
import type { RmthFieldDef } from './types'
import type { Cell, ListRow } from '../hooks/useData'
import { SEP } from '../ui/glyphs'

/**
 * The list behind each Ramtha form: the reference the database issued (PJ-01,
 * AC-01), then the fields the catalogue's `list` names for the form, in the
 * sheet's wording. The Activity Register also says which activities are on
 * the public page, because that is a coordinator's switch (0181) and the list
 * is where one looks for it.
 */
export function RmthListScreen() {
  const { form } = useParams()
  // RequireRamtha says the same, but demo mode drops the route guards
  if (!isRmthFormId(form)) return <NotFound />
  return <ListFor key={form} fid={form} />
}

function ListFor({ fid }: { fid: RmthFormId }) {
  const def = formDef(fid)
  const L = useRmthLabels(fid)
  const { t, i18n } = useTranslation(['rmth', 'common', 'forms'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const { role } = useAuth()
  const [showDeleted, setShowDeleted] = useState(false)
  const list = useRmthList(def.table, showDeleted)
  const refs = useRmthRefs(useMemo(() => listsOf(def), [def]))
  const cols = useMemo(() => def.list.map((id) => fieldOf(def, id)).filter((f): f is RmthFieldDef => !!f), [def])
  const activities = useRmthPicker(cols.some((f) => f.table === 'rmth_activity') ? 'rmth_activity' : undefined)
  const projects = useRmthPicker(cols.some((f) => f.table === 'rmth_project') ? 'rmth_project' : undefined)
  const showReference = !!def.reference && !cols.some((f) => f.kind === 'reference')
  const personIds = useMemo(
    () => Array.from(new Set((list.data ?? []).map((r) => r['person_id']).filter((x): x is string => typeof x === 'string'))),
    [list.data],
  )
  const people = usePersonNames(personIds)

  const cellOf = (f: RmthFieldDef, r: RmthRow): Cell => {
    const v = f.column ? r[f.column] : undefined
    const dash: Cell = { kind: 'text', text: '—' }
    switch (f.kind) {
      case 'ident': case 'person_name': case 'person_sex': case 'person': {
        const p = typeof r['person_id'] === 'string' ? people.data?.[r['person_id'] as string] : undefined
        if (!p) return { kind: 'text', text: typeof r['person_id'] === 'string' ? '…' : '—' }
        if (f.kind === 'ident') return { kind: 'ltr', text: p.national_id ?? '—' }
        if (f.kind === 'person_sex') {
          const s = (refs[f.list ?? 'sex'] ?? []).find((x) => x.code === p.sex)
          return s ? { kind: 'text', text: refLabel(s, locale) } : dash
        }
        if (f.kind === 'person') return { kind: 'text', text: p.national_id ? `${p.full_name} ${SEP} ${p.national_id}` : p.full_name }
        return { kind: 'text', text: p.full_name }
      }
      case 'reference': return { kind: 'ltr', text: typeof r['reference'] === 'string' ? (r['reference'] as string) : '—' }
      case 'date': case 'stamp': return typeof v === 'string' ? { kind: 'text', text: formatShortDate(v, locale) } : dash
      case 'bool': return v == null ? dash : { kind: 'chip', text: L.opt(f, v ? 'true' : 'false'), tone: v ? 'ok' : 'mute' }
      case 'select': case 'calc': {
        const row = (refs[f.list ?? ''] ?? []).find((x) => x.id === v)
        return row ? { kind: 'text', text: refLabel(row, locale) } : dash
      }
      case 'record': {
        const picks = f.table === 'rmth_activity' ? activities.data : projects.data
        const pick = typeof v === 'string' ? picks?.find((x) => x.id === v) : undefined
        return pick ? { kind: 'text', text: pickLabel(f.table, pick, refs, locale) } : { kind: 'text', text: typeof v === 'string' ? '…' : '—' }
      }
      default: return v == null || v === '' ? dash : { kind: 'text', text: String(v) }
    }
  }

  const source = list.data ?? []
  const rows: ListRow[] = source.map((r) => {
    const cells: Cell[] = []
    if (showReference) cells.push({ kind: 'ltr', text: typeof r['reference'] === 'string' ? (r['reference'] as string) : '—' })
    for (const f of cols) cells.push(cellOf(f, r))
    if (def.published) {
      const on = r['is_published'] === true
      cells.push({ kind: 'chip', text: on ? t('rmth:list.published') : t('rmth:list.notPublished'), tone: on ? 'ok' : 'mute' })
    }
    if (r.deleted_at) cells.push({ kind: 'chip', text: t('rmth:list.deleted'), tone: 'err' })
    return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
  })

  const columns = [
    ...(showReference ? [L.label({ id: def.fields.find((f) => f.kind === 'reference')?.id ?? '' })] : []),
    ...cols.map((f) => L.label(f)),
    ...(def.published ? [t('rmth:list.public')] : []),
    ...(showDeleted ? [t('rmth:list.status')] : []),
  ]

  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open'), onSelect: () => navigate(`/rmth/${fid}/${row.id}`) },
  ]

  return (
    <>
      <PageHead
        eyebrow={L.sheet}
        title={L.title}
        description={def.indicators.join(` ${SEP} `)}
        action={can(role, 'record.create') ? <PrimaryButton onClick={() => navigate(`/rmth/${fid}/new`)}>{t('rmth:list.new')}</PrimaryButton> : undefined}
      />
      <ListTable
        columns={columns}
        rows={rows}
        actions={actions}
        recordLabel={t('forms:record')}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        toggles={[
          { id: 'deleted', label: t('rmth:list.showDeleted'), checked: showDeleted, onChange: setShowDeleted },
        ]}
        empty={{ title: t('rmth:list.empty'), description: t('rmth:list.emptyBody') }}
      />
    </>
  )
}

export default RmthListScreen
