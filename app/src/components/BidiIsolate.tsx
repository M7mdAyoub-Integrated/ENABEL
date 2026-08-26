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
