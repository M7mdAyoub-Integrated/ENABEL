import { useTranslation } from 'react-i18next'
import { useOnline, usePendingWrites, useQueueActions } from '../data/useOffline'

/**
 * The offline / pending strip.
 *
 * Pinned under the header so it is impossible to miss and impossible to lose:
 * an enumerator who has just finished an interview needs to know, without
 * looking for it, whether the answers are on the server or still on the phone.
 *
 * It shows in three situations:
 *   • offline with nothing queued  — plain notice
 *   • anything queued              — the count, and a way to push now
 *   • anything permanently refused — red, because that one needs a person
 *
 * When online with an empty queue it renders nothing at all.
 */
export function OfflineBar() {
  const { t } = useTranslation('common')
  const online = useOnline()
  const pending = usePendingWrites()
  const { retry } = useQueueActions()

  const failed = pending.filter((p) => p.failed)
  const waiting = pending.filter((p) => !p.failed)

  if (online && pending.length === 0) return null

  const tone = failed.length > 0 ? 'bg-error text-bg' : online ? 'bg-amber text-bg' : 'bg-ink text-bg'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-[34px] ${tone}`}
    >
      {!online ? (
        <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
          {t('states.offline')}
        </span>
      ) : null}

      {waiting.length > 0 ? (
        <span className="text-[14px] font-semibold">
          {t('states.pendingCount', { count: waiting.length })}
        </span>
      ) : null}

      {failed.length > 0 ? (
        <span className="text-[14px] font-semibold">
          {t('states.failedCount', { count: failed.length })}
        </span>
      ) : null}

      {online && waiting.length > 0 ? (
        <button
          type="button"
          onClick={() => void retry()}
          className="ms-auto cursor-pointer border-[1.5px] border-bg px-3 py-1 font-narrow text-[11px] font-bold uppercase tracking-[0.12em]"
        >
          {t('states.syncNow')}
        </button>
      ) : null}
    </div>
  )
}

export default OfflineBar
