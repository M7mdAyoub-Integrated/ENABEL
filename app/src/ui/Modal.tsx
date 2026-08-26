import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DangerButton, SecondaryButton } from './primitives'

/**
 * Modal.
 *
 * Section 2: full-screen sheet that slides up under 768, centred dialog at 768+.
 * The sheet variant is the same DOM with different classes rather than a second
 * component, so behaviour (focus trap, Escape, scroll lock) cannot drift apart
 * between the two.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  note,
  confirmLabel,
  cancelLabel,
  onConfirm,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  /** The consequence line, printed in red behind a 4px red rule. */
  note?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  children?: ReactNode
}) {
  const { t } = useTranslation('common')
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLElement>('button')?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6"
      style={{ background: 'rgba(17,17,16,0.55)', animation: 'fin 0.1s ease-out' }}
    >
      <button
        type="button"
        aria-label={t('actions.dismiss')}
        onClick={onClose}
        className="absolute inset-0"
      />
      {/* 2px frame, black title bar, square. The prototype's dialog. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90vh] w-full flex-col overflow-auto border-2 border-ink bg-bg md:max-w-[470px]"
      >
        <h2 className="bg-ink px-[22px] py-[14px] text-[22px] font-black uppercase tracking-[-0.03em] text-bg">
          {title}
        </h2>
        <div
          className="p-[22px]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.375rem)' }}
        >
          {description ? (
            <p className="m-0 text-[16px] leading-[1.5] text-ink">{description}</p>
          ) : null}
          {note ? (
            <p className="mt-[14px] border-s-4 border-error ps-[13px] text-[14.5px] text-error">
              {note}
            </p>
          ) : null}
          {children}
          <div className="mt-[22px] flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <SecondaryButton onClick={onClose}>
              {cancelLabel ?? t('actions.cancel')}
            </SecondaryButton>
            {onConfirm ? (
              <DangerButton onClick={onConfirm}>
                {confirmLabel ?? t('actions.confirm')}
              </DangerButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
