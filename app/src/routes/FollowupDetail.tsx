import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useFollowups,
  useReviewFollowup,
  useReviewPreview,
  useSubmitFollowup,
  useSubmitPreview,
  useIndicatorReach,
  type ReviewAction,
  type SectionKey,
} from '../data/followups'
import { BackLink, EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { formatShortDate } from '../lib/format'
import { SEP } from '../ui/glyphs'
import { useToast } from '../ui/Toast'
import { isolateLtr } from '../components/BidiIsolate'
import { NotesBox } from '../ui/surveyControls'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'

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
 *
 * ── AND REVIEWING LIVES HERE TOO, FOR A COORDINATOR ──
 *
 * Approve, reject and reopen (0099). The buttons are hidden from everyone else
 * and THAT IS NOT WHAT STOPS THEM: `fu_update`'s USING filters a submitted
 * survey for an enumerator — a zero-row UPDATE reporting success — and
 * `guard_followup_review` raises for any non-coordinator status change. Both
 * verified as an enumerator, through RLS, by writing to the table directly
 * rather than by calling the function. The hidden button is a courtesy.
 *
 * ── WHAT EACH ACTION DOES TO THE FIGURES IS SERVER-COMPUTED ──
 *
 * The four views admit `submitted` and `approved` identically, so approving
 * moves nothing and rejecting or reopening removes the survey from all four.
 * This screen does not know that. It renders `indicators_removed` and
 * `indicators_now` from `review_followup`, which asks
 * `followup_indicator_reach` at both statuses and reads each view's own
 * admitted statuses out of `pg_get_viewdef` (0098).
 *
 * Approving is the one a coordinator will misread — they will expect the
 * dashboard to move and it will not — so the panel says so in advance, naming
 * the indicators that go on counting it either way.
 */
export function FollowupDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useFollowups()
  const survey = (q.data ?? []).find((r) => r.id === id)

  const { role } = useAuth()

  const isDraft = survey?.status === 'draft'
  const preview = useSubmitPreview(id, isDraft)
  const submit = useSubmitFollowup()
  // What actually counts this survey now, asked of the database rather than
  // written into a sentence. See useIndicatorReach.
  const reach = useIndicatorReach(id, survey?.status)

  const [confirming, setConfirming] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  // ── the review side ──
  //
  // `action` is which of the three the coordinator has picked, and it is what
  // drives the preview. Null means the three buttons are showing.
  const [action, setAction] = useState<ReviewAction | null>(null)
  const [reason, setReason] = useState('')
  const [reviewRefusal, setReviewRefusal] = useState<string | null>(null)
  const rPreview = useReviewPreview(id, action)
  const review = useReviewFollowup()

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

  // Which actions the database will entertain at this status. Approve and
  // reject need a submitted survey; reopen needs anything that is not already a
  // draft. Offering one it would refuse turns a state rule into an error
  // message, so the buttons follow the same rule review_followup applies.
  const canReview = can(role, 'survey.review')
  const offered: ReviewAction[] =
    survey.status === 'submitted'
      ? ['approve', 'reject', 'reopen']
      : survey.status === 'approved' || survey.status === 'rejected'
        ? ['reopen']
        : []

  async function doReview() {
    if (!id || !action) return
    setReviewRefusal(null)
    const res = await review.mutateAsync({
      surveyId: id,
      action,
      // Omitted, not passed as undefined. An approval that carries a note is
      // refused by the function rather than having it dropped, so the screen
      // must not send one at all.
      ...(action === 'approve' ? {} : { note: reason }),
    })
    if (res.result === 'reviewed') {
      setAction(null)
      setReason('')
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t(`survey:review.doneTitle.${res.action}`),
        sub:
          (res.indicators_removed ?? []).length > 0
            ? t('survey:review.doneSubRemoved', {
                list: isolateLtr((res.indicators_removed ?? []).join(' · ')),
              })
            : t('survey:review.doneSubUnchanged'),
        // Rejecting and reopening take a figure back out of a quarter. That is
        // the same weight as a deletion and it gets the same colour.
        tone: res.action === 'approve' ? 'ok' : 'destructive',
      })
      return
    }
    setReviewRefusal(res.result)
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
            {/* The indicator list is COMPUTED, not asserted. This sentence
                used to name A1, B1, C1 and IMP-0 unconditionally, one screen
                away from a submit preview that correctly named only the ones
                that apply -- and they disagreed on the very first survey put
                through the platform. See useIndicatorReach. */}
            <p className="m-0 text-[15px] leading-[1.55] text-body">
              {survey.status === 'submitted' && reach.data
                ? reach.data.length > 0
                  ? t('survey:detail.state.submittedCounted', {
                      list: reach.data.join(` ${SEP} `),
                    })
                  : t('survey:detail.state.submittedCountedNone')
                : t(`survey:detail.state.${survey.status}`, {
                    defaultValue: t('survey:detail.state.submitted'),
                  })}
            </p>
            {/* Not shown to a coordinator: they have the buttons below, and
                telling the person who can reopen it that reopening is
                somebody else's job reads as a bug. */}
            {canReview ? null : (
              <p className="m-0 mt-2 text-[15px] leading-[1.55] text-body">
                {t('survey:detail.reopenIsCoordinator')}
              </p>
            )}
          </>
        )}

        {/* The reason, to whoever can see the survey — not only to the
            coordinator who wrote it. A rejected survey is frozen to the
            enumerator until it is reopened, and this is the only thing that
            says what to fix. */}
        {survey.reviewNote ? (
          <div className="mt-4 border-t border-border-default pt-3">
            <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('survey:review.noteHeading')}
            </p>
            {/* dir="auto" for the same reason NotesBox has it on the way in:
                this is free text and the coordinator may have written it in
                either language. Without it an English note inside an Arabic
                paragraph has its full stop dragged to the left — verified at
                320px with the interface in Arabic. */}
            <p
              dir="auto"
              className="m-0 mt-1.5 max-w-[62ch] whitespace-pre-wrap text-[15px] leading-[1.5] text-ink"
            >
              {survey.reviewNote}
            </p>
          </div>
        ) : null}
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

      {canReview && offered.length > 0 ? (
        <section className="mt-8">
          <SectionRule title={t('survey:review.heading')} />

          {action === null ? (
            <>
              <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-body">
                {t(`survey:review.intro.${survey.status}`, {
                  defaultValue: t('survey:review.intro.submitted'),
                })}
              </p>
              {/* Stacked at 320px, side by side from sm. Each is its own
                  min-h-12 target -- three destructive-adjacent controls a
                  thumb-width apart is how the wrong one gets pressed. */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {offered.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAction(a)
                      setReviewRefusal(null)
                    }}
                    className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink hover:bg-sunken"
                  >
                    {t(`survey:review.action.${a}`)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 border-[3px] border-ink p-4 sm:p-5">
              <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
                {t(`survey:review.confirmEyebrow.${action}`)}
              </p>

              {rPreview.isLoading ? (
                <div aria-hidden="true" className="mt-3 h-24 animate-pulse bg-track" />
              ) : rPreview.data?.result !== 'preview' ? (
                // The preview did not come back as one. Name it rather than
                // offering a button whose refusal would be the first news.
                <p className="m-0 mt-3 max-w-[62ch] text-[15px] leading-[1.55] text-warning">
                  {t(`survey:review.blocked.${rPreview.data?.result ?? 'error'}`, {
                    defaultValue: t('survey:review.blocked.error'),
                  })}
                </p>
              ) : (
                <ReviewConsequence
                  action={action}
                  now={rPreview.data.indicators_now ?? []}
                  removed={rPreview.data.indicators_removed ?? []}
                  added={rPreview.data.indicators_added ?? []}
                  period={rPreview.data.period ?? null}
                />
              )}

              {action !== 'approve' ? (
                <div className="mt-4">
                  <NotesBox
                    label={t(`survey:review.reasonLabel.${action}`)}
                    value={reason}
                    onChange={setReason}
                    placeholder={t(`survey:review.reasonPlaceholder.${action}`)}
                    maxLength={1000}
                  />
                  <p className="m-0 mt-1.5 max-w-[62ch] text-[13px] leading-[1.5] text-muted">
                    {t(`survey:review.reasonHelp.${action}`)}
                  </p>
                </div>
              ) : null}

              {reviewRefusal ? (
                <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
                  <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
                    {t('survey:review.notDone')}
                  </div>
                  <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
                    {t(`survey:review.refused.${reviewRefusal}`, {
                      defaultValue: t('survey:review.refused.invalid'),
                    })}
                  </p>
                </div>
              ) : null}

              {review.isError ? (
                <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
                  {t('survey:review.failed')}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    review.isPending ||
                    rPreview.data?.result !== 'preview' ||
                    // The database refuses a blank reason too. Disabling here
                    // as well saves a round trip, and the refusal below is
                    // still what proves it.
                    (action === 'reject' && reason.trim() === '')
                  }
                  onClick={() => void doReview()}
                  className="inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint"
                >
                  {review.isPending
                    ? t('survey:review.working')
                    : t(`survey:review.confirm.${action}`)}
                </button>
                <button
                  type="button"
                  disabled={review.isPending}
                  onClick={() => {
                    setAction(null)
                    setReason('')
                    setReviewRefusal(null)
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

/**
 * What this action will do to the figures, in words.
 *
 * Every list here arrives from `review_followup`. Nothing on this screen works
 * out that approving is harmless — the server asked
 * `followup_indicator_reach` at both statuses and the difference between the
 * two answers is what `removed` and `added` are. If a view were narrowed to
 * approved-only tomorrow, `added` would stop being empty and this component
 * would say so with no edit.
 */
function ReviewConsequence({
  action,
  now,
  removed,
  added,
  period,
}: {
  action: ReviewAction
  now: string[]
  removed: string[]
  added: string[]
  period: string | null
}) {
  const { t } = useTranslation(['survey'])
  // The separator is U+00A0 · U+00A0 -- non-breaking on both sides, so the
  // run of codes is not split across lines. Measured at 320px with the
  // interface in Arabic: the sentence renders in one line box, scrollWidth
  // equals clientWidth at 250px, and the page does not scroll horizontally.
  //
  // isolateLtr wraps the run in FSI/PDI. Without it the bidi algorithm
  // reorders the codes inside an Arabic paragraph, the same way it turned the
  // period code 26/Q3 into Q3/26 on the submit panel.
  const list = (xs: string[]) => isolateLtr(xs.join(' · '))

  return (
    <>
      {removed.length > 0 ? (
        <>
          <p className="m-0 mt-3 max-w-[62ch] text-[16px] font-semibold leading-[1.45] text-ink">
            {t(`survey:review.willRemove.${action}`, { list: list(removed) })}
          </p>
          {period ? (
            <p className="m-0 mt-2 max-w-[62ch] text-[14px] leading-[1.5] text-warning">
              {t('survey:review.removeFromPeriod', { period: isolateLtr(period) })}
            </p>
          ) : null}
        </>
      ) : now.length > 0 ? (
        // The sentence this whole panel exists for. A coordinator who thinks
        // approval is what makes a survey count will otherwise approve one,
        // see no movement, and go looking for a fault that is not there.
        <>
          <p className="m-0 mt-3 max-w-[62ch] text-[16px] font-semibold leading-[1.45] text-ink">
            {t('survey:review.noMove', { list: list(now) })}
          </p>
          <p className="m-0 mt-2 max-w-[62ch] text-[14px] leading-[1.5] text-muted">
            {t('survey:review.noMoveWhy')}
          </p>
        </>
      ) : (
        <p className="m-0 mt-3 max-w-[62ch] text-[16px] font-semibold leading-[1.45] text-ink">
          {t('survey:review.feedsNothing')}
        </p>
      )}

      {/* Empty for all three actions today. Rendered anyway, because the day it
          is not is the day somebody changed a view. */}
      {added.length > 0 ? (
        <p className="m-0 mt-2 max-w-[62ch] text-[14px] leading-[1.5] text-warning">
          {t('survey:review.willAdd', { list: list(added) })}
        </p>
      ) : null}
    </>
  )
}

export default FollowupDetail
