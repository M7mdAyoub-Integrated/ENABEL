import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normaliseNationalId, isCompleteNationalId, groupNationalId } from '../data/apply'
import {
  useFollowupPrefill,
  useStartFollowup,
  type ContactMode,
  type FollowupRound,
  type Respondent,
  type StartOutcome,
} from '../data/followups'
import { BackLink, PageHead } from '../ui/primitives'
import { formatShortDate } from '../lib/format'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Section 0 — Identification (Q1–Q6). The first of six.
 *
 *  ── WHO THIS IS FOR ──
 *
 *  An enumerator standing in a field, on a phone, reading questions aloud to a
 *  farmer. Not someone at a desk. So: one question per block, nothing in a
 *  narrow column, every control at least 44px, and built at 320 first. The
 *  answer options are full-width stacked buttons rather than a select, because
 *  a select on a phone opens a modal picker that hides the question you have
 *  just read out.
 *
 *  ── THIS SECTION CREATES THE ROW ──
 *
 *  Finishing section 0 writes a DRAFT survey. Everything after this updates it.
 *  That is what makes a lost signal cost one section instead of the interview,
 *  and it is why the (person_id, round) refusal lands here -- before 43
 *  questions are asked, not after. See 0074.
 *
 *  ── Q5 AND Q6 ARE NOT ASKED ──
 *
 *  The sheet says Q5 is derived and Q6 is inherited from the training
 *  registration. Both are shown read-only, from the person's own records, so
 *  the enumerator can see what we already believe and correct us out loud
 *  rather than re-asking a farmer what the Municipality did for them.
 *
 *  `support.referral` prints as "not recorded" rather than as an unticked box:
 *  no table records referrals (OQ-10), so a blank box would say we had checked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CARD = 'mt-4 border-[1.5px] border-ink p-4 sm:p-5'
const LABEL = 'font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted'
const INPUT =
  'mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] ' +
  'text-ink focus:border-ink focus:outline-none'

/** Full-width stacked choices. A phone select hides the question just read out. */
function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 border-[1.5px] px-4 text-start text-[15px] ${
            value === o.value
              ? 'border-ink bg-ink font-semibold text-bg'
              : 'border-border-strong bg-bg text-ink hover:bg-sunken'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FollowupStart() {
  const { t, i18n } = useTranslation(['survey', 'forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()

  const [nid, setNid] = useState('')
  const [round, setRound] = useState<FollowupRound>('six_month')
  const [respondent, setRespondent] = useState<Respondent>('participant')
  const [contactDate, setContactDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [contactMode, setContactMode] = useState<ContactMode>('telephone')
  const [enumeratorName, setEnumeratorName] = useState('')
  const [outcome, setOutcome] = useState<StartOutcome | null>(null)
  const [existing, setExisting] = useState<{ round?: string; contactDate?: string } | null>(null)

  const prefill = useFollowupPrefill(nid)
  const start = useStartFollowup()

  // One id per attempt, reused across retries. Resending the same one returns
  // the survey that was already created rather than colliding on person/round.
  const clientUuid = useMemo(() => crypto.randomUUID(), [])

  const found = prefill.data?.found ? prefill.data : null
  const ready = !!found && !!enumeratorName.trim() && !!contactDate && !start.isPending

  async function submit() {
    setOutcome(null)
    setExisting(null)
    const res = await start.mutateAsync({
      nationalId: nid,
      round,
      contactDate,
      contactMode,
      enumeratorName,
      respondent,
      clientUuid,
    })
    if (res.ok && res.survey_id) {
      navigate(`/followups/${res.survey_id}`)
      return
    }
    setOutcome(res.result)
    if (res.result === 'already_exists') {
      setExisting({
        ...(res.round ? { round: res.round } : {}),
        ...(res.contact_date ? { contactDate: res.contact_date } : {}),
      })
    }
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate('/followups')}>{t('survey:backToList')}</BackLink>}
        eyebrow={t('survey:eyebrow')}
        title={t('survey:section0.title')}
        description={t('survey:section0.intro')}
        size="md"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) void submit()
        }}
      >
        {/* Q1 */}
        <div className={CARD}>
          <p className="m-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
            {t('survey:q.1')}
          </p>
          <label className="mt-3 block">
            <span className={LABEL}>{t('survey:section0.nationalId')}</span>
            <input
              className={INPUT}
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              value={nid}
              onChange={(e) => setNid(normaliseNationalId(e.target.value))}
            />
          </label>

          {isCompleteNationalId(nid) ? (
            prefill.isLoading ? (
              <div aria-hidden="true" className="mt-3 h-12 animate-pulse bg-track" />
            ) : found ? (
              <div className="mt-3 border-s-[3px] border-success bg-sunken p-3">
                <p dir="auto" className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
                  {found.full_name}
                </p>
                {found.village ? (
                  <p dir="auto" className="m-0 mt-0.5 text-[14px] text-muted">
                    {found.village}
                  </p>
                ) : null}
                <p dir="ltr" className="m-0 mt-1 font-narrow text-[13px] tracking-[0.08em] text-muted">
                  {groupNationalId(nid)}
                </p>
              </div>
            ) : (
              <p
                role="alert"
                className="mt-3 border-[1.5px] border-error bg-sunken p-3 text-[14px] font-semibold text-error"
              >
                {t('survey:section0.notFound')}
              </p>
            )
          ) : null}
        </div>

        {found ? (
          <>
            {/* Q2 */}
            <div className={CARD}>
              <p className="m-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                {t('survey:q.2')}
              </p>
              <Choice
                value={respondent}
                onChange={setRespondent}
                options={[
                  { value: 'participant', label: t('survey:respondent.participant') },
                  { value: 'household_member', label: t('survey:respondent.household_member') },
                  { value: 'not_reached', label: t('survey:respondent.not_reached') },
                ]}
              />
            </div>

            {/* Q3 */}
            <div className={CARD}>
              <p className="m-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                {t('survey:q.3')}
              </p>
              {/* The round decides whether section D is asked at all. Said here
                  rather than left as a surprise four sections later. */}
              <p className="mt-1 text-[13.5px] leading-[1.5] text-muted">
                {t('survey:section0.roundNote')}
              </p>
              <Choice
                value={round}
                onChange={setRound}
                options={[
                  { value: 'six_month', label: t('survey:round.six_month') },
                  { value: 'twelve_month', label: t('survey:round.twelve_month') },
                  { value: 'annual', label: t('survey:round.annual') },
                ]}
              />
            </div>

            {/* Q4 */}
            <div className={CARD}>
              <p className="m-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                {t('survey:q.4')}
              </p>
              <label className="mt-3 block">
                <span className={LABEL}>{t('survey:section0.contactDate')}</span>
                <input
                  className={INPUT}
                  type="date"
                  dir="ltr"
                  value={contactDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setContactDate(e.target.value)}
                />
              </label>
              <div className="mt-4">
                <span className={LABEL}>{t('survey:section0.contactMode')}</span>
                <Choice
                  value={contactMode}
                  onChange={setContactMode}
                  options={[
                    { value: 'telephone', label: t('survey:mode.telephone') },
                    { value: 'site_visit', label: t('survey:mode.site_visit') },
                    { value: 'municipal_office', label: t('survey:mode.municipal_office') },
                  ]}
                />
              </div>
              <label className="mt-4 block">
                <span className={LABEL}>{t('survey:section0.enumerator')}</span>
                <input
                  className={INPUT}
                  dir="auto"
                  autoComplete="name"
                  value={enumeratorName}
                  onChange={(e) => setEnumeratorName(e.target.value)}
                />
              </label>
            </div>

            {/* Q5 — derived, not asked */}
            <div className={CARD}>
              <p className="m-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                {t('survey:q.5')}
              </p>
              <p className="mt-1 text-[13.5px] leading-[1.5] text-muted">
                {t('survey:section0.q5Note')}
              </p>
              <ul className="mt-3 list-none p-0">
                {(
                  [
                    'training',
                    'guidance',
                    'production',
                    'exhibition',
                    'office',
                    'referral',
                  ] as const
                ).map((k) => {
                  const v = found.support[k]
                  return (
                    <li
                      key={k}
                      className="flex items-baseline gap-3 border-b border-border-default py-2 last:border-0"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1 h-3 w-3 flex-none border-[1.5px] ${
                          v === true
                            ? 'border-ink bg-ink'
                            : v === false
                              ? 'border-border-strong bg-bg'
                              : 'border-dashed border-warning bg-bg'
                        }`}
                      />
                      <span className="min-w-0 flex-1 text-[15px] leading-[1.4] text-ink">
                        {t(`survey:q5.${k}`)}
                        {/* null is not "no". Nothing records referrals, so the
                            screen must not show an empty box that reads as one. */}
                        {v === null ? (
                          <span className="mt-0.5 block text-[13px] font-semibold text-warning">
                            {t('survey:section0.notRecorded')}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Q6 — read-only */}
            <div className={CARD}>
              <p className="m-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                {t('survey:q.6')}
              </p>
              <p className="mt-1 text-[13.5px] leading-[1.5] text-muted">
                {t('survey:section0.q6Note')}
              </p>
              {found.trainings.length === 0 ? (
                <p className="mt-3 text-[15px] text-muted">{t('survey:section0.noTrainings')}</p>
              ) : (
                <ul className="mt-3 list-none p-0">
                  {found.trainings.map((tr) => (
                    <li
                      key={`${tr.title}-${tr.on}`}
                      className="border-b border-border-default py-2 last:border-0"
                    >
                      <span dir="auto" className="block text-[15px] font-semibold text-ink">
                        {tr.title}
                      </span>
                      <span className="mt-0.5 block text-[13.5px] text-muted">
                        {formatShortDate(tr.on, locale)}
                        {tr.completed === true ? ` · ${t('survey:section0.completed')}` : ''}
                        {tr.completed === false ? ` · ${t('survey:section0.notCompleted')}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {outcome && outcome !== 'started' && outcome !== 'resumed' ? (
              <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
                <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
                  {t('survey:section0.cannotStart')}
                </div>
                <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
                  {outcome === 'already_exists' && existing
                    ? t('survey:section0.refused.already_exists', {
                        round: t(`survey:round.${existing.round ?? round}`),
                        date: existing.contactDate
                          ? formatShortDate(existing.contactDate, locale)
                          : '',
                      })
                    : t(`survey:section0.refused.${outcome}`)}
                </p>
              </div>
            ) : null}

            {start.isError ? (
              <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
                {t('survey:section0.startFailed')}
              </p>
            ) : null}

            <div className="mt-6 border-t-[3px] border-ink pt-4">
              <p className="m-0 mb-3 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
                {t('survey:section0.savesNote')}
              </p>
              <button
                type="submit"
                disabled={!ready}
                className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
              >
                {start.isPending ? t('survey:section0.starting') : t('survey:section0.begin')}
              </button>
            </div>
          </>
        ) : null}
      </form>
    </>
  )
}

export default FollowupStart
