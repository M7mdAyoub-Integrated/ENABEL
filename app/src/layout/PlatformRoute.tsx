import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { homeRouteFor } from '../auth/permissions'
import { usePlatformPanel, type PanelSection } from './platformPanelContext'

/**
 * `/accounts` and `/settings` as addresses.
 *
 * Neither is a page any more — the platform's administration opens in a
 * panel over the municipality's product (layout/PlatformPanel.tsx) — but a
 * bookmark or a typed address still has to arrive somewhere. This opens the
 * panel at the section the address names and lands on the role's home
 * underneath it: the dashboard for a municipal account or a super admin
 * acting on a municipality, the chooser for a super admin who has not.
 *
 * The panel's state lives in Shell, above the routed screen, so it survives
 * the redirect.
 */
export function PlatformRoute({ section }: { section: PanelSection }) {
  const { openPanel } = usePlatformPanel()
  const { role } = useAuth()
  useEffect(() => {
    openPanel(section)
  }, [openPanel, section])
  return <Navigate to={homeRouteFor(role)} replace />
}
