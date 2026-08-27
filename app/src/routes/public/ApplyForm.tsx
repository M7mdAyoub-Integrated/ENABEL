import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublicOpportunity, availabilityOf } from '../../data/publicOpportunities'
import {
  useApplicantLookup,
  useApplyForOpportunity,
  groupNationalId,
  isCompleteNationalId,
  isUsablePhone,
  normaliseNationalId,
  type ApplyOutcome,
} from '../../data/apply'
import { PublicShell } from './PublicShell'
import { ARROW_START } from '../../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The application form.
 *
 *  ── THE THING THIS SCREEN EXISTS TO PREVENT ──
 *
 *  A mistyped national ID creates a second person row for someone who is
 *  already on file. A1.3, B1.2, D0.1 and E0.2 all count DISTINCT person_id, so
 *  that duplicate inflates four donor figures permanently, and merging it later
 *  means rewriting every enrolment that points at the wrong row.
 *
 *  The database makes the duplicate impossible -- `on conflict (national_id)
 *  do nothing` (migration 0054). But refusing at the end is a bad experience
 *  and teaches nobody. So this screen tries to make a typo VISIBLE BEFORE the
 *  record is written, four ways:
 *
 *   1. THE NUMBER IS ENTERED TWICE. The second field refuses paste. This is the
 *      only defence that catches the common case -- reading the card correctly
 *      and mistyping it -- because both fields would have to be wrong the same
 *      way.
 *
 *   2. IT IS ECHOED BACK GROUPED AND LARGE. `300 000 001` can be checked
 *      against a card; `300000001` cannot, and asking someone to proofread nine
 *      undifferentiated digits is asking them to say yes.
 *
 *   3. ON A MATCH, THE NAME IS SHOWN AND MUST BE CONFIRMED. If the number
 *      belonged to someone else, this is where it stops -- and it stops before
 *      anything is written.
 *
 *   4. THE "NOT FOUND" BRANCH DOES NOT OFFER "REGISTER ME" AS ITS DEFAULT.
 *      That branch is the dangerous one: an existing participant who mistyped
 *      lands there, and self-registering is exactly the wrong thing to do. So
 *      it asks a question first -- have you taken part before? -- and someone
 *      who says yes is sent back to check the number, or to the office.
 *
 *  What is deliberately NOT done: warning that a similar national ID exists.
 *  It would catch more typos and it would re-open the existence oracle that
 *  applicant_prefill was built to close. Near-miss detection belongs on the
 *  staff side, as a review flag, not in front of an anonymous visitor.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Step =
  | 'identify'
  | 'notFound'
  | 'phone'
  | 'confirm'
  | 'register'
  | 'done'

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string | undefined
  error?: string | undefined
  children: React.ReactNode
}) {
  return (
    <label className="mt-4 block">
      <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {hint ? <span className="mt-0.5 block text-[13px] text-muted">{hint}</span> : null}
      <span className="mt-1.5 block">{children}</span>
      {error ? (
        <span role="alert" className="mt-1 block text-[13px] font-semibold text-error">
          {error}
        </span>
      ) : null}
    </label>
  )
}

const INPUT =
  'block w-full min-h-12 border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink ' +
  'focus:border-ink focus:outline-none'

export function ApplyForm() {
  const { id } = useParams()
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'
  const q = usePublicOpportunity(id)
  const o = q.data

  const lookup = useApplicantLookup()
  const apply = useApplyForOpportunity()

  const [step, setStep] = useState<Step>('identify')
  const [nid, setNid] = useState('')
  const [nid2, setNid2] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [sex, setSex] = useState('')
  const [village, setVillage] = useState('')
  const [foundName, setFoundName] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null)
  const [touched, setTouched] = useState(false)

  // One id per attempt, reused across retries. If the network drops after the
  // write but before the response, resending this returns already_applied
  // rather than creating a second application.
  const clientUuid = useMemo(() => crypto.randomUUID(), [])

  const idsMatch = normaliseNationalId(nid) === normaliseNationalId(nid2)
  const idReady = isCompleteNationalId(nid) && idsMatch
  const canLookup = idReady && !!dob

  if (q.isLoading) {
    return (
      <PublicShell>
        <div aria-hidden="true" className="pt-7">
          <div className="h-6 w-32 animate-pulse bg-track" />
          <div className="mt-4 h-10 w-3/4 animate-pulse bg-track" />
          <div className="mt-6 h-56 animate-pulse bg-track" />
        </div>
      </PublicShell>
    )
  }

  if (q.isError || !o) {
    return (
      <PublicShell>
        <div className="mt-8 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
          <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">{t('detail.notFound')}</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-body">
            {t('detail.notFoundBody')}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('detail.back')}
          </Link>
        </div>
      </PublicShell>
    )
  }

  const a = availabilityOf(o)
  if (a.kind === 'closed' || a.kind === 'full') {
    return (
      <PublicShell>
        <div className="mt-8 border-[1.5px] border-ink p-6 text-center">
          <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">{o.title}</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-[15px] text-body">
            {a.kind === 'full' ? t('detail.applyFull') : t('detail.applyClosed')}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('detail.back')}
          </Link>
        </div>
      </PublicShell>
    )
  }

  // Exhibitions need a producer type, which is not public reference data yet.
  // Rather than show a form that cannot be submitted, say so plainly.
  const exhibitionBlocked = o.opportunity_type === 'exhibition'

  async function runLookup(withPhone: boolean) {
    const res = await lookup.mutateAsync({
      nationalId: nid,
      dateOfBirth: withPhone ? null : dob,
      phone: withPhone ? phone : null,
    })
    if (res.found) {
      setFoundName(res.full_name)
      setVillage(res.village ?? '')
      setStep('confirm')
    } else {
      setStep(withPhone ? 'notFound' : 'notFound')
    }
  }

  async function submit(isNew: boolean) {
    const res = await apply.mutateAsync({
      opportunityId: o!.id,
      opportunityType: o!.opportunity_type,
      nationalId: nid,
      dateOfBirth: dob || null,
      phone: phone || null,
      ...(isNew ? { fullName, sex, village } : {}),
      clientUuid,
    })
    setOutcome(res.result)
    setStep('done')
  }

  return (
    <PublicShell>
      <Link
        to={`/opportunity/${o.id}`}
        className="mt-5 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">{ARROW_START}</span>
        <span className="ms-2">{t('apply.backToDetail')}</span>
      </Link>

      <h1
        dir="auto"
        className="mt-1 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[32px]"
        style={{ textWrap: 'balance' }}
      >
        {t('apply.heading')}
      </h1>
      <p dir="auto" className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-muted">
        {o.title}
      </p>

      {exhibitionBlocked ? (
        <div className="mt-6 border-[1.5px] border-dashed border-border-strong bg-sunken p-5">
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('apply.exhibitionSoon')}</p>
        </div>
      ) : null}

      {/* ── step 1 ─────────────────────────────────────────────────────── */}
      {!exhibitionBlocked && step === 'identify' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (canLookup) void runLookup(false)
          }}
        >
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('apply.identifyIntro')}</p>

          <Field
            label={t('apply.nationalId')}
            hint={t('apply.nationalIdHint')}
            error={touched && !isCompleteNationalId(nid) ? t('apply.errNineDigits') : undefined}
          >
            <input
              className={INPUT}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              value={nid}
              onChange={(e) => setNid(normaliseNationalId(e.target.value))}
            />
          </Field>

          {/* Defence 1. Paste is refused here on purpose: pasting the same
              wrong value twice confirms nothing. */}
          <Field
            label={t('apply.nationalIdAgain')}
            hint={t('apply.nationalIdAgainHint')}
            error={touched && isCompleteNationalId(nid) && !idsMatch ? t('apply.errNoMatch') : undefined}
          >
            <input
              className={INPUT}
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              value={nid2}
              onPaste={(e) => e.preventDefault()}
              onChange={(e) => setNid2(normaliseNationalId(e.target.value))}
            />
          </Field>

          {/* Defence 2. Grouped and large enough to check against a card. */}
          {idReady ? (
            <p className="mt-3 border-s-[3px] border-ink bg-sunken p-3 text-[15px] text-body">
              {t('apply.checkAgainstCard')}{' '}
              <strong dir="ltr" className="ms-1 inline-block text-[19px] tracking-[0.08em]">
                {groupNationalId(nid)}
              </strong>
            </p>
          ) : null}

          <Field label={t('apply.dateOfBirth')} hint={t('apply.dateOfBirthHint')}>
            <input
              className={INPUT}
              type="date"
              dir="ltr"
              value={dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>

          {lookup.isError ? (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
              {t('apply.errNetwork')}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canLookup || lookup.isPending}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {lookup.isPending ? t('apply.checking') : t('apply.continue')}
          </button>
        </form>
      ) : null}

      {/* ── found: confirm it is really you ────────────────────────────── */}
      {step === 'confirm' ? (
        <div className="mt-6 border-[1.5px] border-ink p-4 sm:p-5">
          <p className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            {t('apply.isThisYou')}
          </p>
          <p dir="auto" className="mt-2 text-[24px] font-extrabold leading-[1.2] tracking-[-0.02em]">
            {foundName}
          </p>
          <p className="mt-3 text-[14px] text-muted">{t('apply.isThisYouHint')}</p>

          {apply.isError ? (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
              {t('apply.errNetwork')}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={apply.isPending}
              onClick={() => void submit(false)}
              className="inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:bg-track disabled:text-faint"
            >
              {apply.isPending ? t('apply.sending') : t('apply.yesApply')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFoundName(null)
                setNid('')
                setNid2('')
                setTouched(false)
                setStep('identify')
              }}
              className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              {t('apply.notMe')}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── not found: the dangerous branch, so it asks rather than offers ── */}
      {step === 'notFound' ? (
        <div className="mt-6 border-[1.5px] border-ink p-4 sm:p-5">
          <p className="m-0 text-[17px] font-extrabold tracking-[-0.02em]">
            {t('apply.noRecordTitle')}
          </p>
          <p className="mt-2 text-[15px] leading-[1.55] text-body">
            {t('apply.noRecordBody')}{' '}
            <strong dir="ltr" className="inline-block tracking-[0.08em]">
              {groupNationalId(nid)}
            </strong>
          </p>
          <p className="mt-3 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            {t('apply.takenPartBefore')}
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {/* The safe answer is first and is the primary button. */}
            <button
              type="button"
              onClick={() => {
                setNid('')
                setNid2('')
                setTouched(false)
                setStep('identify')
              }}
              className="inline-flex min-h-12 items-center justify-center bg-ink px-5 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg"
            >
              {t('apply.yesCheckNumber')}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-5 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              {t('apply.yesTryPhone')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFullName('')
                setStep('register')
              }}
              className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-muted px-5 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-muted"
            >
              {t('apply.noFirstTime')}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── phone fallback, for people with no date of birth on file ────── */}
      {step === 'phone' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (isUsablePhone(phone)) void runLookup(true)
          }}
        >
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('apply.phoneIntro')}</p>
          <Field label={t('apply.phone')} hint={t('apply.phoneHint')}>
            <input
              className={INPUT}
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <button
            type="submit"
            disabled={!isUsablePhone(phone) || lookup.isPending}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {lookup.isPending ? t('apply.checking') : t('apply.continue')}
          </button>
        </form>
      ) : null}

      {/* ── register, for someone genuinely new ─────────────────────────── */}
      {step === 'register' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (fullName.trim() && dob) void submit(true)
          }}
        >
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('apply.registerIntro')}</p>

          <p className="mt-3 border-s-[3px] border-ink bg-sunken p-3 text-[14px] text-body">
            {t('apply.registeringAs')}{' '}
            <strong dir="ltr" className="inline-block tracking-[0.08em]">
              {groupNationalId(nid)}
            </strong>
          </p>

          <Field label={t('apply.fullName')} hint={t('apply.fullNameHint')}>
            <input
              className={INPUT}
              dir="auto"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label={t('apply.sex')}>
            <select className={INPUT} value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">{t('apply.preferNotToSay')}</option>
              <option value="female">{t('apply.female')}</option>
              <option value="male">{t('apply.male')}</option>
            </select>
          </Field>

          <Field label={t('apply.village')}>
            <input
              className={INPUT}
              dir="auto"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
          </Field>

          <Field label={t('apply.phoneOptional')} hint={t('apply.phoneHint')}>
            <input
              className={INPUT}
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          {apply.isError ? (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
              {t('apply.errNetwork')}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!fullName.trim() || !dob || apply.isPending}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {apply.isPending ? t('apply.sending') : t('apply.submit')}
          </button>
        </form>
      ) : null}

      {/* ── outcome ────────────────────────────────────────────────────── */}
      {step === 'done' && outcome ? (
        <div
          className={`mt-6 border-[1.5px] p-5 sm:p-6 ${
            outcome === 'applied' || outcome === 'already_applied'
              ? 'border-success bg-sunken'
              : 'border-error bg-sunken'
          }`}
        >
          <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
            {t(`apply.outcome.${outcome}.title`)}
          </p>
          <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-body">
            {t(`apply.outcome.${outcome}.body`)}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
            >
              {t('apply.backToList')}
            </Link>
            {outcome === 'cannot_verify' ? (
              <button
                type="button"
                onClick={() => {
                  setNid('')
                  setNid2('')
                  setTouched(false)
                  setOutcome(null)
                  setStep('identify')
                }}
                className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink"
              >
                {t('apply.tryAgain')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-6 max-w-[52ch] text-[13px] leading-[1.5] text-muted">
        {t('apply.privacyNote', { locale })}
      </p>
    </PublicShell>
  )
}

export default ApplyForm
