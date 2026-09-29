import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useLinkageRequests, type LinkageRequestStatus } from '../data/linkage'
import { PageHead, PrimaryButton } from '../ui/primitives'
import { formatShortDate } from '../lib/format'
import { ListTable } from '../ui/ListTable'
import type { RowAction } from '../ui/DataTable'
import type { ChipKind } from '../modules'
import type { Cell, ListRow } from '../hooks/useData'

/**
 * The linkage queue.
 *
 * ── WHY THE OPEN ONES ARE NOT SEPARATED OUT ──
 *
 * Everything is on one list, newest first, with the status on each row. The
 * obvious alternative -- an "awaiting review" tab -- hides the matched and
 * closed ones, and those are exactly what a coordinator needs to see when the
 * same person asks twice. A request that looks new is only new if you can see
 * that the person's earlier one was closed last month.
 *
 * The open ones are one filter away: the status column's.
 */

const STATUS_TONE: Record<LinkageRequestStatus, string> = {
  submitted: 'border-warning text-warning',
  under_review: 'border-ink text-ink',
  matched: 'border-success text-success',
  closed: 'border-border-strong text-muted',
}

export function StatusBadge({ status }: { status: LinkageRequestStatus }) {
  const { t } = useTranslation('forms')
  return (
    <span
      className={`inline-block whitespace-nowrap border-[1.5px] px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${STATUS_TONE[status]}`}
    >
      {t(`linkageAdmin.status.${status}`)}
    </span>
  )
}

const CHIP_TONE: Record<LinkageRequestStatus, ChipKind> = {
  submitted: 'warn',
  under_review: 'pending',
  matched: 'ok',
  closed: 'mute',
}

export function LinkageQueue() {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const q = useLinkageRequests()

  const columns = [
    t('forms:linkageAdmin.colProducer'),
    t('forms:linkageAdmin.colWhatTheyProduce'),
    t('forms:linkageAdmin.colAsked'),
    t('forms:linkageAdmin.colStatus'),
  ]
  const rows: ListRow[] = (q.data ?? []).map((r) => {
    const activity = locale.startsWith('ar') ? r.activityLabelAr : r.activityLabelEn
    const cells: Cell[] = [
      { kind: 'text', text: r.personName, ...(r.village ? { sub: r.village } : {}) },
      { kind: 'text', text: r.initiativeTitle, ...(activity ? { sub: activity } : {}) },
      { kind: 'text', text: formatShortDate(r.requestedOn, locale) },
      { kind: 'chip', text: t(`forms:linkageAdmin.status.${r.status}`), tone: CHIP_TONE[r.status] },
    ]
    return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
  })
  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open'), onSelect: () => navigate(`/linkage-requests/${row.id}`) },
  ]
  // Most linkages are not requested through the website. Without this the
  // only path into C1.2 was a public form.
  const record = <PrimaryButton onClick={() => navigate('/linkage-requests/new')}>{t('forms:linkageDirect.record')}</PrimaryButton>

  return (
    <>
      <PageHead
        eyebrow={t('forms:linkageAdmin.eyebrow')}
        title={t('forms:linkageAdmin.queueTitle')}
        description={t('forms:linkageAdmin.queueIntro')}
        action={record}
      />
      <ListTable
        columns={columns}
        rows={rows}
        actions={actions}
        recordLabel={t('forms:record')}
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={{ title: t('forms:linkageAdmin.emptyTitle'), description: t('forms:linkageAdmin.emptyBody'), action: record }}
      />
      {/* C1.2 is NOT summarised here. The queue is about work to do; the
          indicator is on the dashboard, read from v_indicator_progress, and a
          second rendering of it on a screen that writes to the same tables is
          how two numbers start disagreeing. */}
      <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">{t('forms:linkageAdmin.queueNote')}</p>
    </>
  )
}

export default LinkageQueue
