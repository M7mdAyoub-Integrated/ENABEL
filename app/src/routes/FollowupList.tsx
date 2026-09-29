import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useFollowups } from '../data/followups'
import { PageHead, PrimaryButton } from '../ui/primitives'
import { formatShortDate } from '../lib/format'
import { ListTable } from '../ui/ListTable'
import type { RowAction } from '../ui/DataTable'
import type { ChipKind } from '../modules'
import type { Cell, ListRow } from '../hooks/useData'

/**
 * Follow-up surveys.
 *
 * Drafts are listed alongside finished ones and marked, because a draft is not
 * a mistake here -- it is an interview in progress, or one a lost signal cut
 * short. An enumerator coming back to the office needs to see which ones are
 * still open, and the list is the only place that shows them.
 *
 * The status chip is the raw lifecycle, not a judgement: 0072 made the four
 * survey-fed indicators count `submitted` and `approved` only, so a draft on
 * this list is genuinely not in any figure.
 */

const TONE: Record<string, ChipKind> = {
  draft: 'warn',
  submitted: 'ok',
  approved: 'ok',
  rejected: 'err',
}

export function FollowupList() {
  const { t, i18n } = useTranslation(['survey', 'forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const q = useFollowups()

  const columns = [t('survey:col.participant'), t('survey:col.round'), t('survey:col.contact'), t('survey:col.status')]
  const rows: ListRow[] = (q.data ?? []).map((r) => {
    const cells: Cell[] = [
      { kind: 'text', text: r.personName || '—', ...(r.nationalId ? { sub: r.nationalId } : {}) },
      { kind: 'text', text: t(`survey:round.${r.round}`) },
      { kind: 'text', text: formatShortDate(r.contactDate, locale) },
      { kind: 'chip', text: t(`survey:status.${r.status}`, { defaultValue: r.status }), tone: TONE[r.status] ?? 'mute' },
    ]
    return { id: r.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
  })
  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open'), onSelect: () => navigate(`/followups/${row.id}`) },
  ]
  const start = <PrimaryButton onClick={() => navigate('/followups/new')}>{t('survey:startOne')}</PrimaryButton>

  return (
    <>
      <PageHead eyebrow={t('survey:eyebrow')} title={t('survey:listTitle')} description={t('survey:listIntro')} action={start} />
      <ListTable
        columns={columns}
        rows={rows}
        actions={actions}
        recordLabel={t('forms:record')}
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={{ title: t('survey:emptyTitle'), description: t('survey:emptyBody'), action: start }}
      />
      <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">{t('survey:listNote')}</p>
    </>
  )
}

export default FollowupList
