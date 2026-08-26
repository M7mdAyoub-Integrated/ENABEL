import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthProvider'
import {
  can,
  canAccessModule,
  homeRouteFor,
  type Capability,
} from './permissions'
import { isModuleId } from '../modules'
import { AuthShell } from '../routes/auth/AuthShell'
import { AUTH_BYPASS } from '../dev/authBypass'
import { PrimaryButton, SecondaryButton } from '../ui/primitives'
import { Link } from 'react-router-dom'

/** Shown while the session and role are still resolving. */
function Resolving() {
  const { t } = useTranslation('auth')
  return (
    <AuthShell title={t('checking')}>
      <p role="status" className="text-sm text-muted">
        {t('checkingBody')}
      </p>
    </AuthShell>
  )
}

/**
 * Requires a session. Unauthenticated users reach nothing else.
 *
 * The attempted path is preserved in `?next=` so a deep link survives sign-in,
 * which matters because the whole app is deep-linkable from Phase 2.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, roleResolved } = useAuth()
  const location = useLocation()

  if (status === 'loading' || (status === 'signedIn' && !roleResolved)) return <Resolving />
  if (status === 'signedOut') {
    // With the bypass on there is nowhere to send anyone: the sign-in route is
    // hidden and a session is on its way in. Hold the resolving screen instead
    // of bouncing to a page that is not reachable.
    if (AUTH_BYPASS) return <Resolving />
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
  }
  return <>{children}</>
}

/** A signed-in user whose app_user row is missing, inactive, or has no role. */
function NoRole() {
  const { t } = useTranslation(['auth', 'common'])
  const { email, signOut } = useAuth()
  return (
    <AuthShell title={t('auth:noRole.title')} subtitle={t('auth:noRole.subtitle', { email })}>
      <SecondaryButton onClick={() => void signOut()} full>
        {t('auth:signOut')}
      </SecondaryButton>
    </AuthShell>
  )
}

/**
 * A refusal, rendered inside the municipal shell.
 *
 * Deliberately NOT `EmptyState`: that component titles with a <p>, which is
 * right on a list screen where an <h1> already sits above it and wrong here,
 * where the refusal IS the page. A screen reader user who lands on a denied
 * deep link would otherwise find a page with no heading at all.
 */
function Denied({ title, body }: { title: string; body: string }) {
  const { t } = useTranslation('auth')
  const { role } = useAuth()
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-sunken px-6 py-12 text-center">
      <h1 className="text-lg font-bold tracking-tight text-ink">{title}</h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-2">
        <Link to={homeRouteFor(role)} className="inline-flex">
          <PrimaryButton>{t('denied.goHome')}</PrimaryButton>
        </Link>
      </div>
    </div>
  )
}

/** Requires a capability. Falls back to the role's own home, never a dead end. */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability
  children: ReactNode
}) {
  const { status, role, roleResolved } = useAuth()
  const { t } = useTranslation(['auth', 'nav'])
  const location = useLocation()

  if (status === 'loading' || !roleResolved) return <Resolving />
  if (status === 'signedOut') {
    if (AUTH_BYPASS) return <Resolving />
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
  }
  if (!role) return <NoRole />

  if (!can(role, capability)) {
    return <Denied title={t('auth:denied.title')} body={t('auth:denied.body')} />
  }
  return <>{children}</>
}

/** Guards `/forms/:module`, matching the role's module list. */
export function RequireModule({ children }: { children: ReactNode }) {
  const { module } = useParams()
  const { role, roleResolved, status } = useAuth()
  const { t } = useTranslation(['auth'])

  if (status === 'loading' || !roleResolved) return <Resolving />
  if (!role) return <NoRole />

  if (!isModuleId(module) || !canAccessModule(role, module)) {
    return <Denied title={t('auth:denied.title')} body={t('auth:denied.moduleBody')} />
  }
  return <>{children}</>
}

/**
 * Guards the participant portal.
 *
 * A participant with no linked `person` row is a real, expected state: the
 * coordinator creates the auth account before, or without, linking it to a
 * producer record. That must explain itself, not crash on a null person.
 */
export function RequirePortal({ children }: { children: ReactNode }) {
  const { status, role, roleResolved, personId, email, signOut } = useAuth()
  const { t } = useTranslation(['auth', 'portal'])
  const location = useLocation()

  if (status === 'loading' || !roleResolved) return <Resolving />
  if (status === 'signedOut') {
    if (AUTH_BYPASS) return <Resolving />
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
  }
  if (!role) return <NoRole />

  // Staff who wander into the portal go back to their own home.
  if (!can(role, 'portal.access')) return <Navigate to={homeRouteFor(role)} replace />

  if (!personId) {
    return (
      <AuthShell
        title={t('auth:notLinked.title')}
        subtitle={t('auth:notLinked.subtitle', { email })}
      >
        <p className="mb-5 text-sm leading-relaxed text-muted">{t('auth:notLinked.body')}</p>
        <SecondaryButton onClick={() => void signOut()} full>
          {t('auth:signOut')}
        </SecondaryButton>
      </AuthShell>
    )
  }

  return <>{children}</>
}
