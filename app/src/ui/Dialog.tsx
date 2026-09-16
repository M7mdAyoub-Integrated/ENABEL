import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The dialog primitive: everything a modal does that is not its content.
 *
 * Until 16 September 2026 these mechanics lived inline in `Modal`, the
 * delete confirmation, and the platform panel copied them by hand with its
 * own Escape rule. Two copies of a focus trap drift; this is the one. `Modal`
 * (the confirmation: title bar, note, cancel/confirm) and `PlatformDialog`
 * (header, tabs, a scrolling body) are both built on it and add nothing
 * below this line.
 *
 *   - an overlay that closes it, and a centred panel over it from 768px;
 *     below 768px the panel is a sheet against the bottom edge, full width,
 *     and for `size="wide"` full height too, so its header does not move
 *     when the content under it changes length;
 *   - the panel is sized to its content and capped at the viewport
 *     (`max-h-full` inside a padded `inset-0` box), so whatever scrolls,
 *     scrolls inside it — the consumer marks its scrolling region
 *     `min-h-0 flex-1 overflow-y-auto`;
 *   - Escape closes it, Tab stays inside it, the page behind stops
 *     scrolling, and focus goes back where it was when it closed;
 *   - dialogs nest. A confirmation opened from inside the platform dialog
 *     goes on top of a module-level stack, and Escape and Tab act on the
 *     TOP dialog only, so one key never closes both. The panel used to
 *     decide this with a DOM query for an inner `[role="dialog"]`; the
 *     stack is the same fact kept where both sides can read it.
 *
 * `onClose` is read through a ref so a consumer whose close handler changes
 * identity on every render — one that writes the URL, say — does not re-run
 * the effect, which would re-lock scroll and move focus to the first control
 * while somebody is typing in the third.
 */

/** The dialogs open right now, innermost last. */
const stack: symbol[] = []
/** How many dialogs hold the body's scroll, and what it was before the first. */
let locks = 0
let savedOverflow = ''

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open,
  onClose,
  size = 'confirm',
  labelledBy,
  label,
  initialFocusRef,
  children,
}: {
  open: boolean
  onClose: () => void
  /** `confirm`: 470px, a bottom sheet sized to its content on a phone.
      `wide`: 900px, a full-screen sheet on a phone. */
  size?: 'confirm' | 'wide'
  /** The id of the element that names the dialog, or a plain label. One of the two. */
  labelledBy?: string
  label?: string
  /** Where focus lands on open. Default: the first focusable control inside. */
  initialFocusRef?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const { t } = useTranslation('common')
  const panelRef = useRef<HTMLDivElement>(null)
  const me = useRef<symbol | null>(null)
  if (me.current === null) me.current = Symbol('dialog')

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const id = me.current!
    stack.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (locks++ === 0) {
      savedOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    const onKey = (e: KeyboardEvent) => {
      // Not the top dialog: a dialog opened over this one owns the keyboard.
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const first = list[0]!
      const last = list[list.length - 1]!
      const active = document.activeElement
      const inside = panelRef.current?.contains(active) ?? false
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    ;(initialFocusRef?.current ?? focusables()[0])?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)
      if (--locks === 0) document.body.style.overflow = savedOverflow
      // The opener may have gone with the dialog (a menu item, a row that
      // was removed); focusing a detached node does nothing useful.
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [open, initialFocusRef])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6"
      style={{ background: 'rgba(17,17,16,0.55)', animation: 'fin 0.1s ease-out' }}
    >
      <button
        type="button"
        aria-label={t('actions.dismiss')}
        onClick={() => onCloseRef.current()}
        className="absolute inset-0 cursor-default"
      />
      {/* 2px frame, square. The prototype's dialog. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        className={`relative flex max-h-full w-full flex-col border-2 border-ink bg-bg ${
          size === 'wide' ? 'h-full md:h-auto md:max-w-[900px]' : 'md:max-w-[470px]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
