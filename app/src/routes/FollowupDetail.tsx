import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useFollowups,
  useSubmitFollowup,
  useSubmitPreview,
  type SectionKey,
} from '../data/followups'
import { BackLink, EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { formatShortDate } from '../lib/format'
import { useToast } from '../ui/Toast'
import { isolateLtr } from '../components/BidiIsolate'

/**
 * A follow-up survey, and the place it is submitted.
 *
 * ── SUBMITTING LIVES HERE, NOT AT THE END OF SECTION E ──
 *
 * Section E stores Q41–Q43 and leaves the survey a draft. Submitting is what
 * puts it into A1, B1, C1 and IMP-0 — 0072 made all four require `submitted` or
 * `approved` — and it happens from the screen that can see all six sections at
 * once, because that is the only screen where "what am I about to submit" is a
 * question with a visible answer.
 *
 * ── THE PANEL SAYS WHAT WILL HAPPEN BEFORE IT HAPPENS ──
 *
 * `submit_followup(id, false)` returns the indicator list and the empty-section
 * list and writes nothing; `(id, true)` computes the same two things and then
 * submits. Same function, so the sentence on this screen cannot drift from the
 * act it describes (0095). This screen must never work either list out for
 * itself — in particular C1, which needs the person to have a production
 * initiative six months old and is therefore not "they answered Q17".
 *
 * ── A SURVEY WITH SECTIONS MISSING IS STILL SUBMITTABLE ──
 *
 * An enumerator does not always get every answer, and a survey held open until
 * it is perfect never reaches the donor return. The empty sections are named in
 * the confirmation; they do not disable the button.
 *
 * ── AND AFTER IT, IT IS NOT THEIRS ──
 *
 * `fu_update` admits an enumerator only while the survey is a draft, so once
 * submitted they cannot edit or resubmit it, and 0093 stopped them writing
 * `approved` themselves. Reopening is a coordinator action. The screen says so
 * rather than showing buttons that will be refused.
 */
export function FollowupDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useFollowups()
  const survey = (q.data ?? []).find((r) => r.id === id)

  const isDraft = survey?.status === 'draft'
  const preview = useSubmitPreview(id, isDraft)
  const submit = useSubmitFollowup()

  const [confirming, setConfirming] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

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

  // Only trusted when the RPC actually returned a preview. On any other result
  // — not_permitted, not_draft, an error — the section states fall back to
  // "unknown" rather than to "empty", which would accuse the enumerator of not
  // having filled in work they may well have done.
  const p = preview.data?.result === 'preview' ? preview.data : undefined
  const empty = p?.empty_sections
  const fed = p?.indicators ?? []

  const SECTIONS: { key: SectionKey | '0'; twelveOnly?: boolean; to?: string }[] = [
    { key: '0' },
    { key: 'A', to: `/followups/${survey.id}/a` },
    { key: 'B', to: `/followups/${survey.id}/b` },
    { key: 'C', to: `/followups/${survey.id}/c` },
    { key: 'D', twelveOnly: true, to: `/followups/${survey.id}/d` },
    { key: 'E', to: `/followups/${survey.id}/e` },
  ]

  async function doSubmit() {
    if (!id) return
    setRefusal(null)
    const res = await submit.mutateAsync(id)
    if (res.result === 'submitted') {
      setConfirming(false)
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t('survey:submit.doneTitle'),
        sub:
          (res.indicators ?? []).length > 0
            ? t('survey:submit.doneSubFed', {
                list: isolateLtr((res.indicators ?? []).join(' · ')),
              })
            : t('survey:submit.doneSubNone'),
        tone: 'ok',
      })
      return
    }
    setRefusal(res.result)
  }

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
        {isDraft ? (
          <>
            <p className="m-0 text-[15px] leading-[1.55] text-body">
              {t('survey:detail.draftSaved')}
            </p>
            <p className="m-0 mt-2 text-[15px] leading-[1.55] text-body">
              {t('survey:detail.notCounted')}
            </p>
          </>
        ) : (
          <>
            <p className="m-0 text-[15px] leading-[1.55] text-body">
              {t(`survey:detail.state.${survey.status}`, {
                defaultValue: t('survey:detail.state.submitted'),
              })}
            </p>
            <p className="m-0 mt-2 text-[15px] leading-[1.55] text-body">
              {t('survey:detail.reopenIsCoordinator')}
            </p>
          </>
        )}
      </div>

      <section className="mt-8">
        <SectionRule title={t('survey:detail.sections')} />
        <ul className="mt-4 list-none p-0">
          {SECTIONS.map((s) => {
            // Section D is twelve-month only, enforced by section_d_only_at_12m.
            // Shown as locked WITH THE REASON rather than hidden, so nobody
            // wonders whether the form is broken.
            const locked = s.twelveOnly && survey.round !== 'twelve_month'
            // Section 0 exists as soon as the survey does — start_followup
            // created the row. The other five come from the preview.
            const done =
              s.key === '0' ? true : empty ? !empty.includes(s.key as SectionKey) : undefined
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
                <span
                  className={`whitespace-nowrap font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${
                    locked
                      ? 'text-muted'
                      : done === true
                        ? 'text-success'
                        : done === false
                          ? 'text-warning'
                          : 'text-muted'
                  }`}
                >
                  {locked
                    ? t('survey:detail.locked')
                    : done === true
                      ? t('survey:detail.done')
                      : done === false
                        ? t('survey:detail.empty')
                        : t('survey:detail.unknown')}
                </span>
                {s.to && !locked && isDraft ? (
                  <button
                    type="button"
                    onClick={() => navigate(s.to as string)}
                    className="whitespace-nowrap border-[1.5px] border-ink px-3 py-1 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink hover:bg-sunken"
                  >
                    {t('survey:detail.open')}
                  </button>
                ) : null}
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

      {isDraft ? (
        <section className="mt-8">
          <SectionRule title={t('survey:submit.heading')} />

          {preview.isLoading ? (
            <div aria-hidden="true" className="mt-4 h-32 animate-pulse bg-track" />
          ) : !p ? (
            // The preview did not come back as a preview. Say which, rather
            // than offering a button whose refusal would be the first news.
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-warning">
              {t(`survey:submit.blocked.${preview.data?.result ?? 'error'}`, {
                defaultValue: t('survey:submit.blocked.error'),
              })}
            </p>
          ) : !confirming ? (
            <>
              <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-body">
                {t('survey:submit.intro')}
              </p>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center border-[1.5px] border-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink hover:bg-sunken sm:w-auto"
              >
                {t('survey:submit.start')}
              </button>
            </>
          ) : (
            <div className="mt-4 border-[3px] border-ink p-4 sm:p-5">
              <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
                {t('survey:submit.confirmEyebrow')}
              </p>

              {/* What will happen, named. Both lists come from the RPC that is
                  about to run, never from this screen's own reading. */}
              <p className="m-0 mt-3 max-w-[62ch] text-[16px] font-semibold leading-[1.45] text-ink">
                {fed.length > 0
                  ? t('survey:submit.willFeed', { list: isolateLtr(fed.join(' · ')) })
                  : t('survey:submit.willFeedNothing')}
              </p>

              {p.period ? (
                <p className="m-0 mt-2 max-w-[62ch] text-[14px] leading-[1.5] text-muted">
                  {t('survey:submit.period', { period: isolateLtr(p.period) })}
                </p>
              ) : (
                <p className="m-0 mt-2 max-w-[62ch] text-[14px] leading-[1.5] text-warning">
                  {t('survey:submit.noPeriod')}
                </p>
              )}

              {empty && empty.length > 0 ? (
                <div className="mt-4 border-t border-border-default pt-3">
                  <p className="m-0 max-w-[62ch] text-[15px] leading-[1.5] text-warning">
                    {t('survey:submit.emptyWarning', {
                      list: empty.map((k) => t(`survey:sectionName.${k}`)).join(' · '),
                    })}
                  </p>
                  <p className="m-0 mt-1 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
                    {t('survey:submit.emptyOk')}
                  </p>
                </div>
              ) : null}

              <p className="m-0 mt-4 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
                {t('survey:submit.oneWay')}
              </p>

              {refusal ? (
                <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
                  <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
                    {t('survey:submit.notSubmitted')}
                  </div>
                  <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
                    {t(`survey:submit.refused.${refusal}`, {
                      defaultValue: t('survey:submit.refused.invalid'),
                    })}
                  </p>
                </div>
              ) : null}

              {submit.isError ? (
                <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
                  {t('survey:submit.failed')}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={submit.isPending}
                  onClick={() => void doSubmit()}
                  className="inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint"
                >
                  {submit.isPending ? t('survey:submit.submitting') : t('survey:submit.confirm')}
                </button>
                <button
                  type="button"
                  disabled={submit.isPending}
                  onClick={() => {
                    setConfirming(false)
                    setRefusal(null)
                  }}
                  className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink hover:bg-sunken disabled:cursor-not-allowed disabled:border-track disabled:text-faint"
                >
                  {t('common:actions.cancel')}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </>
  )
}

export default FollowupDetail
