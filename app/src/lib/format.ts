import { format as formatDateFns } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'

export type AppLocale = 'en' | 'ar'

/**
 * D-1 (08_FRONTEND_BUILD_PLAN section 4): Western digits `1234` or
 * Arabic-Indic `١٢٣٤`?
 *
 * The plan recommends Western and says to confirm with the coordinator. That
 * confirmation has NOT happened, so the choice lives here as one named constant
 * rather than being scattered through the code. Flipping it to 'arab' switches
 * every number, date and currency in the app at once.
 */
const ARABIC_NUMBERING_SYSTEM: 'latn' | 'arab' = 'latn'

/** BCP-47 tags used for Intl. Jordan regional formatting. */
const INTL_LOCALE: Record<AppLocale, string> = {
  en: 'en-JO',
  ar: `ar-JO-u-nu-${ARABIC_NUMBERING_SYSTEM}`,
}

/** date-fns locales. D-2: Gregorian, matching the plan's Gregorian quarters. */
const DATE_FNS_LOCALE: Record<AppLocale, DateFnsLocale> = {
  en: enGB,
  ar: ar,
}

function resolve(locale: string): AppLocale {
  return locale.startsWith('ar') ? 'ar' : 'en'
}

/** Gregorian date. `d MMMM yyyy` -> "24 August 2026" / "٢٤ أغسطس ٢٠٢٦". */
export function formatDate(
  value: Date | number,
  locale: string,
  pattern = 'd MMMM yyyy',
): string {
  const l = resolve(locale)
  return formatDateFns(value, pattern, { locale: DATE_FNS_LOCALE[l] })
}

/**
 * The compact date the prototype uses in tables: `11 Mar 2026`.
 *
 * Distinct from formatDate's long form, which is for detail screens where
 * there is room for "11 March 2026".
 */
export function formatShortDate(value: Date | number | string, locale: string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return formatDate(d, locale, 'd MMM yyyy')
}

/**
 * A date range: `12—14 Mar 2026`, collapsing the month and year when both ends
 * share them.
 *
 * The prototype ALWAYS prints the end month and year and never repeats the
 * start's, which reads as "30—2 Apr 2026" for a range crossing a month. That is
 * fine in a mock whose four events all sit inside one month; it would misstate
 * a real event on a donor return, so the cross-month case is spelled out in
 * full here. Same output as the prototype for every same-month range.
 */
export function formatDateRange(start: string, end: string, locale: string): string {
  const a = new Date(start)
  const b = new Date(end)
  const dash = '—'
  const sameMonth = a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()
  if (sameMonth) {
    return `${formatDate(a, locale, 'd')}${dash}${formatShortDate(b, locale)}`
  }
  return `${formatShortDate(a, locale)} ${dash} ${formatShortDate(b, locale)}`
}

/** Plain number via Intl. */
export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(INTL_LOCALE[resolve(locale)], options).format(value)
}

/**
 * Jordanian dinar.
 *
 * JOD has THREE decimal places -- 1 dinar = 1000 fils. `12.500 JOD`, never
 * `12.50`. Intl knows this, but both fraction digits are pinned explicitly so a
 * future options override cannot silently truncate a currency amount on a
 * donor-facing report.
 */
export function formatJOD(value: number, locale: string): string {
  return new Intl.NumberFormat(INTL_LOCALE[resolve(locale)], {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

/** Percentage. Pass 0.58 for 58%. */
export function formatPercent(
  value: number,
  locale: string,
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(INTL_LOCALE[resolve(locale)], {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
