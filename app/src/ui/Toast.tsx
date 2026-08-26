import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * `tone` drives the tag colour: green for a save, salmon for a deletion. It is
 * a semantic flag on purpose -- the prototype compares the tag text to the
 * literal "Deleted", which silently stops working the moment the tag is
 * translated.
 */
export type Toast = {
  id: number
  tag: string
  title: string
  sub?: string
  tone?: 'ok' | 'destructive'
}

type ToastApi = { fire: (t: Omit<Toast, 'id'>) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/**
 * Toast host.
 *
 * Section 2: bottom, full width minus margin on phones; top-end on tablet and
 * up. `end-` rather than `right-` so it sits top-left under RTL, which is the
 * corner an Arabic reader's eye returns to.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef<number[]>([])

  const fire = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++
    setToasts((cur) => [...cur, { ...t, id }])
    const handle = window.setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id))
    }, 3600)
    timers.current.push(handle)
  }, [])

  useEffect(() => {
    const handles = timers.current
    return () => handles.forEach((h) => window.clearTimeout(h))
  }, [])

  const api = useMemo(() => ({ fire }), [fire])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* The prototype pins ONE bar to the bottom-centre, rising into place.
          Kept centred rather than moved to a corner, because it is a
          confirmation of the action just taken and belongs near the control.
          Stacked rather than replaced, so two quick saves both get read out. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-px"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3.5rem)' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-wrap items-baseline gap-x-4 gap-y-1 bg-invert-bg px-6 py-4 text-invert-ink"
            style={{ animation: 'rise 0.18s ease-out' }}
          >
            <span
              className={`font-narrow text-[11.5px] font-bold uppercase tracking-[0.16em] ${
                t.tone === 'destructive' ? 'text-invert-alarm' : 'text-invert-ok'
              }`}
            >
              {t.tag}
            </span>
            <span className="text-[16px] font-bold tracking-[-0.015em]">{t.title}</span>
            {t.sub ? (
              <span className="font-narrow text-[12px] font-semibold uppercase tracking-[0.08em] text-dim">
                {t.sub}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
