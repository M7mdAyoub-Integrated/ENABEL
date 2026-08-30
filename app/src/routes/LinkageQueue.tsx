import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useLinkageRequests, type LinkageRequestStatus } from '../data/linkage'
import { EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { formatShortDate } from '../lib/format'

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
 * ── THE COUNT IS OF OPEN REQUESTS, NOT OF ROWS ──
 *
 * A queue's number should be the work left in it. Counting every row would put
 * a badge on this screen that never goes down, and a number that never goes
 * down stops being read.
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

export function LinkageQueue() {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const q = useLinkageRequests()

  const rows = q.data ?? []
  const open = rows.filter((r) => r.status === 'submitted' || r.status === 'under_review')

  if (q.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-10 w-64 animate-pulse bg-track" />
        <div className="mt-6 h-64 animate-pulse bg-track" />
      </div>
    )
  }

  if (q.isError) {
    return (
      <EmptyState
        heading
        title={t('forms:linkageAdmin.loadFailedTitle')}
        description={t('forms:linkageAdmin.loadFailed')}
      />
    )
  }

  return (
    <>
      <PageHead
        eyebrow={t('forms:linkageAdmin.eyebrow')}
        title={t('forms:linkageAdmin.queueTitle')}
        description={t('forms:linkageAdmin.queueIntro')}
        action={
          // Most linkages are not requested through the website. Without this
          // the only path into C1.2 was a public form.
          <Link
            to="/linkage-requests/new"
            className="inline-flex min-h-12 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('forms:linkageDirect.record')}
          </Link>
        }
      />

      <div className="mt-8">
        <SectionRule
          title={t('forms:linkageAdmin.requests')}
          right={
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
              {t('forms:linkageAdmin.openCount', { count: open.length })}
            </span>
          }
        />

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={t('forms:linkageAdmin.emptyTitle')}
              description={t('forms:linkageAdmin.emptyBody')}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b-[1.5px] border-ink text-start">
                  <th className="py-2 pe-3 text-start font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('forms:linkageAdmin.colProducer')}
                  </th>
                  <th className="py-2 pe-3 text-start font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('forms:linkageAdmin.colWhatTheyProduce')}
                  </th>
                  <th className="py-2 pe-3 text-start font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('forms:linkageAdmin.colAsked')}
                  </th>
                  <th className="py-2 text-start font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('forms:linkageAdmin.colStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => navigate(`/linkage-requests/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/linkage-requests/${r.id}`)
                    }}
                    className="cursor-pointer border-b border-border-default align-top hover:bg-sunken focus-visible:outline-2 focus-visible:outline-teal"
                  >
                    <td className="py-3 pe-3">
                      <Link
                        to={`/linkage-requests/${r.id}`}
                        dir="auto"
                        className="font-semibold text-ink no-underline hover:underline"
                      >
                        {r.personName}
                      </Link>
                      {r.village ? (
                        <span dir="auto" className="mt-0.5 block text-[13px] text-muted">
                          {r.village}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pe-3" dir="auto">
                      <span className="block text-ink">{r.initiativeTitle}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {locale.startsWith('ar') ? r.activityLabelAr : r.activityLabelEn}
                      </span>
                    </td>
                    <td className="py-3 pe-3 whitespace-nowrap text-muted">
                      {formatShortDate(r.requestedOn, locale)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* C1.2 is NOT summarised here. The queue is about work to do; the
          indicator is on the dashboard, read from v_indicator_progress, and a
          second rendering of it on a screen that writes to the same tables is
          how two numbers start disagreeing. The match screen shows the live
          figure at the one moment it is the point. */}
      <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">
        {t('forms:linkageAdmin.queueNote')}
      </p>
    </>
  )
}

export default LinkageQueue
