import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useManagedSessions, missingForPublish, type SessionKind } from '../data/sessions'
import { formatDateRange } from '../lib/format'
import { PageHead, PrimaryButton } from '../ui/primitives'
import { ListTable } from '../ui/ListTable'
import type { RowAction } from '../ui/DataTable'
import type { Cell, ListRow } from '../hooks/useData'

/**
 * Training sessions, from the Municipality's side.
 *
 * The two flags are separate columns rather than a pair of matching badges —
 * PUBLIC is about the website, DELIVERED is about the donor return, and a
 * coordinator scanning this list should never have to work out which is which.
 * See the longer note in SessionDetail. On advisory, the TRACK is a column:
 * `check_linkage_eligibility` (0106) accepts a completed advisory only when
 * track = 'market', so it decides whether finishing the session lets the
 * producer ask to be connected to a buyer.
 *
 * The list is the one every municipality's records use (ListTable).
 */
export function SessionList({ kind = 'training' }: { kind?: SessionKind }) {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const base = kind === 'advisory' ? '/advisory' : '/sessions'
  const q = useManagedSessions(kind)
  const advisory = kind === 'advisory'

  const columns = [
    t('forms:session.col.title'),
    t('forms:session.col.dates'),
    t('forms:session.col.venue'),
    ...(advisory ? [t('forms:session.col.track')] : []),
    t('forms:session.col.website'),
    t('forms:session.col.delivery'),
    t('forms:session.col.details'),
  ]

  const rows: ListRow[] = (q.data ?? []).map((s) => {
    const track: Cell[] = advisory
      ? [{ kind: 'text', text: s.track ? t(`common:enums.advisoryTrack.${s.track}`) : '—' }]
      : []
    const cells: Cell[] = [
      { kind: 'text', text: s.title },
      { kind: 'text', text: formatDateRange(s.start_date, s.end_date, locale) },
      { kind: 'text', text: s.venue || '—' },
      ...track,
      s.is_cancelled
        ? { kind: 'chip', text: t('forms:session.cancelled'), tone: 'err' }
        : s.is_published
          ? { kind: 'chip', text: t('forms:session.public'), tone: 'ok' }
          : { kind: 'chip', text: t('forms:session.draft'), tone: 'mute' },
      s.is_delivered ? { kind: 'chip', text: t('forms:session.delivered'), tone: 'ok' } : { kind: 'text', text: '—' },
      // A direct statement about the row, not a guess about where it came from -- see missingForPublish.
      missingForPublish(s).length > 0
        ? { kind: 'chip', text: t('forms:session.needsDetails'), tone: 'warn' }
        : { kind: 'chip', text: t('forms:session.ready'), tone: 'mute' },
    ]
    return { id: s.id, cells, filterValue: '', search: cells.map((c) => c.text).join(' ') }
  })

  const actions = (row: ListRow): RowAction[] => [
    { id: 'open', label: t('common:actions.open'), onSelect: () => navigate(`${base}/${row.id}`) },
  ]
  const newLabel = t(advisory ? 'forms:session.newAdvisory' : 'forms:session.newSession')

  return (
    <div className="pb-16">
      <PageHead
        title={t(advisory ? 'forms:session.listHeadingAdvisory' : 'forms:session.listHeading')}
        description={t(advisory ? 'forms:session.listIntroAdvisory' : 'forms:session.listIntro')}
        action={<PrimaryButton onClick={() => navigate(`${base}/new`)}>{newLabel}</PrimaryButton>}
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
        empty={{
          title: t(advisory ? 'forms:session.noAdvisory' : 'forms:session.noSessions'),
          description: t(advisory ? 'forms:session.listIntroAdvisory' : 'forms:session.listIntro'),
          action: <PrimaryButton onClick={() => navigate(`${base}/new`)}>{newLabel}</PrimaryButton>,
        }}
      />
    </div>
  )
}

export default SessionList
