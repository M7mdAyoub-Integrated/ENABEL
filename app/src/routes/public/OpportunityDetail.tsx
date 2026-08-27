import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { availabilityOf, usePublicOpportunity } from '../../data/publicOpportunities'
import { PublicShell } from './PublicShell'
import { AvailabilityLine } from './OpportunityCard'
import { formatDateRange, formatShortDate } from '../../lib/format'
import { ARROW_START } from '../../ui/glyphs'

/**
 * One opportunity in full.
 *
 * Someone lands here from a shared link, so it repeats enough context to stand
 * alone: what kind of thing this is, what it involves, and — for advisory —
 * that a completed training is needed first, said in words rather than shown as
 * a disabled button.
 *
 * The facts are a definition list rather than prose because they get scanned,
 * not read, and because a two-column layout at 320px would wrap into nonsense.
 * Label above value, stacked, all the way up.
 */

const TYPE_ACCENT: Record<string, string> = {
  training: 'bg-teal',
  advisory: 'bg-green',
  exhibition: 'bg-amber',
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border-default py-3">
      <dt className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      {/* A venue or contact name may be English on an Arabic page, or the
          reverse. dir="auto" resolves each value from its own first strong
          character, so punctuation lands on the correct end. */}
      <dd dir="auto" className="mt-1 text-[15px] text-ink">
        {children}
      </dd>
    </div>
  )
}

export function OpportunityDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'
  const q = usePublicOpportunity(id)
  const o = q.data

  if (q.isLoading) {
    return (
      <PublicShell>
        <div aria-hidden="true" className="pt-7">
          <div className="h-6 w-32 animate-pulse bg-track" />
          <div className="mt-4 h-10 w-3/4 animate-pulse bg-track" />
          <div className="mt-6 h-40 animate-pulse bg-track" />
        </div>
      </PublicShell>
    )
  }

  // Gone from the public view means closed, filled, finished or withdrawn. The
  // visitor does not need to know which -- only that it is not available and
  // where to look instead.
  if (q.isError || !o) {
    return (
      <PublicShell>
        <div className="mt-8 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
          <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
            {t('detail.notFound')}
          </p>
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

  const topic = locale.startsWith('ar') ? (o.topic_ar ?? o.topic_en) : o.topic_en
  const a = availabilityOf(o)
  const canApply = a.kind === 'places' || a.kind === 'open'

  return (
    <PublicShell>
      <Link
        to="/"
        className="mt-5 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">{ARROW_START}</span>
        <span className="ms-2">{t('detail.back')}</span>
      </Link>

      <header className="mt-1">
        <span
          className={`inline-block px-[9px] py-[3px] font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-bg ${
            TYPE_ACCENT[o.opportunity_type] ?? 'bg-ink'
          }`}
        >
          {t(`type.${o.opportunity_type}`)}
        </span>
        <h1
          dir="auto"
          className="mt-3 text-[26px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[36px]"
          style={{ textWrap: 'balance' }}
        >
          {o.title}
        </h1>
        {/* What this kind of thing is, and for advisory, what you need first --
            in words, before anyone hunts for a disabled button. */}
        <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-muted">
          {t(`typeHint.${o.opportunity_type}`)}
        </p>
      </header>

      <div className="mt-5 border-[1.5px] border-ink p-4 sm:p-5">
        <AvailabilityLine o={o} />
        <div className="mt-3">
          {canApply ? (
            // Inert until the application flow exists. A dead link on the
            // primary action of a public page is worse than a disabled button:
            // this way the page can be shown to anyone at any moment without a
            // dead end. Swap for a Link to /apply/:id when that route lands.
            <>
              <button
                type="button"
                disabled
                className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center border-[1.5px] border-border-strong bg-sunken px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-faint sm:w-auto"
              >
                {t('detail.apply')}
              </button>
              <p className="mt-2 text-[14px] text-muted">{t('detail.applySoon')}</p>
            </>
          ) : (
            <p className="m-0 text-[15px] text-body">
              {a.kind === 'full'
                ? t('detail.applyFull')
                : a.kind === 'notYetOpen'
                  ? t('detail.applyNotYetOpen', {
                      date: formatShortDate(a.opensOn!, locale),
                    })
                  : t('detail.applyClosed')}
            </p>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="m-0 border-b-[3px] border-ink pb-2 text-[14px] font-extrabold uppercase tracking-[0.1em]">
          {t('detail.about')}
        </h2>
        {/* Descriptions are typed by staff and are not always in the page's
            language. Without dir="auto" an English paragraph on the Arabic page
            renders its full stop at the wrong end. */}
        <p
          dir="auto"
          className="mt-3 max-w-[60ch] whitespace-pre-line text-[15px] leading-[1.6] text-body"
        >
          {o.description ?? t('detail.noDescription')}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="m-0 border-b-[3px] border-ink pb-2 text-[14px] font-extrabold uppercase tracking-[0.1em]">
          {t('detail.whenWhere')}
        </h2>
        <dl className="mt-1">
          <Fact label={t('detail.dates')}>
            {formatDateRange(o.start_date, o.end_date, locale)}
          </Fact>
          {o.location ? <Fact label={t('detail.location')}>{o.location}</Fact> : null}
          {o.duration_hours ? (
            <Fact label={t('detail.duration')}>
              {t('detail.hours', { count: Number(o.duration_hours) })}
            </Fact>
          ) : null}
          {topic ? <Fact label={t('detail.topic')}>{topic}</Fact> : null}
          {o.focal_point ? <Fact label={t('detail.contact')}>{o.focal_point}</Fact> : null}
        </dl>
      </section>
    </PublicShell>
  )
}

export default OpportunityDetail
