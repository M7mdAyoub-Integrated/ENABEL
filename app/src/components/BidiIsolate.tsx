import type { ElementType, ReactNode } from 'react'

type BidiIsolateProps = {
  children: ReactNode
  /** Render as something other than <span> (e.g. 'td', 'div'). */
  as?: ElementType
  className?: string
}

/**
 * Wraps left-to-right data so it survives inside right-to-left text.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * National IDs, phone numbers, emails and URLs are LTR runs. Dropped into an
 * Arabic paragraph without isolation, the Unicode bidi algorithm reorders them
 * against the surrounding text: a nine-digit national ID renders with its
 * digits visually rearranged, and a phone number starting "07" can render with
 * the "07" at the wrong end. The data is stored correctly; it only *displays*
 * wrongly, which is why it survives review so often.
 *
 * `dir="ltr"` sets the run direction. `unicode-bidi: isolate` stops that run
 * from interacting with the neighbouring text at all. Both are needed --
 * `dir` alone still lets adjacent characters reorder across the boundary.
 *
 * Applies to display AND input. Any <input> holding a national ID, phone,
 * email or URL needs the same treatment.
 *
 * Build plan section 3: "the single most common Arabic-app bug".
 */
export function BidiIsolate({
  children,
  as: Component = 'span',
  className,
}: BidiIsolateProps) {
  return (
    <Component
      dir="ltr"
      style={{ unicodeBidi: 'isolate' }}
      {...(className ? { className } : {})}
    >
      {children}
    </Component>
  )
}

export default BidiIsolate

/** FIRST STRONG ISOLATE / POP DIRECTIONAL ISOLATE. */
const FSI = '\u2068'
const PDI = '\u2069'

/**
 * The same protection as `BidiIsolate`, for a value going *into* a translated
 * sentence rather than into JSX.
 *
 * `t('…{period}…')` returns a finished string, so there is no element left to
 * wrap: by the time the value reaches React it is ordinary text inside an
 * Arabic paragraph, and the bidi algorithm reorders it. Verified on the submit
 * panel — the reporting period `26/Q3` rendered as `Q3/26`, which is not a
 * period code, on the one screen where an enumerator is being told which
 * quarter their work lands in.
 *
 * FSI and PDI are the Unicode characters that do what `unicode-bidi: isolate`
 * does in CSS. They are invisible, they are safe in a left-to-right sentence
 * too, and they are the only mechanism available inside a plain string.
 *
 * Use it for identifiers and codes — period codes, indicator codes, national
 * IDs, phone numbers. Not for translated prose, which is already in the
 * paragraph's own direction.
 */
export function isolateLtr(value: string): string {
  return FSI + value + PDI
}
