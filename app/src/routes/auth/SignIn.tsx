import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { homeRouteFor } from '../../auth/permissions'
import { useCurrentMunicipality, useMunicipalityName } from '../../data/municipalities'
import { AuthShell } from './AuthShell'
import { BidiIsolate } from '../../components/BidiIsolate'
import { PrimaryButton, SecondaryButton } from '../../ui/primitives'

export function SignIn() {
  const { t } = useTranslation(['auth', 'common'])
  const { status, role, roleResolved, email: sessionEmail, isSuperAdmin, signIn, signOut, expired } = useAuth()
  const municipality = useCurrentMunicipality()
  const municipalityName = useMunicipalityName()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // True once THIS screen signed somebody in. Only then does a session mean
  // "go": a session that was already there when the screen opened is shown,
  // with a way to keep it and a way to replace it. A silent redirect here is
  // what hid demo mode signing in on /signin (15 September 2026).
  const [signedInHere, setSignedInHere] = useState(false)

  // Where a session goes from here: the deep link that bounced to sign-in,
  // or the home the role implies -- /dashboard for staff, which reads the
  // account's municipality (a super admin's last choice, or the chooser).
  const destination = params.get('next') || homeRouteFor(role)

  if (status === 'signedIn' && roleResolved && signedInHere) {
    return <Navigate to={destination} replace />
  }

  if (status === 'loading' || (status === 'signedIn' && !roleResolved)) {
    return (
      <AuthShell title={t('auth:checking')}>
        <p role="status" className="text-sm text-muted">
          {t('auth:checkingBody')}
        </p>
      </AuthShell>
    )
  }

  if (status === 'signedIn') {
    const where = municipality
      ? municipalityName(municipality)
      : isSuperAdmin
        ? t('auth:signedIn.noMunicipality')
        : ''
    // Built outside the JSX: jsx-no-literals refuses a bare separator.
    const roleAndWhere = t(`auth:role.${role ?? 'none'}`) + (where ? ' \u00b7 ' + where : '')
    return (
      <AuthShell title={t('auth:signedIn.title')} subtitle={t('auth:signedIn.subtitle')}>
        <div className="flex flex-col gap-1 border-[1.5px] border-ink bg-sunken px-4 py-3">
          <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
            {t('auth:signedIn.as')}
          </span>
          <span dir="ltr" className="text-[15px] font-semibold text-ink" style={{ unicodeBidi: 'isolate' }}>
            {sessionEmail}
          </span>
          <span className="text-[13.5px] text-body">
            <BidiIsolate>{roleAndWhere}</BidiIsolate>
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Link to={destination} className="inline-flex">
            <PrimaryButton full>{t('auth:signedIn.continue')}</PrimaryButton>
          </Link>
          <SecondaryButton full onClick={() => void signOut()}>
            {t('auth:signedIn.someoneElse')}
          </SecondaryButton>
        </div>
      </AuthShell>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError(t('auth:errors.bothRequired'))
      return
    }
    setBusy(true)
    const { error: err } = await signIn(email.trim(), password)
    setBusy(false)
    // Deliberately generic: never reveal whether the address exists.
    if (err) {
      setError(t('auth:errors.invalidCredentials'))
      return
    }
    setSignedInHere(true)
  }

  return (
    <AuthShell title={t('auth:signIn.title')} subtitle={t('auth:signIn.subtitle')}>
      {expired ? (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius-card)] border border-attention-border bg-attention-bg px-4 py-3 text-sm text-attention-ink"
        >
          {t('auth:sessionExpired')}
        </p>
      ) : null}

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
            {t('auth:fields.email')}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            // Email is LTR data; inside an Arabic page it must not reorder.
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="min-h-11 w-full rounded-[var(--radius-card)] border border-ink bg-bg px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
            {t('auth:fields.password')}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="min-h-11 w-full rounded-[var(--radius-card)] border border-ink bg-bg px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={busy} full>
          {busy ? t('auth:signIn.working') : t('auth:signIn.submit')}
        </PrimaryButton>
      </form>

      <div className="mt-5 flex flex-col gap-2 border-t border-border-default pt-4">
        <Link
          to="/forgot"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4"
        >
          {t('auth:signIn.forgot')}
        </Link>
        <p className="text-xs leading-relaxed text-faint">{t('auth:signIn.noSelfSignup')}</p>
      </div>
    </AuthShell>
  )
}

export default SignIn
