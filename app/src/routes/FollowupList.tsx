import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useFollowups } from '../data/followups'
import { EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { formatShortDate } from '../lib/format'

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

const TONE: Record<string, string> = {
  draft: 'border-warning text-warning',
  submitted: 'border-success text-success',
  approved: 'border-success text-success',
  rejected: 'border-error text-error',
}

export function FollowupList() {
  const { t, i18n } = useTranslation(['survey', 'forms'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const q = useFollowups()
  const rows = q.data ?? []
  const drafts = rows.filter((r) => r.status === 'draft')

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
      <EmptyState heading title={t('survey:loadFailedTitle')} description={t('survey:loadFailed')} />
    )
  }

  return (
    <>
      <PageHead
        eyebrow={t('survey:eyebrow')}
        title={t('survey:listTitle')}
        description={t('survey:listIntro')}
        action={
          <Link
            to="/followups/new"
            className="inline-flex min-h-12 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('survey:startOne')}
          </Link>
        }
      />

      <div className="mt-8">
        <SectionRule
          title={t('survey:surveys')}
          right={
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
              {t('survey:draftCount', { count: drafts.length })}
            </span>
          }
        />

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={t('survey:emptyTitle')} description={t('survey:emptyBody')} />
          </div>
        ) : (
          <ul className="mt-4 list-none p-0">
            {rows.map((r) => (
              <li key={r.id} className="border-b border-border-default">
                <button
                  type="button"
                  onClick={() => navigate(`/followups/${r.id}`)}
                  className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-start hover:bg-sunken"
                >
                  <span dir="auto" className="text-[15px] font-semibold text-ink">
                    {r.personName}
                  </span>
                  <span dir="ltr" className="font-narrow text-[13px] tracking-[0.08em] text-muted">
                    {r.nationalId}
                  </span>
                  <span className="text-[13.5px] text-muted">
                    {t(`survey:round.${r.round}`)}
                  </span>
                  <span className="text-[13.5px] text-muted">
                    {formatShortDate(r.contactDate, locale)}
                  </span>
                  <span
                    className={`ms-auto inline-block whitespace-nowrap border-[1.5px] px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${
                      TONE[r.status] ?? 'border-border-strong text-muted'
                    }`}
                  >
                    {t(`survey:status.${r.status}`, { defaultValue: r.status })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">
        {t('survey:listNote')}
      </p>
    </>
  )
}

export default FollowupList
