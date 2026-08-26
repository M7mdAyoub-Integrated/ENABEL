import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleSwitcher } from '../../components/LocaleSwitcher'
import { useAuth } from '../../auth/AuthProvider'
import { AUTH_BYPASS } from '../../dev/authBypass'

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
  const { t } = useTranslation(['portal', 'common', 'auth'])
  const { signOut } = useAuth()

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
          {/* Hidden while the development bypass is on -- see authBypass.ts. */}
          {AUTH_BYPASS ? null : (
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
