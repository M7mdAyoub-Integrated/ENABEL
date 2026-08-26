import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { AuthShell } from './AuthShell'
import { PrimaryButton } from '../../ui/primitives'

const MIN_LENGTH = 10

export function ResetPassword() {
  const { t } = useTranslation(['auth', 'common'])
  const { updatePassword, status } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) {
      setError(t('auth:errors.passwordTooShort', { count: MIN_LENGTH }))
      return
    }
    if (password !== confirm) {
      setError(t('auth:errors.passwordMismatch'))
      return
    }
    setBusy(true)
    const { error: err } = await updatePassword(password)
    setBusy(false)
    if (err) {
      setError(t('auth:errors.resetFailed'))
      return
    }
    navigate('/signin', { replace: true })
  }

  // The reset link signs the user in with a recovery token. With no session
  // there is nothing to update, so say so rather than showing a dead form.
  if (status === 'signedOut') {
    return (
      <AuthShell title={t('auth:reset.title')}>
        <p role="alert" className="text-sm leading-relaxed text-ink">
          {t('auth:reset.linkInvalid')}
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('auth:reset.title')} subtitle={t('auth:reset.subtitle')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
            {t('auth:fields.newPassword')}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="min-h-11 w-full rounded-[var(--radius-card)] border border-ink bg-bg px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
            {t('auth:fields.confirmPassword')}
          </span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
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
          {busy ? t('auth:reset.working') : t('auth:reset.submit')}
        </PrimaryButton>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
