import Dashboard from '../routes/Dashboard'
import { RmthDashboard } from './RmthDashboard'
import { useAuth } from '../auth/AuthProvider'
import { useMunicipalities } from '../data/municipalities'

/**
 * `/dashboard` is one URL for every account; which programme's dashboard it
 * shows is decided by the acting municipality (0117), never by the URL --
 * the same rule as the sidebar (Shell.tsx) and RequireRamtha.
 *
 * The Sahel Horan `Dashboard` is rendered exactly as before for every account
 * that is not Ramtha's, including an account with no municipality at all,
 * which is what `/dashboard` did before this switch existed. The one thing
 * that changes for anyone is a blank frame while the municipality list is
 * still loading on a cold start (the list is cached for an hour and the
 * Shell asks for it too, so that is one round trip, once): rendering the
 * Sahel Horan screen meanwhile would fire its twenty queries under a Ramtha
 * account and paint eighteen rows it has no names for.
 */
export function DashboardSwitch() {
  const { municipalityId } = useAuth()
  const municipalities = useMunicipalities()
  if (municipalityId && municipalities.isPending) return null
  const code = municipalities.data?.find((m) => m.id === municipalityId)?.code
  return code === 'RMTH' ? <RmthDashboard /> : <Dashboard />
}

export default DashboardSwitch
