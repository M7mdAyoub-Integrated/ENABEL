import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { availabilityOf, type PublicOpportunity } from '../../data/publicOpportunities'
import { formatShortDate, formatDateRange } from '../../lib/format'
import { SEP } from '../../ui/glyphs'

/**
 * One opportunity, as a card.
 *
 * ── THE AVAILABILITY LINE IS THE POINT OF THIS COMPONENT ──
 *
 * A farmer scanning this list is deciding one thing: is it worth my time to
 * read further. So every card ends with a single line that answers it.
 *
 * Where capacity is set, that line is "3 places left" — scarcity is the
 * decisive fact. Where it is NOT set (every training today has planned_seats
 * null) there is no honest number, so the line is the CLOSING DATE instead:
 * "Open · Apply by 14 October". That is more actionable than a place count
 * anyway, and it is true.
 *
 * What it never does: leave the space blank, invent a capacity, or fall back to
 * the applicant count. An applicant count is not availability, and publishing
 * one tells the public how many neighbours applied.
 */

const TYPE_ACCENT: Record<string, string> = {
  training: 'bg-teal',
  advisory: 'bg-green',
  exhibition: 'bg-amber',
}

export function AvailabilityLine({ o }: { o: PublicOpportunity }) {
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'
  const a = availabilityOf(o)

  if (a.kind === 'closed') {
    return (
      <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-faint">
        {t('avail.closed')}
      </span>
    )
  }
  if (a.kind === 'full') {
    return (
      <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-error">
        {t('avail.full')}
      </span>
    )
  }

  // Open. Either a place count, or — when there is no capacity — the date.
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-success">
      <span>{a.kind === 'places' ? t('avail.places', { count: a.places ?? 0 }) : t('avail.open')}</span>
      {a.closesOn ? (
        <span className="text-muted">
          {SEP} {t('avail.closesOn', { date: formatShortDate(a.closesOn, locale) })}
        </span>
      ) : null}
    </span>
  )
}

export function OpportunityCard({ o }: { o: PublicOpportunity }) {
  const { t, i18n } = useTranslation('public')
  const locale = i18n.resolvedLanguage ?? 'en'
  const topic = locale.startsWith('ar') ? (o.topic_ar ?? o.topic_en) : o.topic_en

  return (
    <li>
      <Link
        to={`/opportunity/${o.id}`}
        className="block border-[1.5px] border-ink bg-bg p-4 text-ink no-underline hover:bg-sunken sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-[9px] py-[3px] font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-bg ${
              TYPE_ACCENT[o.opportunity_type] ?? 'bg-ink'
            }`}
          >
            {t(`type.${o.opportunity_type}`)}
          </span>
          {topic ? (
            <span dir="auto" className="text-[13px] text-muted">
              {topic}
            </span>
          ) : null}
        </div>

        <h2
          dir="auto"
          className="mt-2.5 text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] sm:text-[22px]"
          style={{ textWrap: 'balance' }}
        >
          {o.title}
        </h2>

        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-body">
          <div className="flex gap-1.5">
            <dt className="sr-only">{t('detail.dates')}</dt>
            <dd dir="auto">{formatDateRange(o.start_date, o.end_date, locale)}</dd>
          </div>
          {o.location ? (
            <div className="flex gap-1.5">
              <dt className="sr-only">{t('detail.location')}</dt>
              <dd dir="auto" className="text-muted">
                {o.location}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-3 border-t border-border-default pt-2.5">
          <AvailabilityLine o={o} />
        </div>
      </Link>
    </li>
  )
}
