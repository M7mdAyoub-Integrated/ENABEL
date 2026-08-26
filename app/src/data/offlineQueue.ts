/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The offline write queue.
 *
 *  An enumerator does follow-up interviews in villages with no signal. They
 *  must be able to finish a 43-question survey, put the phone away, and have it
 *  arrive when they next get a bar of reception. Losing an answer is the worst
 *  thing this application can do, so:
 *
 *   • Every queued write is persisted to IndexedDB before the UI says "queued".
 *     An in-memory queue dies with the tab and takes the interview with it.
 *
 *   • Every queued write carries a `client_uuid`, generated on the device. That
 *     column is UNIQUE on every field-created table, so a re-sync of a write
 *     that actually landed the first time collides and is discarded rather than
 *     inserting a second row. This is the whole reason the column exists
 *     (CLAUDE.md, "Anything a field officer creates on a phone").
 *
 *   • A write is removed from the queue only after the server confirms it, or
 *     after the server refuses it for a reason that will never change (RLS,
 *     duplicate, invalid). A transient failure leaves it queued.
 *
 *  IndexedDB rather than localStorage: localStorage is synchronous, capped
 *  around 5MB, and section 6 of the build plan bans it for anything but
 *  Supabase's own session. A 43-question survey is not small.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME = 'shm-offline'
const DB_VERSION = 1
const STORE = 'writes'

/** One pending write. `payload` is whatever the executor needs to replay it. */
export type QueuedWrite = {
  /** Also the row's `client_uuid`, so the queue id and the row id are one. */
  clientUuid: string
  /** Which executor replays this. */
  kind: string
  /** Human label for the pending list, already translated at enqueue time. */
  label: string
  payload: unknown
  queuedAt: number
  attempts: number
  /** Set when the server refused it permanently; needs a person to look. */
  failed?: { messageKey: string; code?: string }
}

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientUuid' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/* ── listeners ───────────────────────────────────────────────────────────── */

type Listener = () => void
const listeners = new Set<Listener>()
let cache: QueuedWrite[] = []

function emit() {
  for (const l of listeners) l()
}

export function subscribeQueue(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Synchronous snapshot for useSyncExternalStore. */
export function queueSnapshot(): QueuedWrite[] {
  return cache
}

async function refresh() {
  cache = await tx<QueuedWrite[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedWrite[]>)
  cache.sort((a, b) => a.queuedAt - b.queuedAt)
  emit()
}

/* ── executors ───────────────────────────────────────────────────────────── */

/**
 * Replays one queued write against the server.
 *
 * Returns nothing on success. Throws an AppError on failure; the runner decides
 * from `kind` whether to keep the item or drop it.
 */
export type Executor = (payload: unknown) => Promise<void>

const executors = new Map<string, Executor>()

/** Registered by each module's data file so this file stays module-agnostic. */
export function registerExecutor(kind: string, fn: Executor) {
  executors.set(kind, fn)
}

/* ── public API ──────────────────────────────────────────────────────────── */

export function newClientUuid(): string {
  return crypto.randomUUID()
}

/** Persist a write for later. Resolves once it is durably on disk. */
export async function enqueue(item: Omit<QueuedWrite, 'queuedAt' | 'attempts'>): Promise<void> {
  const row: QueuedWrite = { ...item, queuedAt: Date.now(), attempts: 0 }
  await tx('readwrite', (s) => s.put(row))
  await refresh()
}

export async function dequeue(clientUuid: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(clientUuid))
  await refresh()
}

/** Drop a permanently-failed item once a person has seen and accepted it. */
export async function discardFailed(clientUuid: string): Promise<void> {
  await dequeue(clientUuid)
}

export async function loadQueue(): Promise<QueuedWrite[]> {
  await refresh()
  return cache
}

let running = false

/**
 * Try to send everything queued, oldest first.
 *
 * Order matters: a follow-up survey queued after the person record it points at
 * must not be sent first. Oldest-first preserves the order the officer worked
 * in, which is the order the dependencies were created in.
 */
export async function flushQueue(): Promise<{ sent: number; kept: number; failed: number }> {
  if (running || !navigator.onLine) return { sent: 0, kept: 0, failed: 0 }
  running = true
  let sent = 0
  let kept = 0
  let failed = 0

  try {
    const items = await loadQueue()
    for (const item of items) {
      if (item.failed) {
        failed += 1
        continue
      }
      const exec = executors.get(item.kind)
      if (!exec) {
        // No executor registered — the module that owns it is not loaded yet.
        kept += 1
        continue
      }
      try {
        await exec(item.payload)
        await dequeue(item.clientUuid)
        sent += 1
      } catch (e) {
        const err = e as { kind?: string; messageKey?: string; code?: string }

        // A duplicate means this exact write already landed — the client_uuid
        // collided. That is the queue working as designed, not a failure.
        if (err.kind === 'duplicate') {
          await dequeue(item.clientUuid)
          sent += 1
          continue
        }

        if (err.kind === 'forbidden' || err.kind === 'invalid' || err.kind === 'missing_reference') {
          // Will never succeed on a retry. Keep it, flagged, so the officer is
          // told rather than the answer disappearing.
          await tx('readwrite', (s) =>
            s.put({
              ...item,
              attempts: item.attempts + 1,
              failed: {
                messageKey: err.messageKey ?? 'errors:db.unknown',
                ...(err.code ? { code: err.code } : {}),
              },
            }),
          )
          failed += 1
          continue
        }

        // Transient: still offline, or the server hiccuped. Leave it alone.
        await tx('readwrite', (s) => s.put({ ...item, attempts: item.attempts + 1 }))
        kept += 1
      }
    }
    await refresh()
  } finally {
    running = false
  }
  return { sent, kept, failed }
}

/**
 * Start listening for reconnection.
 *
 * Called once from App. Also flushes on load, because the tab may have been
 * closed while offline and reopened on a good connection.
 */
export function startQueueSync(onFlushed?: (r: { sent: number; failed: number }) => void) {
  const run = () => {
    void flushQueue().then((r) => {
      if ((r.sent > 0 || r.failed > 0) && onFlushed) onFlushed(r)
    })
  }
  window.addEventListener('online', run)
  void loadQueue().then(run)
  return () => window.removeEventListener('online', run)
}
