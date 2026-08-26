import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { homeRouteFor } from '../auth/permissions'
import { AuthShell } from './auth/AuthShell'
import { useTranslation } from 'react-i18next'

/**
 * The root path.
 *
 * Phase 2 had a role chooser here because there was no auth. There is now: the
 * role comes from `app_user`, so this only routes. An unauthenticated visitor
 * goes to sign-in; a signed-in one goes to the home their role implies.
 */
export function Landing() {
  const { status, role, roleResolved } = useAuth()
  const { t } = useTranslation('auth')

  if (status === 'loading' || (status === 'signedIn' && !roleResolved)) {
    return (
      <AuthShell title={t('checking')}>
        <p role="status" className="text-sm text-muted">
          {t('checkingBody')}
        </p>
      </AuthShell>
    )
  }
  if (status === 'signedOut') return <Navigate to="/signin" replace />
  return <Navigate to={homeRouteFor(role)} replace />
}

export default Landing
