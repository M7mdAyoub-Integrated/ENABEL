import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  groupNationalId,
  isCompleteNationalId,
  isUsablePhone,
  normaliseNationalId,
} from '../../data/apply'
import { useMyApplications, type ApplicationRow } from '../../data/myApplications'
import { PublicShell } from './PublicShell'
import { usePublicSite } from './PublicSite'
import { ARROW_START } from '../../ui/glyphs'
import { formatShortDate } from '../../lib/format'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  "My applications" — what someone applied for, and what happened.
 *
 *  ── THE FAILURE IS ONE MESSAGE, AND THAT IS THE POINT ──
 *
 *  A wrong date of birth, a wrong phone and a national ID we have never seen
 *  all come back as the same `{"found": false}`, so this screen has one thing
 *  to say about all three. That reads as slightly unhelpful, and it is
 *  deliberate: if the page could distinguish them, anyone could use it to find
 *  out whether an ID is on the Municipality's register.
 *
 *  So the copy does not say "no applications found" -- that would leak the
 *  distinction back in words that SQL was careful not to leak. It says we could
 *  not confirm who you are, which is true of every branch.
 *
 *  ── AN EMPTY LIST IS A DIFFERENT THING FROM A FAILED LOOKUP ──
 *
 *  found: true with no rows means we know who you are and you have not applied
 *  for anything. That is safe to say plainly, because the identity check has
 *  already passed.
 *
 *  ── NOTHING IS COMPUTED HERE ──
 *
 *  The status strings come from the database as they are. This screen does not
 *  decide what "completed" means, does not infer eligibility from it, and does
 *  not tell anyone what they may do next -- the eligibility rules live in
 *  triggers, and a second copy of them in reassuring copy on a public page is
 *  a promise the database has not made.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Step = 'identify' | 'phone' | 'results'

const INPUT =
  'block w-full min-h-12 border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink ' +
  'focus:border-ink focus:outline-none'

const PRIMARY =
  'inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] ' +
  'font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed ' +
  'disabled:bg-track disabled:text-faint'

const SECONDARY =
  'inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 ' +
  'font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink'

/** Tone by status. Colour is never the only signal -- the word carries it. */
const TONE: Record<string, string> = {
  completed: 'border-success text-success',
  approved: 'border-success text-success',
  matched: 'border-success text-success',
  submitted: 'border-warning text-warning',
  under_review: 'border-warning text-warning',
  draft: 'border-border-strong text-muted',
  not_completed: 'border-border-strong text-muted',
  rejected: 'border-error text-error',
  closed: 'border-border-strong text-muted',
}

function Row({ a, locale }: { a: ApplicationRow; locale: string }) {
  const { t } = useTranslation('public')
  return (
    <li className="border-b border-border-default py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t(`mine.kind.${a.kind}`)}
        </span>
        {a.on ? (
          <span className="text-[13.5px] text-muted">{formatShortDate(a.on, locale)}</span>
        ) : null}
      </div>
      <p dir="auto" className="mt-1 mb-0 text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]">
        {a.title}
      </p>
      <span
        className={`mt-2 inline-block whitespace-nowrap border-[1.5px] px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${
          TONE[a.status] ?? 'border-border-strong text-muted'
        }`}
      >
        {/* Falls back to the raw value rather than to a blank chip: an
            unmapped status is a visible bug, an empty one is invisible. */}
        {t(`mine.status.${a.status}`, { defaultValue: a.status })}
      </span>
    </li>
  )
}

export function MyApplications() {
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'
  const site = usePublicSite()
  const lookup = useMyApplications()

  const [step, setStep] = useState<Step>('identify')
  const [nid, setNid] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [result, setResult] = useState<
    { found: false } | { found: true; applications: ApplicationRow[] } | null
  >(null)

  const canLookup = isCompleteNationalId(nid) && !!dob

  async function run(withPhone: boolean) {
    const res = await lookup.mutateAsync({
      nationalId: nid,
      dateOfBirth: withPhone ? null : dob,
      phone: withPhone ? phone : null,
      municipalitySlug: site.slug,
    })
    setResult(res)
    setStep('results')
  }

  function startOver() {
    setResult(null)
    setNid('')
    setDob('')
    setPhone('')
    setTouched(false)
    setStep('identify')
  }

  return (
    <PublicShell>
      <Link
        to={site.path()}
        className="mt-5 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">
          {ARROW_START}
        </span>
        <span className="ms-2">{t('linkage.backHome')}</span>
      </Link>

      <h1
        dir="auto"
        className="mt-1 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[32px]"
        style={{ textWrap: 'balance' }}
      >
        {t('mine.heading')}
      </h1>
      <p dir="auto" className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-body">
        {t('mine.intro')}
      </p>

      {step === 'identify' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (canLookup) void run(false)
          }}
        >
          <label className="block">
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('apply.nationalId')}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">{t('apply.nationalIdHint')}</span>
            <input
              className={`${INPUT} mt-1.5`}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              value={nid}
              onChange={(e) => setNid(normaliseNationalId(e.target.value))}
            />
            {touched && !isCompleteNationalId(nid) ? (
              <span role="alert" className="mt-1 block text-[13px] font-semibold text-error">
                {t('apply.errNineDigits')}
              </span>
            ) : null}
          </label>

          {/* No confirm field. Nothing is written here, so a typo costs a
              retry rather than a duplicate person -- the second field on the
              application form exists to stop a write, not a read. */}
          {isCompleteNationalId(nid) ? (
            <p className="mt-3 border-s-[3px] border-ink bg-sunken p-3 text-[15px] text-body">
              {t('apply.checkAgainstCard')}{' '}
              <strong dir="ltr" className="ms-1 inline-block text-[19px] tracking-[0.08em]">
                {groupNationalId(nid)}
              </strong>
            </p>
          ) : null}

          <label className="mt-4 block">
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('apply.dateOfBirth')}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">{t('apply.dateOfBirthHint')}</span>
            <input
              className={`${INPUT} mt-1.5`}
              type="date"
              dir="ltr"
              value={dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>

          {lookup.isError ? (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
              {t('apply.errNetwork')}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={!canLookup || lookup.isPending} className={PRIMARY}>
              {lookup.isPending ? t('apply.checking') : t('mine.show')}
            </button>
            <button type="button" onClick={() => setStep('phone')} className={SECONDARY}>
              {t('mine.usePhone')}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'phone' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (isCompleteNationalId(nid) && isUsablePhone(phone)) void run(true)
          }}
        >
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('apply.phoneIntro')}</p>
          <label className="mt-4 block">
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('apply.nationalId')}
            </span>
            <input
              className={`${INPUT} mt-1.5`}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              value={nid}
              onChange={(e) => setNid(normaliseNationalId(e.target.value))}
            />
          </label>
          <label className="mt-4 block">
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('apply.phone')}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">{t('apply.phoneHint')}</span>
            <input
              className={`${INPUT} mt-1.5`}
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={!isCompleteNationalId(nid) || !isUsablePhone(phone) || lookup.isPending}
            className={`${PRIMARY} mt-5`}
          >
            {lookup.isPending ? t('apply.checking') : t('mine.show')}
          </button>
        </form>
      ) : null}

      {step === 'results' && result ? (
        !result.found ? (
          <div className="mt-6 border-[1.5px] border-error bg-sunken p-5 sm:p-6">
            <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
              {t('linkage.outcome.cannot_verify.title')}
            </p>
            <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-body">
              {t('mine.cannotVerifyBody')}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={startOver} className={PRIMARY}>
                {t('apply.tryAgain')}
              </button>
              <Link to={site.path()} className={`${SECONDARY} no-underline`}>
                {t('apply.backToList')}
              </Link>
            </div>
          </div>
        ) : result.applications.length === 0 ? (
          <div className="mt-6 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
            <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
              {t('mine.emptyTitle')}
            </p>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-body">
              {t('mine.emptyBody')}
            </p>
            <Link
              to={site.path()}
              className="mt-5 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
            >
              {t('apply.backToList')}
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[3px] border-ink pb-2">
              <h2 className="m-0 text-[14px] font-extrabold uppercase tracking-[0.1em]">
                {t('mine.yours')}
              </h2>
              <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
                {t('mine.count', { count: result.applications.length })}
              </span>
            </div>
            <ul className="mt-2 list-none p-0">
              {result.applications.map((a, i) => (
                <Row key={`${a.kind}-${a.title}-${a.on ?? ''}-${i}`} a={a} locale={locale} />
              ))}
            </ul>
            <button type="button" onClick={startOver} className={`${SECONDARY} mt-5`}>
              {t('mine.checkAnother')}
            </button>
          </div>
        )
      ) : null}

      <p className="mt-6 max-w-[52ch] text-[13px] leading-[1.5] text-muted">
        {t('apply.privacyNote', { locale })}
      </p>
    </PublicShell>
  )
}

export default MyApplications
