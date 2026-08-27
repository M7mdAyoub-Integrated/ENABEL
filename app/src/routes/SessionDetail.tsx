import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useManagedSession,
  useSessionParticipants,
  useDecideApplication,
  useSetAttended,
  useDecideCompletion,
  usePublishSession,
  useSetDelivered,
  useSessionDeleteImpact,
  useSoftDeleteSession,
  missingForPublish,
  type Participant,
} from '../data/sessions'
import { formatShortDate, formatDateRange } from '../lib/format'
import { ARROW_START, SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One training session, from the Municipality's side.
 *
 *  ── THE TWO TOGGLES ARE DELIBERATELY NOT ALIKE ──
 *
 *  `is_published` makes something visible to the public. `is_delivered` asserts
 *  it happened and feeds D0.2. Two booleans on one row that mean entirely
 *  different things.
 *
 *  Rendering them as a matched pair of switches would be the natural thing to
 *  do and would be wrong: they would look like two settings of the same kind,
 *  sitting next to each other, one keystroke apart. So they are separated into
 *  two blocks, with different framing, different colour, and different words --
 *  PUBLISH is about the public, RECORD DELIVERY is about the donor return.
 *  Nothing about them should invite a mis-click.
 *
 *  ── THREE FACTS, THREE COLUMNS ──
 *
 *  Accepted, attended and completed are independent. Only the last moves A1.3.
 *  The table gives each its own column, and completion is a decision with two
 *  named outcomes rather than a checkbox, because "met the criteria" and "did
 *  not meet the criteria" are both real answers and "not decided yet" is a
 *  third. A checkbox can only say two of those three.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function StatusPill({ status }: { status: Participant['application_status'] }) {
  const { t } = useTranslation('forms')
  const tone =
    status === 'approved'
      ? 'bg-success text-bg'
      : status === 'rejected'
        ? 'bg-error text-bg'
        : 'bg-track text-ink'
  return (
    <span
      className={`inline-block whitespace-nowrap px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${tone}`}
    >
      {t(`session.status.${status}`)}
    </span>
  )
}

function CompletionCell({
  p,
  sessionId,
  disabled,
}: {
  p: Participant
  sessionId: string
  disabled: boolean
}) {
  const { t } = useTranslation('forms')
  const decide = useDecideCompletion()
  const busy = decide.isPending

  if (p.met_criteria === true) {
    return (
      <div>
        <span className="inline-block whitespace-nowrap border-[1.5px] border-success px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-success">
          {t('session.completed')}
        </span>
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => decide.mutate({ id: p.id, sessionId, met: null })}
          className="mt-1 block text-[12px] text-muted underline hover:text-ink disabled:no-underline"
        >
          {t('session.undoDecision')}
        </button>
      </div>
    )
  }
  if (p.met_criteria === false) {
    return (
      <div>
        <span className="inline-block whitespace-nowrap border-[1.5px] border-border-strong px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          {t('session.notCompleted')}
        </span>
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => decide.mutate({ id: p.id, sessionId, met: null })}
          className="mt-1 block text-[12px] text-muted underline hover:text-ink disabled:no-underline"
        >
          {t('session.undoDecision')}
        </button>
      </div>
    )
  }

  // Undecided. Two named outcomes, never a single tick -- "did not meet the
  // criteria" is a real result the donor return needs, not the absence of one.
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => decide.mutate({ id: p.id, sessionId, met: true })}
        className="min-h-9 whitespace-nowrap bg-ink px-2.5 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
      >
        {t('session.markCompleted')}
      </button>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => decide.mutate({ id: p.id, sessionId, met: false })}
        className="min-h-9 whitespace-nowrap border-[1.5px] border-border-strong px-2.5 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink disabled:text-faint"
      >
        {t('session.markNotCompleted')}
      </button>
    </div>
  )
}

export function SessionDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation('forms')
  const locale = i18n.resolvedLanguage ?? 'en'

  const sq = useManagedSession(id)
  const pq = useSessionParticipants(id)
  const publish = usePublishSession()
  const setDelivered = useSetDelivered()
  const decideApp = useDecideApplication()
  const setAttended = useSetAttended()
  const softDelete = useSoftDeleteSession()

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const impact = useSessionDeleteImpact(id, confirmingDelete)

  const s = sq.data
  const rows = pq.data ?? []

  if (sq.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-8 w-64 animate-pulse bg-track" />
        <div className="mt-6 h-40 animate-pulse bg-track" />
      </div>
    )
  }
  if (sq.isError || !s) {
    return (
      <div role="alert" className="mt-6 border-[1.5px] border-error p-5">
        <p className="m-0 text-[15px]">{t('session.loadFailed')}</p>
      </div>
    )
  }

  const ended = new Date(s.end_date) < new Date(new Date().toDateString())
  const pending = rows.filter((r) => r.application_status === 'submitted').length

  return (
    <div className="pb-16">
      <Link
        to="/sessions"
        className="mt-4 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">
          {ARROW_START}
        </span>
        <span className="ms-2">{t('session.backToSessions')}</span>
      </Link>

      <h1
        dir="auto"
        className="mt-1 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[30px]"
      >
        {s.title}
      </h1>
      <Link
        to={`/sessions/${s.id}/edit`}
        className="mt-1 inline-block font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted underline hover:text-ink"
      >
        {t('session.editDetails')}
      </Link>
      <p className="mt-1 text-[14px] text-muted">
        {formatDateRange(s.start_date, s.end_date, locale)}
        {s.venue ? (
          <span dir="auto">
            {' '}
            {SEP} {s.venue}
          </span>
        ) : null}
      </p>

      {/* Publishing needs things a completion-created session never had. Name
          them, say where they came from, and offer the way to fix it -- a
          "needs details" state with no way to supply the details would be
          worse than not marking it. */}
      {missingForPublish(s).length > 0 ? (
        <section className="mt-5 border-[1.5px] border-amber bg-sunken p-4">
          <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-amber">
            {t('session.needsDetails')}
          </h2>
          <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.5] text-body">
            {s.origin === 'completion'
              ? t('session.needsDetailsFromCompletion')
              : t('session.needsDetailsBody')}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 ps-5 text-[14px] text-body">
            {missingForPublish(s).map((f) => (
              <li key={f}>{t(`session.missing.${f}`)}</li>
            ))}
          </ul>
          <Link
            to={`/sessions/${s.id}/edit`}
            className="mt-3 inline-flex min-h-11 items-center bg-ink px-4 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('session.fillInDetails')}
          </Link>
        </section>
      ) : null}

      {/* ── PUBLISH. About the public. ─────────────────────────────────── */}
      <section className="mt-6 border-[1.5px] border-teal bg-sunken p-4">
        <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-teal">
          {t('session.publishHeading')}
        </h2>
        <p className="mt-1 max-w-[60ch] text-[14px] leading-[1.5] text-body">
          {ended
            ? t('session.endedNoPublish')
            : s.is_published
              ? t('session.publishedBody')
              : t('session.notPublishedBody')}
        </p>

        {/* What actually becomes public, named. focal_point especially: it is
            free text a member of staff types, and it lands on a page anyone
            can read. Saying so at the moment of publishing is the only point
            where it can still be changed. */}
        <details className="mt-3">
          <summary className="cursor-pointer font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            {t('session.whatGoesPublic')}
          </summary>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-[14px] text-body">
            <li>{t('session.publicTitle')}</li>
            <li>{t('session.publicDates')}</li>
            <li>{t('session.publicVenue')}</li>
            <li>{t('session.publicDescription')}</li>
            <li className="font-semibold">
              {t('session.publicFocalPoint')}
              {s.focal_point ? (
                <span dir="auto" className="ms-1 font-normal">
                  {t('session.publicFocalPointValue', { value: s.focal_point })}
                </span>
              ) : null}
            </li>
          </ul>
          <p className="mt-2 text-[13px] text-muted">{t('session.publicNever')}</p>
        </details>

        <button
          type="button"
          disabled={
            publish.isPending ||
            s.is_cancelled ||
            ended ||
            (!s.is_published && missingForPublish(s).length > 0)
          }
          onClick={() => publish.mutate({ id: s.id, on: !s.is_published })}
          className={`mt-4 inline-flex min-h-11 items-center justify-center px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] disabled:bg-track disabled:text-faint ${
            s.is_published
              ? 'border-[1.5px] border-border-strong text-ink'
              : 'bg-teal text-bg'
          }`}
        >
          {s.is_published ? t('session.unpublish') : t('session.publish')}
        </button>
      </section>

      {/* ── DELIVERY. About the donor return. Deliberately unlike the above:
             different colour, different framing, further down the page, and
             it names the indicator it moves. ─────────────────────────────── */}
      <section className="mt-4 border-[1.5px] border-dashed border-border-strong p-4">
        <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
          {t('session.deliveryHeading')}
        </h2>
        <p className="mt-1 max-w-[60ch] text-[14px] leading-[1.5] text-body">
          {t('session.deliveryBody')}
        </p>
        {!ended ? (
          <p className="mt-2 text-[13px] text-muted">{t('session.deliveryNotEnded')}</p>
        ) : null}
        <label className="mt-3 flex items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-ink"
            checked={s.is_delivered}
            disabled={setDelivered.isPending || !ended}
            onChange={(e) => setDelivered.mutate({ id: s.id, on: e.target.checked })}
          />
          <span className="text-[14px] text-ink">{t('session.deliveredLabel')}</span>
        </label>
        {setDelivered.isError ? (
          <p role="alert" className="mt-2 text-[13px] font-semibold text-error">
            {t('session.deliveryRefused')}
          </p>
        ) : null}
      </section>

      {/* ── participants ───────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[3px] border-ink pb-2">
          <h2 className="m-0 text-[14px] font-extrabold uppercase tracking-[0.1em]">
            {t('session.participants')}
          </h2>
          <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            {t('session.pendingCount', { count: pending })}
          </span>
        </div>

        <p className="mt-2 max-w-[70ch] text-[13px] leading-[1.5] text-muted">
          {t('session.threeFactsNote')}
        </p>

        {pq.isLoading ? (
          <div aria-hidden="true" className="mt-4 h-32 animate-pulse bg-track" />
        ) : rows.length === 0 ? (
          <p className="mt-4 border-[1.5px] border-dashed border-border-muted p-5 text-center text-[15px] text-muted">
            {t('session.noParticipants')}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b-[1.5px] border-ink text-start">
                  <th className="py-2 pe-3 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('session.colPerson')}
                  </th>
                  <th className="py-2 pe-3 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('session.colApplication')}
                  </th>
                  <th className="py-2 pe-3 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('session.colAttended')}
                  </th>
                  <th className="py-2 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                    {t('session.colCompleted')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const accepted = p.application_status === 'approved'
                  return (
                    <tr key={p.id} className="border-b border-border-default align-top">
                      <td className="py-3 pe-3">
                        <div dir="auto" className="font-semibold text-ink">
                          {p.person?.full_name ?? '—'}
                        </div>
                        <div dir="ltr" className="text-[12px] text-muted">
                          {p.person?.national_id ?? '—'}
                        </div>
                        {p.submitted_by_participant ? (
                          <div className="mt-0.5 font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                            {t('session.appliedOnline')}
                            {p.applied_on
                              ? ` ${SEP} ${formatShortDate(p.applied_on, locale)}`
                              : ''}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 pe-3">
                        <StatusPill status={p.application_status} />
                        {p.application_status === 'submitted' ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={decideApp.isPending}
                              onClick={() =>
                                decideApp.mutate({ id: p.id, sessionId: s.id, status: 'approved' })
                              }
                              className="min-h-9 bg-ink px-2.5 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track"
                            >
                              {t('session.accept')}
                            </button>
                            <button
                              type="button"
                              disabled={decideApp.isPending}
                              onClick={() =>
                                decideApp.mutate({ id: p.id, sessionId: s.id, status: 'rejected' })
                              }
                              className="min-h-9 border-[1.5px] border-border-strong px-2.5 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink"
                            >
                              {t('session.reject')}
                            </button>
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 pe-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-ink"
                            checked={p.attended}
                            disabled={setAttended.isPending || !accepted}
                            onChange={(e) =>
                              setAttended.mutate({
                                id: p.id,
                                sessionId: s.id,
                                attended: e.target.checked,
                              })
                            }
                          />
                          <span className="text-[13px] text-muted">
                            {p.attended ? t('session.attendedYes') : t('session.attendedNo')}
                          </span>
                        </label>
                      </td>

                      <td className="py-3">
                        <CompletionCell p={p} sessionId={s.id} disabled={!accepted} />
                        {p.decided_on ? (
                          <div className="mt-1 text-[12px] text-muted">
                            {formatShortDate(p.decided_on, locale)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── delete, with the consequence stated first ──────────────────── */}
      <section className="mt-10 border-t border-border-default pt-5">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="min-h-11 border-[1.5px] border-error px-4 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-error"
          >
            {t('session.deleteSession')}
          </button>
        ) : (
          <div role="alertdialog" className="border-[1.5px] border-error p-4">
            <h2 className="m-0 text-[16px] font-extrabold">{t('session.deleteConfirmTitle')}</h2>

            {impact.isLoading ? (
              <p className="mt-2 text-[14px] text-muted">{t('session.deleteChecking')}</p>
            ) : impact.data ? (
              <>
                <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.55] text-body">
                  {t('session.deleteImpactEnrolments', { count: impact.data.live_enrolments })}
                </p>
                {impact.data.eligibility_lost > 0 ? (
                  <p className="mt-2 max-w-[60ch] border-s-[3px] border-error ps-3 text-[15px] font-semibold leading-[1.5] text-ink">
                    {t('session.deleteImpactEligibility', {
                      count: impact.data.eligibility_lost,
                    })}
                  </p>
                ) : (
                  <p className="mt-2 text-[14px] text-muted">{t('session.deleteImpactNone')}</p>
                )}
                {impact.data.keep_existing_advisory > 0 ? (
                  <p className="mt-1 text-[13px] text-muted">
                    {t('session.deleteImpactKeepAdvisory', {
                      count: impact.data.keep_existing_advisory,
                    })}
                  </p>
                ) : null}
              </>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="min-h-11 bg-ink px-4 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-bg"
              >
                {t('session.deleteCancel')}
              </button>
              <button
                type="button"
                disabled={softDelete.isPending || impact.isLoading}
                onClick={() => softDelete.mutate({ id: s.id })}
                className="min-h-11 border-[1.5px] border-error px-4 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-error disabled:border-border-strong disabled:text-faint"
              >
                {t('session.deleteConfirm')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default SessionDetail
