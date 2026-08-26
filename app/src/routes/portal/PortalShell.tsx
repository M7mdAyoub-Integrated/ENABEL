import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleSwitcher } from '../../components/LocaleSwitcher'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { DEMO_MODE } from '../../demo/demoMode'

/**
 * The producer portal's frame, copied from the prototype.
 *
 * A full teal ground with cream type -- deliberately nothing like the
 * municipality's cream-and-black screens. A producer opening this on a phone
 * should never wonder whether they are looking at staff tooling, and a member
 * of staff who lands here should see instantly that they are on the wrong side.
 *
 * The prototype puts a Municipality/Participant toggle in this header because
 * it is a mock. Here the side you are on comes from your role, so the header
 * carries the language switch and the way out instead.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['portal', 'common', 'auth', 'nav'])
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-teal text-bg">
      <header
        className="flex items-center justify-between gap-5 border-b-2 border-bg/25 px-4 py-[13px] sm:px-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.8125rem)' }}
      >
        <div className="min-w-0">
          <div className="font-narrow text-[10.5px] font-bold uppercase tracking-[0.2em] opacity-70">
            {t('common:orgName')}
          </div>
          <div className="mt-0.5 truncate text-[16px] font-extrabold uppercase tracking-[-0.02em]">
            {t('portal:portalName')}
          </div>
        </div>
        <div className="flex flex-none gap-2.5">
          <LocaleSwitcher tone="invert" />
          {/* Demo mode: the same two-way toggle as the municipality header, in
              the portal's inverted colours. Otherwise, sign out.
              See src/demo/demoMode.ts. */}
          {DEMO_MODE ? (
            <div className="flex flex-none border-[1.5px] border-bg">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="min-h-11 cursor-pointer whitespace-nowrap px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg sm:min-h-0"
              >
                {t('nav:municipality')}
              </button>
              <span
                aria-current="true"
                className="flex min-h-11 items-center whitespace-nowrap border-s-[1.5px] border-bg bg-bg px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-teal sm:min-h-0"
              >
                {t('nav:participant')}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signOut()}
              className="cursor-pointer border-[1.5px] border-bg px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg hover:bg-bg hover:text-teal"
            >
              {t('auth:signOut')}
            </button>
          )}
        </div>
      </header>
      {children}
    </div>
  )
}

export default PortalShell
