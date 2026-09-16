import { createContext, useContext } from 'react'

/**
 * The two things the platform administers, as opposed to a programme:
 * staff accounts (super admin only) and the settings every role has.
 * Everything a municipality's own admin sees is a form, a dashboard or a
 * record; neither of these is, which is why they open in a dialog over the
 * municipality's product rather than sitting in its sidebar.
 */
export type DialogSection = 'accounts' | 'settings'

export type PlatformDialogState = {
  /** The section open, or null when the dialog is closed. */
  open: DialogSection | null
  openDialog: (section: DialogSection) => void
  closeDialog: () => void
}

export const PlatformDialogContext = createContext<PlatformDialogState | null>(null)

export function usePlatformDialog(): PlatformDialogState {
  const ctx = useContext(PlatformDialogContext)
  if (!ctx) throw new Error('usePlatformDialog must be used inside <Shell>')
  return ctx
}

/* ── the dialog's address ────────────────────────────────────────────────── */

/**
 * The dialog is open when the URL says so: `?platform=accounts` or
 * `?platform=settings` on whatever municipal route is underneath. In the URL
 * rather than in React state because the accounts tab's filters are in the
 * URL too, so a view can be shared and a refresh does not lose it — and a
 * filter that survives a refresh while the dialog holding it does not would
 * leave `?role=coordinator` orphaned on a dashboard. `/accounts` and
 * `/settings` as addresses redirect to the role's home with this parameter
 * set (PlatformRoute).
 */
export const PLATFORM_PARAM = 'platform'

/**
 * The accounts tab's filter parameters. Listed here, not in Accounts.tsx,
 * because closing the dialog and leaving the accounts tab both strip them:
 * the URL describes what is on screen, and a filter on a tab that is not
 * showing describes nothing.
 */
export const ACCOUNT_FILTER_PARAMS = ['q', 'muni', 'role', 'status'] as const

export function sectionFromParams(params: URLSearchParams): DialogSection | null {
  const v = params.get(PLATFORM_PARAM)
  return v === 'accounts' || v === 'settings' ? v : null
}

/** The same URL with the dialog open at `section`. */
export function withDialogSection(params: URLSearchParams, section: DialogSection): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set(PLATFORM_PARAM, section)
  if (section !== 'accounts') for (const k of ACCOUNT_FILTER_PARAMS) next.delete(k)
  return next
}

/** The same URL with the dialog closed and nothing of it left behind. */
export function withoutDialog(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(PLATFORM_PARAM)
  for (const k of ACCOUNT_FILTER_PARAMS) next.delete(k)
  return next
}
