import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useInitiative,
  useMentorshipSessions,
  useCreateMentorshipSession,
  useUpdateMentorshipSession,
  useDeleteMentorshipSession,
  type MentorshipRow,
} from '../data/initiatives'
import {
  useIndicatorRows,
  useReportingPeriods,
  currentPeriodCode,
  actualText,
  targetText,
} from '../data/indicators'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { WriteError } from '../ui/states'
import { BidiIsolate, isolateLtr } from '../components/BidiIsolate'
import { formatShortDate } from '../lib/format'
import { ARROW_START, SEP, EMPTY } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One production initiative, and the mentorship sessions delivered to it.
 *
 *  ── WHY THE LOG IS HERE ──
 *
 *  `mentorship_session.initiative_id` is NOT NULL, so the parent must be chosen
 *  before anything else on the form means anything. A central form would open
 *  with a dropdown of every initiative in the programme and the coordinator
 *  would pick the one they had just been looking at.
 *
 *  ── C1.3 COUNTS SESSIONS ──
 *
 *  Every row added here is one more in C1.3. That is unlike B1.2 and D0.1 on
 *  the neighbouring screens, where a second record for the same person moves
 *  nothing, so the panel says so in words rather than leaving it to be
 *  inferred from a family resemblance.
 *
 *  ── THE FIGURE IS READ, NEVER COMPUTED ──
 *
 *  The C1.3 line reads `v_indicator_progress` for the current quarter. Counting
 *  the rows on screen would be a second implementation of the indicator, and it
 *  would disagree the moment a session fell outside the quarter -- which most
 *  of them eventually do.
 *
 *  Its target is genuinely absent (06 OQ-1: the workbook row is an empty shell),
 *  so `targetText` renders the words for "not set". Never a zero.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type FormState = { id: string | null; date: string; topic: string; adviser: string }

const BLANK: FormState = { id: null, date: '', topic: '', adviser: '' }

export function InitiativeDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['forms', 'common', 'nav', 'indicators'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()

  const iq = useInitiative(id)
  const mq = useMentorshipSessions(id)
  const create = useCreateMentorshipSession()
  const update = useUpdateMentorshipSession()
  const remove = useDeleteMentorshipSession()

  const periods = useReportingPeriods()
  const periodCode = currentPeriodCode(periods.data ?? [])
  const indicators = useIndicatorRows(periodCode)
  const c13 = (indicators.data ?? []).find((r) => r.code === 'C1.3')

  const [form, setForm] = useState<FormState>(BLANK)
  const [touched, setTouched] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)

  const mayWrite = can(role, 'record.edit')
  const mayDelete = can(role, 'record.delete')
  const init = iq.data
  const sessions = mq.data ?? []

  const dateErr = touched && !form.date ? t('forms:initiative.dateRequired') : ''
  const topicErr = touched && !form.topic.trim() ? t('forms:initiative.topicRequired') : ''
  const valid = !!form.date && !!form.topic.trim()

  const startEdit = (m: MentorshipRow) => {
    setTouched(false)
    setForm({ id: m.id, date: m.sessionDate, topic: m.topic, adviser: m.adviser ?? '' })
  }

  const submit = () => {
    setTouched(true)
    if (!valid || !id) return
    const payload = {
      initiativeId: id,
      sessionDate: form.date,
      topic: form.topic,
      adviser: form.adviser.trim() || null,
    }
    const done = () => {
      setForm(BLANK)
      setTouched(false)
    }
    if (form.id) update.mutate({ id: form.id, input: payload }, { onSuccess: done })
    else create.mutate(payload, { onSuccess: done })
  }

  if (iq.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-8 w-64 animate-pulse bg-track" />
        <div className="mt-6 h-40 animate-pulse bg-track" />
      </div>
    )
  }
  if (iq.isError || !init) {
    return (
      <div role="alert" className="mt-6 border-[1.5px] border-error p-5">
        <p className="m-0 text-[15px]">{t('forms:initiative.loadFailed')}</p>
      </div>
    )
  }

  const activity =
    locale.startsWith('ar') && init.activityLabelAr ? init.activityLabelAr : init.activityLabelEn

  return (
    <div className="pb-16">
      <Link
        to="/initiatives"
        className="mt-4 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">
          {ARROW_START}
        </span>
        <span className="ms-2">{t('forms:initiative.backToList')}</span>
      </Link>

      <h1
        dir="auto"
        className="mt-1 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[30px]"
      >
        {init.title}
      </h1>
      <p className="mt-1 text-[14px] text-muted">
        <span dir="auto">{init.personName}</span> {SEP}{' '}
        <BidiIsolate className="font-narrow tracking-wide">{init.nationalId}</BidiIsolate>
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-x-11 sm:grid-cols-2">
        {[
          { k: 'initiative.activity', v: activity },
          { k: 'initiative.product', v: init.mainProduct ?? '' },
          {
            k: 'initiative.startedOn',
            v: init.startedOn ? formatShortDate(init.startedOn, locale) : '',
          },
          {
            k: 'initiative.statusLabel',
            v: t(`forms:initiative.status.${init.status}`, { defaultValue: init.status }),
          },
        ].map((f) => (
          <div
            key={f.k}
            className="flex justify-between gap-6 border-b border-border-default py-3"
          >
            <dt className="flex-none basis-[42%] font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {t(`forms:${f.k}`)}
            </dt>
            <dd
              dir="auto"
              className="text-[15px] font-semibold text-ink"
              style={{ textAlign: 'end', textWrap: 'pretty' }}
            >
              {f.v || <span className="text-ghost">{EMPTY}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {/* ── MENTORSHIP. The C1.3 log. ──────────────────────────────────── */}
      <section className="mt-8 border-[1.5px] border-green p-4">
        <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-green">
          {t('forms:initiative.mentorshipHeading')}
        </h2>
        <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.5] text-body">
          {t('forms:initiative.mentorshipBody')}
        </p>

        {/* The figure, read from the indicator view. Not a count of the rows
            below: those are this initiative's sessions across all time, and
            C1.3 is every initiative's sessions inside one quarter. */}
        {c13 ? (
          <p className="mt-2 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            {t('forms:initiative.c13Line', {
              // `t()` returns a finished string, so there is no element left to
              // wrap and the bidi algorithm reorders the code inside the Arabic
              // sentence. Seen on this panel: 26/Q3 rendered as 2/26 :Q3.
              period: isolateLtr(c13.period_code),
              actual: actualText(c13, t('indicators:noValue')),
              target: targetText(c13, t('indicators:targetNotSet')),
            })}
          </p>
        ) : null}

        {mq.isLoading ? (
          <div aria-hidden="true" className="mt-4 h-16 animate-pulse bg-track" />
        ) : sessions.length === 0 ? (
          <p className="mt-4 border-[1.5px] border-dashed border-border-muted p-5 text-center text-[15px] text-muted">
            {t('forms:initiative.noSessions')}
          </p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-2 p-0">
            {sessions.map((m) => (
              <li
                key={m.id}
                className="border-[1.5px] border-border-default bg-bg p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                    {formatShortDate(m.sessionDate, locale)}
                  </span>
                  {m.adviser ? (
                    <span dir="auto" className="text-[13px] text-muted">
                      {m.adviser}
                    </span>
                  ) : null}
                </div>
                <p dir="auto" className="mt-1 text-[15px] font-semibold text-ink">
                  {m.topic}
                </p>
                {mayWrite ? (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted underline hover:text-ink"
                    >
                      {t('common:actions.edit')}
                    </button>
                    {mayDelete ? (
                      confirming === m.id ? (
                        <span className="flex flex-wrap items-center gap-3">
                          {/* C1.3 counts sessions, so removing one ALWAYS moves
                              it by one -- unlike B1.2 and D0.1, where it
                              depends. Say which. */}
                          <span className="text-[13px] text-error">
                            {t('forms:initiative.deleteWarn')}
                          </span>
                          <button
                            type="button"
                            disabled={remove.isPending}
                            onClick={() =>
                              remove.mutate(
                                { id: m.id, initiativeId: m.initiativeId },
                                { onSettled: () => setConfirming(null) },
                              )
                            }
                            className="min-h-11 bg-error px-3 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
                          >
                            {t('forms:deleteConfirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted underline hover:text-ink"
                          >
                            {t('forms:deleteCancel')}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(m.id)}
                          className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-error underline"
                        >
                          {t('common:actions.delete')}
                        </button>
                      )
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {remove.isError ? <WriteError error={remove.error} onDismiss={() => remove.reset()} /> : null}

        {mayWrite ? (
          <div className="mt-5 border-t-[1.5px] border-border-default pt-4">
            <h3 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
              {form.id ? t('forms:initiative.editSession') : t('forms:initiative.addSession')}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t('forms:initiative.sessionDate')}
                  <span aria-hidden="true" className="ms-1 text-error">
                    {t('forms:requiredMark')}
                  </span>
                </span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  aria-invalid={!!dateErr}
                  className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink"
                />
                {dateErr ? (
                  <span role="alert" className="text-[13px] font-semibold text-error">
                    {dateErr}
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t('forms:initiative.adviser')}
                </span>
                <input
                  type="text"
                  dir="auto"
                  value={form.adviser}
                  onChange={(e) => setForm({ ...form, adviser: e.target.value })}
                  className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t('forms:initiative.topic')}
                  <span aria-hidden="true" className="ms-1 text-error">
                    {t('forms:requiredMark')}
                  </span>
                </span>
                <input
                  type="text"
                  dir="auto"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  aria-invalid={!!topicErr}
                  placeholder={t('forms:initiative.topicPh')}
                  className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink placeholder:text-ghost"
                />
                {topicErr ? (
                  <span role="alert" className="text-[13px] font-semibold text-error">
                    {topicErr}
                  </span>
                ) : null}
              </label>
            </div>

            {create.isError ? (
              <WriteError error={create.error} onDismiss={() => create.reset()} />
            ) : null}
            {update.isError ? (
              <WriteError error={update.error} onDismiss={() => update.reset()} />
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={create.isPending || update.isPending}
                onClick={submit}
                className="inline-flex min-h-11 items-center justify-center bg-green px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg disabled:bg-track disabled:text-faint"
              >
                {form.id ? t('forms:saveChanges') : t('forms:initiative.saveSession')}
              </button>
              {form.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setForm(BLANK)
                    setTouched(false)
                  }}
                  className="inline-flex min-h-11 items-center justify-center border-[1.5px] border-border-strong px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink"
                >
                  {t('forms:deleteCancel')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default InitiativeDetail
