import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from './Dialog'
import { DangerButton, SecondaryButton } from './primitives'

/**
 * The confirmation dialog: a black title bar, a sentence, the consequence in
 * red behind a 4px rule, cancel and confirm.
 *
 * Section 2: full-screen sheet that slides up under 768, centred dialog at
 * 768+. The sheet is the same DOM with different classes rather than a second
 * component, so behaviour (focus trap, Escape, scroll lock) cannot drift
 * apart between the two — and since 16 September 2026 the behaviour itself is
 * `Dialog`'s, shared with the platform dialog, so it cannot drift between
 * THOSE two either. This file is the content and nothing else.
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
  const titleId = useId()

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2
        id={titleId}
        className="flex-none bg-ink px-[22px] py-[14px] text-[22px] font-black uppercase tracking-[-0.03em] text-bg"
      >
        {title}
      </h2>
      <div
        className="min-h-0 flex-1 overflow-y-auto p-[22px]"
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
          <SecondaryButton onClick={onClose}>{cancelLabel ?? t('actions.cancel')}</SecondaryButton>
          {onConfirm ? (
            <DangerButton onClick={onConfirm}>{confirmLabel ?? t('actions.confirm')}</DangerButton>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
