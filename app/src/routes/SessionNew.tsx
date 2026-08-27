import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useCreateSession,
  useUpdateSession,
  useManagedSession,
  type ManagedSession,
  type SessionKind,
} from '../data/sessions'
import { usePartnerships } from '../data/partnerships'
import { useRef as useRefTable } from '../data/refTables'
import { ARROW_START } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Create a training session.
 *
 *  This is the entry point to the whole public flow. Before it existed the only
 *  way a training got into the database was `resolveSession()` creating one as
 *  a by-product of recording a completion -- which carries title, topic and
 *  dates and nothing else, so the result could never be published.
 *
 *  ── WHAT IS DELIBERATELY NOT ON THIS FORM ──
 *
 *  `is_published` and `is_delivered`. Publishing makes something public;
 *  delivery asserts it happened and feeds D0.2. Both are separate deliberate
 *  actions on the session screen. A create form that could set either would let
 *  someone make a draft public, or move a donor figure, as a side effect of
 *  filling in a form.
 *
 *  ── THE THREE WARNINGS WARN, THEY DO NOT BLOCK ──
 *
 *  Applications closing after the training starts is legal and occasionally
 *  intended. An application window entirely in the past is what recording a
 *  historic course looks like. A missing partner is normal when no training
 *  partnership exists yet. Every one of these is something a municipality might
 *  really mean, so the form says it out loud and lets them proceed. Blocking
 *  them would teach people to work around the form.
 *
 *  ── DURATION IS ASKED, NOT DERIVED ──
 *
 *  A three-day course may be twelve hours. The dates say when; the hours say
 *  how much was taught, which is what the public page and the donor return both
 *  need.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const INPUT =
  'block w-full min-h-11 border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink ' +
  'focus:border-ink focus:outline-none'

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string | undefined
  required?: boolean | undefined
  children: React.ReactNode
}) {
  const { t } = useTranslation('forms')
  return (
    <label className="block">
      <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
        {required ? <span className="ms-1 text-error">{t('newSession.requiredMark')}</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-[13px] text-muted">{hint}</span> : null}
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[13.5px] leading-[1.5] text-body">
      {children}
    </p>
  )
}

/**
 * One form, two modes.
 *
 * Editing exists because of migration 0063: a session created as a by-product
 * of a completion arrives with a title, a topic and dates and nothing else, and
 * marking it "needs details" without a way to supply them would be worse than
 * not marking it at all.
 *
 * The same form serves both so a coordinator learns one screen, and so the
 * rules -- duration asked not derived, the three warnings, what goes public --
 * cannot drift between creating and fixing.
 */
export function SessionNew({
  mode = 'new',
  kind = 'training',
}: {
  mode?: 'new' | 'edit'
  kind?: SessionKind
}) {
  const { t } = useTranslation('forms')
  const { id } = useParams()
  const existing = useManagedSession(kind, mode === 'edit' ? id : undefined)

  if (mode === 'edit') {
    if (existing.isLoading) {
      return (
        <div aria-hidden="true" className="pt-6">
          <div className="h-8 w-64 animate-pulse bg-track" />
          <div className="mt-6 h-96 animate-pulse bg-track" />
        </div>
      )
    }
    if (existing.isError || !existing.data) {
      return (
        <div role="alert" className="mt-6 border-[1.5px] border-error p-5">
          <p className="m-0 text-[15px]">{t('session.loadFailed')}</p>
        </div>
      )
    }
  }

  // Keyed on the row so the form MOUNTS with its values already in state.
  // Filling them in an effect instead would mean rendering an empty form and
  // then overwriting it, which cascades renders and can clobber typing when a
  // refetch lands mid-edit.
  return (
    <SessionForm
      key={existing.data?.id ?? 'new'}
      mode={mode}
      kind={kind}
      {...(id ? { id } : {})}
      {...(existing.data ? { initial: existing.data } : {})}
    />
  )
}

function SessionForm({
  mode,
  kind,
  id,
  initial,
}: {
  mode: 'new' | 'edit'
  kind: SessionKind
  id?: string
  initial?: ManagedSession
}) {
  const { t, i18n } = useTranslation(['forms', 'nav'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const nav = useNavigate()
  const create = useCreateSession()
  const update = useUpdateSession()

  const topics = useRefTable('training_topic')
  const partnerships = usePartnerships('training')

  const [title, setTitle] = useState(initial?.title ?? '')
  const [topicId, setTopicId] = useState(initial?.topic_id ?? '')
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [hours, setHours] = useState(
    initial?.duration_hours == null ? '' : String(initial.duration_hours),
  )
  const [venue, setVenue] = useState(initial?.venue ?? '')
  const [partnershipId, setPartnershipId] = useState(initial?.delivered_by_partnership_id ?? '')
  const [focalPoint, setFocalPoint] = useState(initial?.focal_point ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [seats, setSeats] = useState(
    initial?.planned_seats == null ? '' : String(initial.planned_seats),
  )
  const [opensOn, setOpensOn] = useState(initial?.application_opens_on ?? '')
  const [closesOn, setClosesOn] = useState(initial?.application_closes_on ?? '')

  const base = kind === 'advisory' ? '/advisory' : '/sessions'
  const today = new Date().toISOString().slice(0, 10)

  const durationOk = hours !== '' && Number(hours) > 0
  const datesOk = !!startDate && !!endDate && endDate >= startDate
  const ready =
    title.trim() && topicId && datesOk && durationOk && venue.trim() && focalPoint.trim()

  // Warnings, computed from what has been typed so far. None of them block.
  const closesAfterStart = !!closesOn && !!startDate && closesOn > startDate
  const windowInPast = !!closesOn && closesOn < today
  const noPartners = !partnerships.isLoading && (partnerships.data ?? []).length === 0
  const endBeforeStart = !!startDate && !!endDate && endDate < startDate

  const busy = create.isPending || update.isPending
  const failed = create.isError || update.isError

  async function submit() {
    const values = {
      title,
      topicId,
      startDate,
      endDate,
      durationHours: Number(hours),
      venue,
      partnershipId: partnershipId || null,
      focalPoint,
      description,
      plannedSeats: seats === '' ? null : Number(seats),
      applicationOpensOn: opensOn || null,
      applicationClosesOn: closesOn || null,
    }
    if (mode === 'edit' && id) {
      await update.mutateAsync({ ...values, id, kind })
      nav(`${base}/${id}`)
      return
    }
    const row = await create.mutateAsync({ ...values, kind })
    // Straight to the session, which is where publishing happens. The form
    // deliberately does not offer to publish.
    nav(`${base}/${row.id}`)
  }

  return (
    <div className="pb-16">
      <Link
        to={mode === 'edit' && id ? `${base}/${id}` : base}
        className="mt-4 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">
          {ARROW_START}
        </span>
        <span className="ms-2">{t('forms:session.backToSessions')}</span>
      </Link>

      <h1 className="mt-1 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[30px]">
        {mode === 'edit' ? t('forms:newSession.headingEdit') : t('forms:newSession.heading')}
      </h1>
      <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.5] text-muted">
        {t('forms:newSession.intro')}
      </p>

      <form
        className="mt-6 flex max-w-[760px] flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready && !busy) void submit()
        }}
      >
        {/* ── what it is ─────────────────────────────────────────────── */}
        <fieldset className="border-[1.5px] border-border-strong p-4">
          <legend className="px-1 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('forms:newSession.sectionWhat')}
          </legend>
          <div className="flex flex-col gap-4">
            <Field label={t('forms:newSession.title')} required>
              <input dir="auto" className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            {/* The public label says "sector"; the column is topic_id and the
                list is ref_training_topic. One list, two words, no second
                table -- see 0043. */}
            <Field label={t('forms:newSession.sector')} hint={t('forms:newSession.sectorHint')} required>
              <select className={INPUT} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">{t('forms:newSession.choose')}</option>
                {topics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {locale.startsWith('ar') ? r.label_ar || r.label_en : r.label_en}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('forms:newSession.description')} hint={t('forms:newSession.goesPublic')}>
              <textarea
                dir="auto"
                rows={3}
                className={INPUT}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        {/* ── when and where ─────────────────────────────────────────── */}
        <fieldset className="border-[1.5px] border-border-strong p-4">
          <legend className="px-1 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('forms:newSession.sectionWhen')}
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('forms:newSession.startDate')} required>
              <input type="date" dir="ltr" className={INPUT} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label={t('forms:newSession.endDate')} required>
              <input type="date" dir="ltr" className={INPUT} value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
            <Field label={t('forms:newSession.hours')} hint={t('forms:newSession.hoursHint')} required>
              <input
                type="number"
                dir="ltr"
                min="0.5"
                step="0.5"
                className={INPUT}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </Field>
            <Field label={t('forms:newSession.venue')} hint={t('forms:newSession.venueHint')} required>
              <input dir="auto" className={INPUT} value={venue} onChange={(e) => setVenue(e.target.value)} />
            </Field>
          </div>
          {endBeforeStart ? <Warning>{t('forms:newSession.warnEndBeforeStart')}</Warning> : null}
        </fieldset>

        {/* ── who ────────────────────────────────────────────────────── */}
        <fieldset className="border-[1.5px] border-border-strong p-4">
          <legend className="px-1 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('forms:newSession.sectionWho')}
          </legend>
          <div className="flex flex-col gap-4">
            <Field label={t('forms:newSession.partner')} hint={t('forms:newSession.partnerHint')}>
              <select
                className={INPUT}
                value={partnershipId}
                disabled={partnerships.isLoading || noPartners}
                onChange={(e) => setPartnershipId(e.target.value)}
              >
                <option value="">{t('forms:newSession.noPartner')}</option>
                {(partnerships.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.unit ? ` — ${p.unit}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            {/* Empty dropdown is normal early on. Say so and point at where a
                partnership is created, rather than leaving a dead control. */}
            {noPartners ? (
              <Warning>
                {t('forms:newSession.warnNoPartners')}{' '}
                <Link to="/forms/tp" className="font-semibold text-ink underline">
                  {t('nav:module.tp')}
                </Link>
              </Warning>
            ) : null}

            <Field label={t('forms:newSession.focalPoint')} hint={t('forms:newSession.goesPublic')} required>
              <input dir="auto" className={INPUT} value={focalPoint} onChange={(e) => setFocalPoint(e.target.value)} />
            </Field>
          </div>
        </fieldset>

        {/* ── applications ───────────────────────────────────────────── */}
        <fieldset className="border-[1.5px] border-border-strong p-4">
          <legend className="px-1 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('forms:newSession.sectionApply')}
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('forms:newSession.opensOn')}>
              <input type="date" dir="ltr" className={INPUT} value={opensOn} onChange={(e) => setOpensOn(e.target.value)} />
            </Field>
            <Field label={t('forms:newSession.closesOn')}>
              <input type="date" dir="ltr" className={INPUT} value={closesOn} onChange={(e) => setClosesOn(e.target.value)} />
            </Field>
            {/* Places is NOT the applicant count. Set it and the public page
                shows places remaining; leave it and the page shows the closing
                date instead. An applicant count is never public. */}
            <Field label={t('forms:newSession.seats')} hint={t('forms:newSession.seatsHint')}>
              <input type="number" dir="ltr" min="1" className={INPUT} value={seats} onChange={(e) => setSeats(e.target.value)} />
            </Field>
          </div>
          {closesAfterStart ? <Warning>{t('forms:newSession.warnClosesAfterStart')}</Warning> : null}
          {windowInPast ? <Warning>{t('forms:newSession.warnWindowPast')}</Warning> : null}
        </fieldset>

        {/* ── what becomes public, quoted back ───────────────────────── */}
        {(focalPoint.trim() || description.trim()) ? (
          <div className="border-[1.5px] border-teal bg-sunken p-4">
            <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-teal">
              {t('forms:newSession.publicHeading')}
            </h2>
            <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[1.5] text-body">
              {t('forms:newSession.publicBody')}
            </p>
            {focalPoint.trim() ? (
              <p className="mt-2 text-[14px]">
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                  {t('forms:newSession.focalPoint')}
                </span>
                <span dir="auto" className="ms-2 font-semibold text-ink">
                  {focalPoint}
                </span>
              </p>
            ) : null}
            {description.trim() ? (
              <p dir="auto" className="mt-1 max-w-[62ch] whitespace-pre-line text-[14px] text-body">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        {failed ? (
          <p role="alert" className="text-[14px] font-semibold text-error">
            {t('forms:newSession.saveFailed')}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={!ready || busy}
            className="min-h-12 bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint"
          >
            {busy
              ? t('forms:newSession.saving')
              : mode === 'edit'
                ? t('forms:newSession.saveChanges')
                : t('forms:newSession.save')}
          </button>
          <Link
            to={mode === 'edit' && id ? `${base}/${id}` : base}
            className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink no-underline hover:text-ink"
          >
            {t('forms:newSession.cancel')}
          </Link>
        </div>

        <p className="max-w-[62ch] text-[13px] leading-[1.5] text-muted">
          {t('forms:newSession.notPublishedYet')}
        </p>
      </form>
    </div>
  )
}

export default SessionNew
