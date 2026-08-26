import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  discardFailed,
  flushQueue,
  queueSnapshot,
  startQueueSync,
  subscribeQueue,
  type QueuedWrite,
} from './offlineQueue'

/** Live online/offline flag. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

/** The pending queue, live. */
export function usePendingWrites(): QueuedWrite[] {
  return useSyncExternalStore(subscribeQueue, queueSnapshot, () => [])
}

/**
 * Mounted once, at the root.
 *
 * Starts the reconnect listener and invalidates every query after a successful
 * flush, so the screens show server truth rather than the optimistic rows the
 * queue was holding.
 */
export function useQueueSync() {
  const qc = useQueryClient()
  useEffect(
    () =>
      startQueueSync((r) => {
        if (r.sent > 0) void qc.invalidateQueries()
      }),
    [qc],
  )
}

export function useQueueActions() {
  const qc = useQueryClient()
  const retry = useCallback(async () => {
    const r = await flushQueue()
    if (r.sent > 0) void qc.invalidateQueries()
    return r
  }, [qc])
  return { retry, discard: discardFailed }
}
