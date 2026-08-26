import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleSwitcher } from '../../components/LocaleSwitcher'

/** Shared frame for every unauthenticated screen. No sidebar, no nav. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const { t } = useTranslation('common')
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
      }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-narrow text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            {t('subtitle')}
          </p>
          <p className="text-lg font-extrabold leading-tight tracking-tight text-ink">
            {t('appName')}
          </p>
        </div>
        <LocaleSwitcher />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border-default bg-bg p-5 sm:p-6">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mb-5 mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>
        ) : (
          <div className="mb-5" />
        )}
        {children}
      </div>
    </main>
  )
}

export default AuthShell
