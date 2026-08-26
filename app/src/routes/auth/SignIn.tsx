import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { homeRouteFor } from '../../auth/permissions'
import { AuthShell } from './AuthShell'
import { PrimaryButton } from '../../ui/primitives'

export function SignIn() {
  const { t } = useTranslation(['auth', 'common'])
  const { status, role, roleResolved, signIn, expired } = useAuth()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'signedIn' && roleResolved) {
    return <Navigate to={params.get('next') || homeRouteFor(role)} replace />
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
    if (err) setError(t('auth:errors.invalidCredentials'))
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
