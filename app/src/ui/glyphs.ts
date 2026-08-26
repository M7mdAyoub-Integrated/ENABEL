/**
 * Non-translatable display glyphs.
 *
 * These are punctuation, not content -- a middot separator reads the same in
 * English and Arabic, so putting it in a locale file would be noise. They live
 * here rather than inline because `react/jsx-no-literals` (correctly) refuses
 * literal text in JSX, and the rule should not be weakened just to render a dot.
 */
export const SEP = '·' // ·
export const EMDASH = '—' // —
export const ARROW_END = '→' // →
/** Back/previous. Named for the reading direction, and mirrored under RTL by
    the `scale-x-[-1]` on the span that renders it. */
export const ARROW_START = '←' // ←
/** The "pulled from another form" hook on a provenance tag. */
export const HOOK = '↳' // ↳
export const EMPTY = '—' // — shown where a value is absent
/** Remove / dismiss, on a filter chip. Not the letter x. */
export const CROSS = '×' // ×
/** Percent sign. Same in both locales; Arabic-Indic percent is not used here
    because the figures themselves render in Western digits (see format.ts). */
export const PERCENT = '%'
/** Range separator between two period codes, e.g. 26/Q3 - 27/Q1. */
export const RANGE = '–' // en dash
