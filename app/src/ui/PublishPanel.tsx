import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Chip, PrimaryButton, SecondaryButton } from './primitives'

/**
 * Whether a record is on the public page, and the switch -- the same panel,
 * in the same place, on every screen that publishes (the owner, 29 September
 * 2026: "where the publish button is and how it is shown ... one layout").
 *
 * It sits directly under the page head, before anything else on the record.
 * The heading and the status chip on the start side, the button on the end:
 * a filled "Publish" while the record is off the page, an outlined
 * "Unpublish" while it is on. `blocked` replaces the button with the reason
 * it cannot be used (ended, cancelled, details missing) and, when given, the
 * way to fix it. `children` is anything the screen must say before the
 * switch is used (what becomes public).
 */
export function PublishPanel({
  published,
  onToggle,
  pending,
  canToggle = true,
  body,
  blocked,
  error,
  children,
}: {
  published: boolean
  onToggle: () => void
  pending?: boolean | undefined
  /** False for a role that may read but not publish: the state shows, the button does not. */
  canToggle?: boolean | undefined
  body?: ReactNode
  blocked?: ReactNode
  error?: ReactNode
  children?: ReactNode
}) {
  const { t } = useTranslation('common')
  return (
    <section
      aria-label={t('publish.heading')}
      className={`mt-5 border-[1.5px] p-4 ${published ? 'border-success bg-bg' : 'border-ink bg-sunken'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">{t('publish.heading')}</h2>
          <div className="mt-1.5">
            <Chip tone={published ? 'ok' : 'mute'}>{published ? t('publish.on') : t('publish.off')}</Chip>
          </div>
        </div>
        {canToggle && !blocked ? (
          published ? (
            <SecondaryButton disabled={!!pending} onClick={onToggle}>{t('publish.unpublish')}</SecondaryButton>
          ) : (
            <PrimaryButton disabled={!!pending} onClick={onToggle}>{t('publish.publish')}</PrimaryButton>
          )
        ) : null}
      </div>
      {body ? <div className="mt-2 max-w-[64ch] text-[14px] leading-[1.5] text-body" style={{ textWrap: 'pretty' }}>{body}</div> : null}
      {blocked ? <div className="mt-3 border-s-[3px] border-amber bg-attention-bg px-3 py-2 text-[14px] text-attention-ink">{blocked}</div> : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {error ? <div className="mt-3">{error}</div> : null}
    </section>
  )
}

export default PublishPanel
