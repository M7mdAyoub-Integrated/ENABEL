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
/** Back/previous. Named for the reading direction.
    Call sites that want it mirrored under RTL add the `mirror-rtl` class --
    NOT `scale-x-[-1]`, which is what this comment used to claim and which no
    call site ever did. `mirror-rtl` is defined explicitly in the stylesheet
    because Tailwind's `rtl:` variant generated no utility here. This comment
    describes the convention; it does not vouch for any particular call site
    following it. */
export const ARROW_START = '←' // ←
/** Leaving the municipal app for the public site. Mirrored under RTL by the
    same `mirror-rtl` convention, so it points away from the reading start. */
export const EXTERNAL = '↗' // ↗
/** The "pulled from another form" hook on a provenance tag. */
export const HOOK = '↳' // ↳
export const EMPTY = '—' // — shown where a value is absent
/** Remove / dismiss, on a filter chip. Not the letter x. */
export const CROSS = '×' // ×
/** Percent sign. Same in both locales.
    The Arabic percent sign U+066A is not used, because D-1 resolved to Western
    digits and U+066A belongs with Arabic-Indic ones -- see lib/format.ts. */
export const PERCENT = '%'
/** Range separator between two period codes, e.g. 26/Q3 - 27/Q1. */
export const RANGE = '–' // en dash

// ── Added for the Ramtha screens ────────────────────────────────────────────
// Same reasoning as everything above: punctuation, not content. A unit like
// "KB" is NOT here -- that is a word and it lives in the locale files.

/** Truncation / "still loading". Reads the same in both scripts. */
export const ELLIPSIS = '…' // …
/** The required-field marker beside a label. Not the letter x, not a bullet. */
export const REQUIRED = '*'
/** Label-to-value separator. U+003A is used in Arabic too; the Arabic comma
    U+060C is a COMMA and is not a substitute for it. */
export const COLON = ':'
/** Ordinal prefix on a delivery number, e.g. #3. */
export const HASH = '#'
/** At most / at least, in a threshold summary. Mathematical, not linguistic. */
export const LTE = '≤' // ≤
export const GTE = '≥' // ≥
/** Parentheses around a parenthetical. Listed so a call site does not reach
    for a bare literal and re-open the hole the rule exists to close. */
export const PAREN_OPEN = '('
export const PAREN_CLOSE = ')'
