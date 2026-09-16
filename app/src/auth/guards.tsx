import { useState, type ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthProvider'
import { useMunicipalities, useMunicipalityName } from '../data/municipalities'
import {
  can,
  canAccessModule,
  homeRouteFor,
  type Capability,
} from './permissions'
import { isModuleId } from '../modules'
import { AuthShell } from '../routes/auth/AuthShell'
import { PrimaryButton, SecondaryButton } from '../ui/primitives'
import { Link } from 'react-router-dom'

/** Shown while the session and role are still resolving. */
export function Resolving() {
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
 * Holds rendering until the session exists.
 *
 * Demo mode removes every guard, and the guards were also what kept the screen
 * from rendering before auth had settled. Without this, TanStack Query fires
 * its first requests as `anon`, PostgREST answers 401, and the retry policy
 * classifies that as a permanent refusal and caches it -- so a correctly
 * configured app shows "Not permitted" on a cold load and never recovers.
 *
 * This gates on the SESSION only, never on a role or a capability, so it is a
 * loading state rather than a permission check.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  // Signing out is real in demo mode too (the chip in Shell.tsx). Without
  // this branch a signed-out demo session would sit on "checking" forever,
  // because the silent sign-in runs once, on load.
  if (status === 'signedOut') return <Navigate to="/" replace />
  if (status !== 'signedIn') return <Resolving />
  return <>{children}</>
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
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
  }
  if (!role) return <NoRole />

  if (!can(role, capability)) {
    return <Denied title={t('auth:denied.title')} body={t('auth:denied.body')} />
  }
  return <>{children}</>
}

/**
 * A super admin who has not switched into a municipality has nowhere to put
 * a record: every scoped column default is null and NOT NULL refuses (0112,
 * 0117). Rather than let every form fail on submit, the municipal screens
 * are held behind this until one is chosen from the header. `/accounts` and
 * `/settings` need no municipality and are let through: each opens the
 * platform panel and lands back here, so the chooser sits under the panel.
 *
 * A municipal account always has one, so this never fires for them.
 */
export function MunicipalityGate({ children }: { children: ReactNode }) {
  const { isSuperAdmin, municipalityId, roleResolved } = useAuth()
  const location = useLocation()
  const exempt = location.pathname === '/accounts' || location.pathname === '/settings'
  if (roleResolved && isSuperAdmin && !municipalityId && !exempt) return <MunicipalityChooser />
  return <>{children}</>
}

/**
 * A super admin with no municipality chosen, on a screen that needs one.
 * One button per active municipality; the choice is written to the database
 * (`set_acting_municipality`, the same call the header switcher makes), and
 * the gate above lets the screen through as soon as it lands. Used to be a
 * notice pointing at the header, which is a chooser only if you know where
 * to look.
 */
function MunicipalityChooser() {
  const { t } = useTranslation('common')
  const { setActingMunicipality } = useAuth()
  const { data, isLoading, isError } = useMunicipalities()
  const name = useMunicipalityName()
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const options = (data ?? []).filter((m) => m.is_active)

  const choose = async (id: string) => {
    setBusy(id)
    setFailed(false)
    const { error } = await setActingMunicipality(id)
    setBusy(null)
    if (error) setFailed(true)
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-sunken px-6 py-12 text-center">
      <h1 className="text-lg font-bold tracking-tight text-ink">{t('municipalityGate.title')}</h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted">{t('municipalityGate.body')}</p>
      {isLoading ? <div aria-hidden="true" className="h-11 w-48 animate-pulse bg-track" /> : null}
      {isError ? (
        <p role="alert" className="text-sm font-semibold text-error">{t('municipalityGate.loadFailed')}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {options.map((m) => (
          <PrimaryButton key={m.id} disabled={busy !== null} onClick={() => void choose(m.id)}>
            {name(m)}
          </PrimaryButton>
        ))}
      </div>
      {failed ? (
        <p role="alert" className="text-sm font-semibold text-error">{t('municipalityGate.failed')}</p>
      ) : null}
    </div>
  )
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
