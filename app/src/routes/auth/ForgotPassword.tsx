import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { AuthShell } from './AuthShell'
import { PrimaryButton } from '../../ui/primitives'

export function ForgotPassword() {
  const { t } = useTranslation(['auth', 'common'])
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await requestPasswordReset(email.trim())
    setBusy(false)
    // Always report success. Whether the address exists is not the caller's
    // business -- otherwise this becomes an account-enumeration oracle.
    setSent(true)
  }

  return (
    <AuthShell title={t('auth:forgot.title')} subtitle={t('auth:forgot.subtitle')}>
      {sent ? (
        <p role="status" className="text-sm leading-relaxed text-ink">
          {t('auth:forgot.sent')}
        </p>
      ) : (
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
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className="min-h-11 w-full rounded-[var(--radius-card)] border border-ink bg-bg px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            />
          </label>
          <PrimaryButton type="submit" disabled={busy} full>
            {busy ? t('auth:forgot.working') : t('auth:forgot.submit')}
          </PrimaryButton>
        </form>
      )}

      <div className="mt-5 border-t border-border-default pt-4">
        <Link
          to="/signin"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4"
        >
          {t('auth:backToSignIn')}
        </Link>
      </div>
    </AuthShell>
  )
}

export default ForgotPassword
