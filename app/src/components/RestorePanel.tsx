import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useRestore,
  useRestoreImpact,
  type RestoreCandidate,
} from '../data/restore'
import { BidiIsolate } from './BidiIsolate'
import { formatDate } from '../lib/format'
import { WriteError } from '../ui/states'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  "This national ID belongs to a deleted record. Restore it?"
 *
 *  Shown instead of a bare constraint error when a save is refused on a key
 *  that belongs to a SOFT-DELETED person or partner. See src/data/restore.ts
 *  for why the constraint is right and the error alone was not.
 *
 *  ── WHAT IT REFUSES TO DO ──
 *
 *  It does not restore on click. It shows WHO is being brought back, WHEN they
 *  were deleted and BY WHOM, then the indicators and reporting periods that
 *  will move — computed by 0107 from that record's own dates, not described in
 *  prose and not computed here.
 *
 *  The periods are the point. A restore performed today can change A1.3 for a
 *  quarter eighteen months ago, because every person-counting view dates
 *  someone on their FIRST qualifying record. A coordinator who has already sent
 *  that quarter to the donor needs to see the quarter, not just the indicator.
 *
 *  ── AND WHAT IT SAYS WHEN NOTHING MOVES ──
 *
 *  Restoring somebody whose child records were themselves deleted moves no
 *  figure at all, and the impact query comes back empty. That is a real and
 *  common answer, not a failure to load, so it gets its own sentence rather
 *  than an empty list — otherwise the most reassuring case looks like the
 *  broken one.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function RestorePanel({
  kind,
  candidate,
  onRestored,
  onDismiss,
}: {
  kind: 'person' | 'partner'
  candidate: RestoreCandidate
  onRestored: (id: string) => void
  onDismiss: () => void
}) {
  const { t, i18n } = useTranslation(['forms', 'common', 'indicators'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const impact = useRestoreImpact(kind, candidate.id)
  const restore = useRestore(kind)
  const [confirmed, setConfirmed] = useState(false)

  const rows = impact.data ?? []
  const label = kind === 'person' ? candidate.full_name : (candidate.name ?? '')
  const key = kind === 'person' ? candidate.national_id : candidate.unit

  return (
    <section
      role="alert"
      className="mt-[18px] border-[1.5px] border-amber bg-attention-bg p-4 sm:p-5"
    >
      <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-amber">
        {t(`forms:restore.title.${kind}`)}
      </h2>

      {/* Who. Named, so the coordinator can tell this is the person they mean
          before anything happens -- the same reason the apply form echoes a
          matched name back before writing. */}
      <p className="mt-2 text-[17px] font-bold text-ink" dir="auto">
        {label}
        {key ? (
          <BidiIsolate className="ms-2 font-narrow text-[13px] font-semibold tracking-wide text-muted">
            {key}
          </BidiIsolate>
        ) : null}
      </p>
      <p className="mt-1 max-w-[70ch] text-[14px] leading-[1.5] text-body">
        {candidate.deleted_by
          ? t('forms:restore.deletedByOn', {
              who: candidate.deleted_by,
              date: formatDate(new Date(candidate.deleted_at), locale),
            })
          : t('forms:restore.deletedOn', {
              date: formatDate(new Date(candidate.deleted_at), locale),
            })}
      </p>
      <p className="mt-2 max-w-[70ch] text-[14px] leading-[1.5] text-body">
        {t(`forms:restore.body.${kind}`)}
      </p>

      {/* What it moves. */}
      <div className="mt-4 border-t border-border-default pt-3">
        <h3 className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t('forms:restore.willMove')}
        </h3>
        {impact.isLoading ? (
          <div aria-hidden="true" className="mt-2 h-12 animate-pulse bg-track" />
        ) : impact.isError ? (
          <p className="mt-2 text-[14px] font-semibold text-error">
            {t('forms:restore.impactFailed')}
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-2 max-w-[70ch] text-[14px] leading-[1.5] text-body">
            {t('forms:restore.movesNothing')}
          </p>
        ) : (
          <ul className="mt-2 flex list-none flex-col gap-1 p-0">
            {rows.map((r) => (
              <li
                key={`${r.code}-${r.period_code}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-default py-2"
              >
                <span className="inline-block bg-ink px-2 py-[2px] font-narrow text-[11px] font-bold tracking-[0.08em] text-bg">
                  {r.code}
                </span>
                <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
                  {r.period_code}
                </span>
                <span className="text-[14px] text-body">
                  {/* A percentage has no delta. Saying "+1" for a ratio whose
                      numerator AND denominator both change would be a lie, so
                      it says the figure is recalculated instead. */}
                  {r.recomputed
                    ? t('forms:restore.recomputed')
                    : t('forms:restore.delta', { count: r.delta ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {restore.error ? <WriteError error={restore.error} onDismiss={() => restore.reset()} /> : null}

      {/* Explicit confirmation, not just a button. Restoring is not undoable
          through this screen, and it can change a quarter that has been
          reported. */}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 flex-none accent-[var(--ink,#000)]"
        />
        <span className="text-[14px] leading-[1.5] text-body">
          {t(`forms:restore.confirm.${kind}`)}
        </span>
      </label>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={!confirmed || restore.isPending || impact.isLoading}
          onClick={() =>
            restore.mutate(candidate.id, { onSuccess: () => onRestored(candidate.id) })
          }
          className="inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-bg disabled:bg-track disabled:text-faint"
        >
          {t(`forms:restore.action.${kind}`)}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-11 items-center border-[1.5px] border-border-strong px-5 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink"
        >
          {t('common:actions.cancel')}
        </button>
      </div>

      <p className="mt-3 max-w-[70ch] text-[13px] leading-[1.5] text-muted">
        {t('forms:restore.coordinatorOnly')}
      </p>
    </section>
  )
}
