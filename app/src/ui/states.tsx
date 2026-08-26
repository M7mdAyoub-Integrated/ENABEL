import { useTranslation } from 'react-i18next'
import { isAppError } from '../data/errors'
import { PrimaryButton, SecondaryButton } from './primitives'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Loading, error and offline states.
 *
 *  SKELETONS, NOT SPINNERS. A spinner says "something is happening"; a skeleton
 *  says "a table with six columns is coming, and it will land here". On the
 *  slow connections this is built for, the difference is whether the screen
 *  jumps when data arrives. Every skeleton below mirrors the real component's
 *  geometry so nothing reflows.
 *
 *  Skeletons are `aria-hidden` with a single polite live region announcing the
 *  load, so a screen reader hears "Loading records" once rather than reading
 *  out forty empty boxes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** One shimmering block. The only animated thing in this design. */
function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-track ${className}`} />
}

/** Skeleton for a list screen: control strip, head row, then rows. */
export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  const { t } = useTranslation('common')
  return (
    <>
      <p className="sr-only" role="status">
        {t('states.loading')}
      </p>
      <div aria-hidden="true">
        <div className="mt-5 flex border-[1.5px] border-ink">
          <Block className="m-[11px] h-[18px] flex-1" />
          <div className="w-[1.5px] bg-ink" />
          <Block className="m-[11px] h-[18px] w-[140px]" />
        </div>

        <div className="mt-[18px] hidden md:block">
          <div className="flex gap-[14px] border-b-[3px] border-ink pb-[7px]">
            {Array.from({ length: columns }, (_, i) => (
              <Block key={i} className="h-[11px] flex-1" />
            ))}
            <Block className="h-[11px] w-[172px]" />
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-[14px] border-b border-border-default py-3">
              {Array.from({ length: columns }, (_, c) => (
                <Block key={c} className={`h-[15px] flex-1 ${c === 0 ? 'opacity-100' : 'opacity-60'}`} />
              ))}
              <Block className="h-[26px] w-[172px] opacity-40" />
            </div>
          ))}
        </div>

        <div className="mt-[18px] flex flex-col gap-3 md:hidden">
          {Array.from({ length: 4 }, (_, r) => (
            <div key={r} className="border-[1.5px] border-ink p-4">
              <Block className="h-[18px] w-2/3" />
              <Block className="mt-2 h-[14px] w-1/2 opacity-60" />
              <Block className="mt-2 h-[14px] w-1/3 opacity-60" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/** Skeleton for the two-column detail grid. */
export function DetailSkeleton({ rows = 8 }: { rows?: number }) {
  const { t } = useTranslation('common')
  return (
    <>
      <p className="sr-only" role="status">
        {t('states.loading')}
      </p>
      <div aria-hidden="true" className="mt-[26px] grid grid-cols-1 gap-x-11 sm:grid-cols-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex justify-between gap-6 border-b border-border-default py-3">
            <Block className="h-[11px] basis-[42%]" />
            <Block className="h-[15px] w-1/3 opacity-60" />
          </div>
        ))}
      </div>
    </>
  )
}

/** Skeleton for a grid of cards (manual entries, portal registrations). */
export function CardsSkeleton({ count = 4, columns = 2 }: { count?: number; columns?: number }) {
  const { t } = useTranslation('common')
  return (
    <>
      <p className="sr-only" role="status">
        {t('states.loading')}
      </p>
      <div
        aria-hidden="true"
        className={`mt-[22px] grid grid-cols-1 gap-4 ${columns === 2 ? 'lg:grid-cols-2' : ''}`}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="border-[1.5px] border-ink px-5 pb-5 pt-[18px]">
            <div className="flex justify-between">
              <Block className="h-[19px] w-16" />
              <Block className="h-[11px] w-20 opacity-60" />
            </div>
            <Block className="mt-2 h-[16px] w-3/4" />
            <Block className="mt-4 h-11 w-full opacity-50" />
            <Block className="mt-[14px] h-[42px] w-full opacity-30" />
          </div>
        ))}
      </div>
    </>
  )
}

/** Skeleton for a form: section rule, then a field grid. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  const { t } = useTranslation('common')
  return (
    <>
      <p className="sr-only" role="status">
        {t('states.loading')}
      </p>
      <div aria-hidden="true" className="mt-[34px]">
        <div className="border-b-[3px] border-ink pb-2">
          <Block className="h-[15px] w-48" />
        </div>
        <div className="mt-5 grid grid-cols-12 gap-x-[18px] gap-y-[22px]">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className={i % 3 === 0 ? 'col-span-12' : 'col-span-12 sm:col-span-6'}>
              <Block className="h-[12px] w-32" />
              <Block className="mt-[7px] h-11 w-full opacity-60" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/**
 * A failed read, with a way to try again.
 *
 * An RLS refusal gets no retry button: pressing it would refuse identically,
 * and offering the button implies the failure was accidental. The brief is
 * explicit that a refusal is the answer, so the screen says so and stops.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation(['errors', 'common'])
  const app = isAppError(error) ? error : null
  const refused = app?.kind === 'forbidden' || app?.kind === 'unauthenticated'

  if (app?.detail) {
    // Keep the real cause reachable for a bug report without showing it.
    console.warn(`[data] ${app.code ?? '?'} ${app.detail}`)
  }

  return (
    <div
      role="alert"
      className="mt-[18px] border-[1.5px] border-dashed border-error bg-sunken px-[34px] py-12 text-center"
    >
      <p className="m-0 text-[26px] font-black uppercase tracking-[-0.03em] text-error">
        {t(refused ? 'errors:state.refusedTitle' : 'errors:state.failedTitle')}
      </p>
      <p
        className="mx-auto mb-[22px] mt-2.5 max-w-[430px] text-[15px] text-body"
        style={{ textWrap: 'pretty' }}
      >
        {app?.values ? t(app.messageKey, app.values) : t(app?.messageKey ?? 'errors:db.unknown')}
      </p>
      {onRetry && !refused ? (
        <PrimaryButton onClick={onRetry}>{t('common:actions.retry')}</PrimaryButton>
      ) : null}
      {app?.code ? (
        <p className="mt-4 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ghost">
          {t('errors:state.code', { code: app.code })}
        </p>
      ) : null}
    </div>
  )
}

/**
 * A write that failed, shown inline above the form's actions.
 *
 * Same solid red band the prototype uses for a validation failure, because to
 * the person filling the form these are the same event: it did not save.
 */
export function WriteError({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  const { t } = useTranslation(['errors', 'forms', 'common'])
  const app = isAppError(error) ? error : null
  if (!error) return null
  if (app?.detail) console.warn(`[data] ${app.code ?? '?'} ${app.detail}`)

  return (
    <div
      role="alert"
      className="mt-[18px] flex flex-wrap items-baseline gap-x-[14px] gap-y-2 bg-error px-[18px] py-[14px] text-bg"
    >
      <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
        {t('forms:notSaved')}
      </span>
      <span className="text-[15px] font-medium">
        {app?.values ? t(app.messageKey, app.values) : t(app?.messageKey ?? 'errors:db.unknown')}
      </span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ms-auto cursor-pointer font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] underline"
        >
          {t('common:actions.dismiss')}
        </button>
      ) : null}
    </div>
  )
}

/** Inline "this row has not reached the server yet" marker. */
export function PendingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap border-[1.5px] border-dashed border-amber px-[9px] py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-amber">
      <span className="h-2 w-2 flex-none animate-pulse bg-amber" aria-hidden="true" />
      {label}
    </span>
  )
}

/** Blocking overlay shown while a fresh record is on its way in. */
export function SavingOverlay({ label }: { label: string }) {
  return (
    <p role="status" className="mt-4 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
      <span className="me-2 inline-block h-2 w-2 animate-pulse bg-ink align-middle" aria-hidden="true" />
      {label}
    </p>
  )
}

export { SecondaryButton }
