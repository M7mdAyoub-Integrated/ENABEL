import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublicWhatsOn, type WhatsOnItem } from '../../data/publicWhatsOn'
import { PublicShell } from './PublicShell'
import { PrimaryButton } from '../../ui/primitives'
import { formatDate } from '../../lib/format'
import { SEP, RANGE } from '../../ui/glyphs'
import { hasVolunteerJourney, usePublicSite } from './PublicSite'

/**
 * The public page of a municipality whose activities are open: what's on.
 *
 * Khalidiyah's residents are not asked to apply for anything through this
 * site -- its activities and markets are open to all. The one thing a
 * resident does here is register as a volunteer (FORM-12, a public form
 * since 26 September 2026, see hasVolunteerJourney). So the page says what
 * is coming up in the park, offers the volunteer register, and nothing else:
 * no application check, no mention of accounts or signing in.
 *
 * Reading order, for someone who arrived from a poster: what this is in one
 * sentence; then the coming activities and markets, soonest first; then the
 * volunteer register; then the way to another municipality's page.
 */
export function WhatsOn() {
  const { t } = useTranslation('public')
  const site = usePublicSite()
  const q = usePublicWhatsOn(site.slug)
  const items = q.data ?? []

  return (
    <PublicShell>
      <section className="pt-7 sm:pt-10">
        <h1 className="text-[26px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[38px]" style={{ textWrap: 'balance' }}>
          {t('whatsOn.heading')}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.55] text-body sm:text-[16px]">{t('whatsOn.intro')}</p>
      </section>

      <section className="mt-8 sm:mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[3px] border-ink pb-2">
          <h2 className="m-0 text-[14px] font-extrabold uppercase tracking-[0.1em] sm:text-[15px]">{t('whatsOn.comingUp')}</h2>
          {q.isSuccess ? (
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t('whatsOn.count', { count: items.length })}</span>
          ) : null}
        </div>

        {/* "Nothing announced" is a claim, and only a query that SUCCEEDED
            can make it. A query paused between retries (react-query reports
            pending, not fetching, not error) rendered the empty state on
            22 September 2026 while the view did not exist -- the register's
            "list that says none yet". Anything short of success is the
            skeleton or the failure notice. */}
        {q.isError ? (
          <div role="alert" className="mt-4 border-[1.5px] border-dashed border-error bg-sunken p-5 text-center">
            <p className="m-0 text-[15px] text-body">{t('home.loadFailed')}</p>
            <div className="mt-4 flex justify-center">
              <PrimaryButton onClick={() => void q.refetch()}>{t('detail.back')}</PrimaryButton>
            </div>
          </div>
        ) : !q.isSuccess ? (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0" aria-hidden="true">
            {[0, 1, 2].map((i) => <li key={i} className="h-[120px] animate-pulse border-[1.5px] border-border-default bg-track" />)}
          </ul>
        ) : items.length === 0 ? (
          <div className="mt-4 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
            <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">{t('whatsOn.emptyTitle')}</p>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-body">{t('whatsOn.emptyBody')}</p>
          </div>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {items.map((o) => <WhatsOnCard key={`${o.kind}-${o.id}`} o={o} />)}
          </ul>
        )}
      </section>

      {hasVolunteerJourney(site.municipality.code) ? <VolunteerPanel to={site.path('/volunteer')} /> : null}

      <p className="mt-8 text-[13px] text-muted">
        <Link to="/" className="text-muted underline hover:text-ink">{t('home.otherMunicipality')}</Link>
      </p>
    </PublicShell>
  )
}

/** The volunteer register, offered under what is on. The words are the form's (khld:volunteer). */
function VolunteerPanel({ to }: { to: string }) {
  const { t } = useTranslation('khld')
  return (
    <section className="mt-8 border-[1.5px] border-ink p-5 sm:mt-10 sm:p-6">
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">{t('volunteer.title')}</h2>
      <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.55] text-body">{t('volunteer.intro')}</p>
      <Link
        to={to}
        className="mt-4 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
      >
        {t('volunteer.submit')}
      </Link>
    </section>
  )
}

const KIND_ACCENT: Record<WhatsOnItem['kind'], string> = { activity: 'bg-green', market: 'bg-amber' }

function WhatsOnCard({ o }: { o: WhatsOnItem }) {
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'
  const ar = locale.startsWith('ar')
  const place = (ar ? o.place_ar : null) ?? o.place_en
  const type = (ar ? o.type_ar : null) ?? o.type_en
  const time = o.time_from && o.time_to ? `${o.time_from} ${RANGE} ${o.time_to}` : o.time_from ?? null
  // built outside the JSX: jsx-no-literals refuses a template literal as a child
  const timeText = time ? ` ${SEP} ${time}` : ''
  const placeText = place ? ` ${SEP} ${place}` : ''
  return (
    <li className="flex border-[1.5px] border-ink bg-bg">
      <span aria-hidden="true" className={`w-[7px] flex-none ${KIND_ACCENT[o.kind]}`} />
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t(`whatsOn.kind.${o.kind}`)}{type ? ` ${SEP} ${type}` : ''}
        </p>
        <h3 className="mt-1 text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] sm:text-[21px]" style={{ textWrap: 'balance' }}>{o.title}</h3>
        <p className="mt-2 text-[15px] leading-[1.5] text-body">
          <span className="font-semibold text-ink">{formatDate(o.on_date, locale)}</span>
          {time ? <span dir="ltr">{timeText}</span> : null}
          {placeText}
        </p>
        {o.description ? <p className="mt-2 max-w-[60ch] text-[14.5px] leading-[1.5] text-body" style={{ textWrap: 'pretty' }}>{o.description}</p> : null}
      </div>
    </li>
  )
}

export default WhatsOn
