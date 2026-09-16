import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { homeRouteFor } from '../auth/permissions'
import { withDialogSection, type DialogSection } from './platformDialogContext'

/**
 * `/accounts` and `/settings` as addresses.
 *
 * Neither is a page — the platform's administration opens in a dialog over
 * the municipality's product (layout/PlatformDialog.tsx) — but a bookmark or
 * a typed address still has to arrive somewhere. This lands on the role's
 * home — the dashboard for a municipal account or a super admin acting on a
 * municipality, the chooser for a super admin who has not — with
 * `?platform=<section>` set, which is what opens the dialog, and carries
 * any filter parameters the address brought with it, so
 * `/accounts?role=coordinator` opens the accounts tab already filtered.
 *
 * One navigation, not an effect plus a redirect: two navigations in one
 * commit race, and the one that ran last would win.
 */
export function PlatformRoute({ section }: { section: DialogSection }) {
  const { role } = useAuth()
  const location = useLocation()
  const search = withDialogSection(new URLSearchParams(location.search), section).toString()
  return <Navigate to={{ pathname: homeRouteFor(role), search: `?${search}` }} replace />
}
