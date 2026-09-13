import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useApplicantLookup,
  useActivityTypes,
  groupNationalId,
  isCompleteNationalId,
  isUsablePhone,
  labelOf,
  normaliseNationalId,
} from '../../data/apply'
import { useRequestLinkage, type LinkageRequestOutcome } from '../../data/linkage'
import { PublicShell } from './PublicShell'
import { PublicNotFound, hasLinkageJourney, usePublicSite } from './PublicSite'
import { ARROW_START } from '../../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The public linkage request.
 *
 *  ── WHY THIS IS NOT A COPY OF ApplyForm ──
 *
 *  It shares the identity steps and almost nothing else, and the difference is
 *  the whole point rather than a detail:
 *
 *  ApplyForm can REGISTER someone. A training is open to anyone, so a visitor
 *  the database has never seen is a new participant. Linkage is earned -- it
 *  requires a completed advisory, which requires a completed training -- so
 *  someone this database does not know CANNOT be eligible, and `request_linkage`
 *  has no path that writes to `person` at all (0066).
 *
 *  So the "we have no record of this number" branch here must not offer
 *  "register me", and this file must never grow that button by being brought
 *  into line with the other form. It offers checking the number, the phone
 *  fallback, and the office. Three answers, none of which create anything.
 *
 *  ── ELIGIBILITY IS NOT CHECKED BEFORE THE FORM ──
 *
 *  Someone can fill in the whole request and be told at the end that they have
 *  no completed advisory on record. That is deliberate. Checking earlier would
 *  mean an endpoint that answers "has this person completed an advisory?", and
 *  the identity gate in front of it is a date of birth -- which is not a
 *  secret. The rest of the public surface was built to avoid exactly that, and
 *  one convenience is not worth reopening it.
 *
 *  The typed text is not lost when it happens: the outcome panel offers a way
 *  back to the form, and React state is still holding every field.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Step = 'identify' | 'phone' | 'notFound' | 'confirm' | 'details' | 'done'

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

const PRIMARY =
  'inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] ' +
  'font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed ' +
  'disabled:bg-track disabled:text-faint'

const SECONDARY =
  'inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 ' +
  'font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink'

export function LinkageRequest() {
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'

  const site = usePublicSite()
  const lookup = useApplicantLookup()
  const submitRequest = useRequestLinkage()
  const activityTypes = useActivityTypes(true)

  const [step, setStep] = useState<Step>('identify')
  const [nid, setNid] = useState('')
  const [nid2, setNid2] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [foundName, setFoundName] = useState<string | null>(null)
  const [usedPhone, setUsedPhone] = useState(false)
  const [touched, setTouched] = useState(false)

  const [title, setTitle] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  const [mainProduct, setMainProduct] = useState('')
  const [request, setRequest] = useState('')

  const [outcome, setOutcome] = useState<LinkageRequestOutcome | null>(null)

  // One id per attempt, reused across retries. A dropped connection after the
  // write returns already_requested rather than writing a second row.
  const clientUuid = useMemo(() => crypto.randomUUID(), [])

  const idsMatch = normaliseNationalId(nid) === normaliseNationalId(nid2)
  const idReady = isCompleteNationalId(nid) && idsMatch
  const canLookup = idReady && !!dob
  const detailsReady = !!title.trim() && !!activityTypeId && !!request.trim()

  // After every hook. The journey is Sahel Horan's (see hasLinkageJourney);
  // on any other municipality's site this address is not a page.
  if (!hasLinkageJourney(site.municipality.code)) return <PublicNotFound />

  async function runLookup(withPhone: boolean) {
    const res = await lookup.mutateAsync({
      nationalId: nid,
      dateOfBirth: withPhone ? null : dob,
      phone: withPhone ? phone : null,
      municipalitySlug: site.slug,
    })
    setUsedPhone(withPhone)
    if (res.found) {
      setFoundName(res.full_name)
      setStep('confirm')
    } else {
      setStep('notFound')
    }
  }

  async function submit() {
    const res = await submitRequest.mutateAsync({
      nationalId: nid,
      // Whichever one identified them is the one the RPC re-checks. Sending
      // both would let a wrong date of birth through on a phone match.
      dateOfBirth: usedPhone ? null : dob,
      phone: usedPhone ? phone : null,
      initiativeTitle: title,
      activityTypeId,
      request,
      ...(mainProduct.trim() ? { mainProduct } : {}),
      clientUuid,
      municipalitySlug: site.slug,
    })
    setOutcome(res.result)
    setStep('done')
  }

  const succeeded = outcome === 'requested' || outcome === 'already_requested'

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
        {t('linkage.heading')}
      </h1>
      <p dir="auto" className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-body">
        {t('linkage.intro')}
      </p>
      <p dir="auto" className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-muted">
        {t('linkage.whoCanAsk')}
      </p>

      {/* ── step 1: who are you ────────────────────────────────────────── */}
      {step === 'identify' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (canLookup) void runLookup(false)
          }}
        >
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('linkage.identifyIntro')}</p>

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

          {/* Entered twice, and paste is refused: pasting the same wrong value
              twice confirms nothing. Same defence as the application form. */}
          <Field
            label={t('apply.nationalIdAgain')}
            hint={t('apply.nationalIdAgainHint')}
            error={
              touched && isCompleteNationalId(nid) && !idsMatch ? t('apply.errNoMatch') : undefined
            }
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

          <button type="submit" disabled={!canLookup || lookup.isPending} className={`${PRIMARY} mt-5 w-full sm:w-auto`}>
            {lookup.isPending ? t('apply.checking') : t('apply.continue')}
          </button>
        </form>
      ) : null}

      {/* ── no record. NOTHING here creates a person. ──────────────────── */}
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
          {/* The difference from the application form, stated rather than
              implied: there is no self-registration on this page, because
              linkage is earned through sessions the Municipality ran. */}
          <p className="mt-3 border-s-[3px] border-ink bg-sunken p-3 text-[15px] leading-[1.55] text-body">
            {t('linkage.noRecordWhy')}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setNid('')
                setNid2('')
                setTouched(false)
                setStep('identify')
              }}
              className={PRIMARY}
            >
              {t('apply.yesCheckNumber')}
            </button>
            <button type="button" onClick={() => setStep('phone')} className={SECONDARY}>
              {t('apply.yesTryPhone')}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── phone fallback, for people with no date of birth on file ───── */}
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
            className={`${PRIMARY} mt-5 w-full sm:w-auto`}
          >
            {lookup.isPending ? t('apply.checking') : t('apply.continue')}
          </button>
        </form>
      ) : null}

      {/* ── is this you ───────────────────────────────────────────────── */}
      {step === 'confirm' ? (
        <div className="mt-6 border-[1.5px] border-ink p-4 sm:p-5">
          <p className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            {t('apply.isThisYou')}
          </p>
          <p dir="auto" className="mt-2 text-[24px] font-extrabold leading-[1.2] tracking-[-0.02em]">
            {foundName}
          </p>
          <p className="mt-3 text-[14px] text-muted">{t('apply.isThisYouHint')}</p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setStep('details')} className={PRIMARY}>
              {t('linkage.yesContinue')}
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
              className={SECONDARY}
            >
              {t('apply.notMe')}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── what you produce, and what you need ────────────────────────── */}
      {step === 'details' ? (
        <form
          className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (detailsReady) void submit()
          }}
        >
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('linkage.detailsIntro')}</p>

          <Field label={t('linkage.title')} hint={t('linkage.titleHint')}>
            <input
              className={INPUT}
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label={t('linkage.activityType')} hint={t('linkage.activityTypeHint')}>
            <select
              className={INPUT}
              value={activityTypeId}
              disabled={activityTypes.isLoading}
              onChange={(e) => setActivityTypeId(e.target.value)}
            >
              <option value="">{t('apply.choose')}</option>
              {(activityTypes.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {labelOf(a, locale)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('linkage.mainProduct')} hint={t('linkage.mainProductHint')}>
            <input
              className={INPUT}
              dir="auto"
              value={mainProduct}
              onChange={(e) => setMainProduct(e.target.value)}
            />
          </Field>

          <Field label={t('linkage.request')} hint={t('linkage.requestHint')}>
            <textarea
              className={`${INPUT} min-h-32 py-2 leading-[1.5]`}
              dir="auto"
              rows={5}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
            />
          </Field>

          {submitRequest.isError ? (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
              {t('apply.errNetwork')}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!detailsReady || submitRequest.isPending}
            className={`${PRIMARY} mt-5 w-full sm:w-auto`}
          >
            {submitRequest.isPending ? t('apply.sending') : t('apply.submit')}
          </button>
        </form>
      ) : null}

      {/* ── outcome ────────────────────────────────────────────────────── */}
      {step === 'done' && outcome ? (
        <div
          className={`mt-6 border-[1.5px] p-5 sm:p-6 ${
            succeeded ? 'border-success bg-sunken' : 'border-error bg-sunken'
          }`}
        >
          <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
            {t(`linkage.outcome.${outcome}.title`)}
          </p>
          <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-body">
            {t(`linkage.outcome.${outcome}.body`)}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              to={site.path()}
              className={`${PRIMARY} no-underline hover:text-bg`}
            >
              {t('apply.backToList')}
            </Link>
            {/* Everything typed is still in state, so this is a way back rather
                than a fresh start. Offered for the outcomes a person can
                actually do something about. */}
            {outcome === 'failed' || outcome === 'ineligible' ? (
              <button type="button" onClick={() => setStep('details')} className={SECONDARY}>
                {t('linkage.backToForm')}
              </button>
            ) : null}
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
                className={SECONDARY}
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

export default LinkageRequest
