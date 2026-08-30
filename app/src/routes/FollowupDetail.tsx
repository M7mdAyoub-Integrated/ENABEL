import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFollowups } from '../data/followups'
import { BackLink, EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { formatShortDate } from '../lib/format'

/**
 * A follow-up survey in progress.
 *
 * ── WHAT THIS IS RIGHT NOW ──
 *
 * Sections 0, A, B and C exist; D and E do not. This screen shows the draft and
 * says plainly which sections are still to come.
 *
 * It deliberately does NOT offer a submit. A survey submitted with five of six
 * sections empty would be counted by A1, B1 and C1 -- 0072 makes them count
 * `submitted`, and it cannot tell a deliberate submission from a premature one.
 * All four are percentages, so a single wrong row does not nudge them, it drags
 * the whole figure. The button appears when there is something to submit.
 */
export function FollowupDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()

  const q = useFollowups()
  const survey = (q.data ?? []).find((r) => r.id === id)

  if (q.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-10 w-64 animate-pulse bg-track" />
        <div className="mt-6 h-48 animate-pulse bg-track" />
      </div>
    )
  }

  if (!survey) {
    return (
      <EmptyState heading title={t('survey:notFoundTitle')} description={t('survey:notFoundBody')} />
    )
  }

  const SECTIONS: { key: string; done: boolean; twelveOnly?: boolean; to?: string }[] = [
    { key: '0', done: true },
    { key: 'A', done: false, to: `/followups/${survey.id}/a` },
    { key: 'B', done: false, to: `/followups/${survey.id}/b` },
    { key: 'C', done: false, to: `/followups/${survey.id}/c` },
    { key: 'D', done: false, twelveOnly: true },
    { key: 'E', done: false },
  ]

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate('/followups')}>{t('survey:backToList')}</BackLink>}
        eyebrow={t('survey:eyebrow')}
        title={survey.personName}
        description={`${t(`survey:round.${survey.round}`)} · ${formatShortDate(survey.contactDate, locale)}`}
        size="md"
      />

      <div className="border-[1.5px] border-ink p-4 sm:p-5">
        <p className="m-0 text-[15px] leading-[1.55] text-body">
          {t('survey:detail.draftSaved')}
        </p>
        <p className="m-0 mt-2 text-[15px] leading-[1.55] text-body">
          {t('survey:detail.notCounted')}
        </p>
      </div>

      <section className="mt-8">
        <SectionRule title={t('survey:detail.sections')} />
        <ul className="mt-4 list-none p-0">
          {SECTIONS.map((s) => {
            // Section D is twelve-month only, enforced by section_d_only_at_12m.
            // Shown as locked WITH THE REASON rather than hidden, so nobody
            // wonders whether the form is broken.
            const locked = s.twelveOnly && survey.round !== 'twelve_month'
            return (
              <li
                key={s.key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-default py-3"
              >
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
                  {t('survey:detail.sectionLabel', { key: s.key })}
                </span>
                <span className="min-w-0 flex-1 text-[15px] text-ink">
                  {t(`survey:sectionName.${s.key}`)}
                </span>
                {s.to && !locked ? (
                  <button
                    type="button"
                    onClick={() => navigate(s.to as string)}
                    className="whitespace-nowrap border-[1.5px] border-ink px-3 py-1 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink hover:bg-sunken"
                  >
                    {t('survey:detail.open')}
                  </button>
                ) : (
                  <span
                    className={`whitespace-nowrap font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${
                      s.done ? 'text-success' : locked ? 'text-muted' : 'text-warning'
                    }`}
                  >
                    {s.done
                      ? t('survey:detail.done')
                      : locked
                        ? t('survey:detail.locked')
                        : t('survey:detail.toCome')}
                  </span>
                )}
                {locked ? (
                  <span className="w-full text-[13px] leading-[1.45] text-muted">
                    {t('survey:detail.lockedWhy')}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">
        {t('survey:detail.noSubmitYet')}
      </p>
    </>
  )
}

export default FollowupDetail
