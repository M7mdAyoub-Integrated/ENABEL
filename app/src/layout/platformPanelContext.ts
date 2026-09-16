import { createContext, useContext } from 'react'

/**
 * The two things the platform administers, as opposed to a programme:
 * staff accounts (super admin only) and the settings every role has.
 * Everything a municipality's own admin sees is a form, a dashboard or a
 * record; neither of these is, which is why they open in a panel over the
 * municipality's product rather than sitting in its sidebar.
 */
export type PanelSection = 'accounts' | 'settings'

export type PlatformPanelState = {
  /** The section open, or null when the panel is closed. */
  open: PanelSection | null
  openPanel: (section: PanelSection) => void
  closePanel: () => void
}

export const PlatformPanelContext = createContext<PlatformPanelState | null>(null)

export function usePlatformPanel(): PlatformPanelState {
  const ctx = useContext(PlatformPanelContext)
  if (!ctx) throw new Error('usePlatformPanel must be used inside <Shell>')
  return ctx
}
