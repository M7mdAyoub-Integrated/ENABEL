import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInitiatives } from '../data/initiatives'
import { formatShortDate } from '../lib/format'
import { PageHead, PrimaryButton } from '../ui/primitives'
import { ListTable } from '../ui/ListTable'
import type { RowAction } from '../ui/DataTable'
import type { Cell, ListRow } from '../hooks/useData'

/**
 * Production initiatives, from the Municipality's side.
 *
 * The list exists so that mentorship sessions have a parent to hang off:
 * `mentorship_session.initiative_id` is NOT NULL. Before this screen an
 * initiative could only be created (by matching a linkage request) and never
 * opened again.
 *
 * The linkage marks are printed RAW — one chip per live linkage status. C1.2's
 * rule is "active or ended, distinct initiatives" and it lives in
 * `v_ind_c1_2`; deciding here which initiative "counts" would be a second copy
 * of that rule, free to drift from the one in the donor return.
 */
export function InitiativeList() {
  const { t, i18n } = useTranslation(['forms', 'nav', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const q = useInitiatives()
  const listSep = locale.startsWith('ar') ? '\u060C ' : ', '

  const columns = [
    t('forms:initiative.col.title'),
    t('forms:initiative.col.producer'),
    t('forms:initiative.col.started'),
    t('forms:initiative.col.status'),
    t('forms:initiative.col.linkage'),
    t('forms:initiative.col.sessions'),
  ]

  const rows: ListRow[] = (q.data ?? []).map((r) => {
    const cells: Cell[] = [
      { kind: 'text', text: r.title },
      { kind: 'text', text: r.personName || '—', ...(r.nationalId ? { sub: r.nationalId } : {}) },
      { kind: 'text', text: r.startedOn ? formatShortDate(r.startedOn, locale) : '—' },
      { kind: 'chip', text: t(`forms:initiative.status.${r.status}`, { defaultValue: r.status }), tone: 'mute' },
      // The linkage statuses RAW, one per live linkage -- C1.2's rule lives in v_ind_c1_2
      { kind: 'text', text: r.linkageStatuses.map((s) => t(`forms:initiative.linkage.${s}`, { defaultValue: s })).join(listSep) || '—' },
      { kind: 'text', text: String(r.mentorshipCount) },
    ]
    return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
  })

  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open'), onSelect: () => navigate(`/initiatives/${row.id}`) },
  ]

  return (
    <div className="pb-16">
      <PageHead title={t('forms:initiative.listHeading')} description={t('forms:initiative.listIntro')} />
      <ListTable
        columns={columns}
        rows={rows}
        actions={actions}
        recordLabel={t('forms:record')}
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={{
          // No "create one" button. An initiative is created by matching a
          // linkage request or recording a direct linkage, and offering a second
          // creation path here would let one be made with no linkage behind it.
          title: t('forms:initiative.none'),
          description: t('forms:initiative.listIntro'),
          action: <PrimaryButton onClick={() => navigate('/linkage-requests')}>{t('nav:linkageRequests')}</PrimaryButton>,
        }}
      />
    </div>
  )
}

export default InitiativeList
