export type AppLocale = 'en' | 'ar'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  D-1 RESOLVED (26 Aug 2026): WESTERN DIGITS — 1234, not ١٢٣٤.
 *
 *  Jordan uses Western digits in administrative and commercial contexts: road
 *  signs, prices, government forms. Arabic-Indic is the Egyptian and Gulf
 *  convention. Jordanians read both, so nothing breaks either way, but a
 *  municipal system showing "١٢ مكانًا" reads as imported rather than local.
 *
 *  It also has to match its neighbours. Reporting period codes (27/Q4) and
 *  indicator codes (A1.3) are Latin and cannot sensibly be anything else, so
 *  Arabic-Indic digits beside them in the same table would look like a bug.
 *
 *  ── WHY THIS CONSTANT NOW ACTUALLY GOVERNS ──
 *
 *  It used to govern one of three paths. `Intl.NumberFormat` honoured it;
 *  date-fns and the ICU plural formatter did not, and both emitted
 *  Arabic-Indic. The constant read as authoritative while reaching a third of
 *  the output.
 *
 *  Now there are two paths and this constant governs both:
 *    1. Everything in this file — numbers, currency, percentages AND dates, all
 *       through Intl with the locale below. date-fns is gone; it has no
 *       numbering-system option, which is what made it the odd one out.
 *    2. ICU plurals inside translation files — see the `latnDigits`
 *       post-processor in i18n/index.ts, which reads this same constant.
 *
 *  To reverse D-1, change this one line to 'arab' and the whole app follows.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const NUMBERING_SYSTEM: 'latn' | 'arab' = 'latn'

/**
 * BCP-47 tags used for every Intl call.
 *
 * ── WHY EN IS `en-GB` AND NOT `en-JO` ──
 *
 * `en-JO` looks like the obvious pair for `ar-JO`, and
 * `supportedLocalesOf(['en-JO'])` even returns `['en-JO']` — but that only means
 * ICU recognises the tag, not that it has data for it. `resolvedOptions().locale`
 * collapses it to bare `en`, which is US convention: dates come out
 * `Sep 5, 2026`, month first.
 *
 * Jordan writes dates day first. `en-GB` gives `5 Sept 2026`, which matches both
 * the Arabic side (`5 أيلول 2026`) and every date on a Jordanian form. So the
 * English tag is chosen for its FORMATTING CONVENTIONS, not its country.
 *
 * `ar-JO` does have real data and resolves to itself, which is what gives the
 * Levantine month names (أيلول, تشرين الأول) rather than the Egyptian ones
 * (سبتمبر, أكتوبر) a bare `ar` would produce.
 *
 * Check `resolvedOptions().locale`, not `supportedLocalesOf`, before changing
 * either of these.
 */
const INTL_LOCALE: Record<AppLocale, string> = {
  en: `en-GB-u-nu-${NUMBERING_SYSTEM}`,
  ar: `ar-JO-u-nu-${NUMBERING_SYSTEM}`,
}

function resolve(locale: string): AppLocale {
  return locale.startsWith('ar') ? 'ar' : 'en'
}

export function intlLocale(locale: string): string {
  return INTL_LOCALE[resolve(locale)]
}

/* ── dates ───────────────────────────────────────────────────────────────────
   D-2: Gregorian, matching the plan's Gregorian quarters. Intl defaults to the
   Gregorian calendar for these locales; it is pinned anyway so a future locale
   change cannot quietly switch it to Umm al-Qura.                             */

const CAL = { calendar: 'gregory' } as const

/** Long form: "24 August 2026" / "٢٤ أغسطس ٢٠٢٦" -> "24 أغسطس 2026". */
export function formatDate(value: Date | number | string, locale: string): string {
  const d = typeof value === 'string' ? new Date(value) : new Date(value)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    ...CAL,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/** Compact form for tables: "11 Mar 2026". */
export function formatShortDate(value: Date | number | string, locale: string): string {
  const d = typeof value === 'string' ? new Date(value) : new Date(value)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    ...CAL,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * A date range: "12—14 Mar 2026", collapsing month and year when both ends
 * share them.
 *
 * `formatRange` is used rather than joining two formatted dates because it
 * knows how each locale abbreviates a range, including which side the dash
 * belongs on under RTL.
 */
export function formatDateRange(start: string, end: string, locale: string): string {
  const a = new Date(start)
  const b = new Date(end)
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
    ...CAL,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
  return fmt.formatRange(a, b)
}

/* ── numbers ─────────────────────────────────────────────────────────────── */

export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value)
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
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

/** Percentage. Pass 0.58 for 58%. */
export function formatPercent(value: number, locale: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/* ── the ICU escape hatch ────────────────────────────────────────────────── */

const ARABIC_INDIC_START = 0x0660

/**
 * Rewrite Arabic-Indic digits to Western.
 *
 * ICU MessageFormat renders `#` inside a plural using the locale i18next hands
 * it, which is bare `ar` — there is no way to pass a numbering system through
 * i18next-icu. So the digits are corrected on the way out instead.
 *
 * Only U+0660–U+0669 are touched. Arabic letters, punctuation and any digits a
 * user typed into a free-text field are left exactly as they are.
 *
 * A no-op when D-1 is set to 'arab'.
 */
export function toWesternDigits(text: string): string {
  if (NUMBERING_SYSTEM !== 'latn') return text
  return text.replace(/[٠-٩]/g, (d) =>
    String(d.charCodeAt(0) - ARABIC_INDIC_START),
  )
}
