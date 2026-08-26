import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LocaleSwitcher } from '../../components/LocaleSwitcher'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The frame for every public page.
 *
 *  This is the first screen in the project a FARMER opens rather than staff.
 *  Everything before it assumed someone at a desk who already knows what the
 *  system is for. This one has to explain itself to someone who does not.
 *
 *  So, deliberately:
 *    • No sidebar, no module navigation, no dashboard — none of that means
 *      anything to a member of the public.
 *    • Nothing about accounts, roles, sessions or signing in. There is no
 *      account to have.
 *    • The masthead says who this is and what the programme is, on every page,
 *      because someone may arrive on a detail page from a shared link with no
 *      idea what they are looking at.
 *    • The language switch is the only control, and it is large enough to hit
 *      with a thumb.
 *
 *  Built at 320 first. The layout is a single column that stays a single column
 *  — it simply gets more comfortable as the screen grows.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('public')

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header
        className="border-b-2 border-ink bg-bg"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0 text-ink no-underline hover:text-ink">
            <div className="font-narrow text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted">
              {t('siteName')}
            </div>
            <div className="mt-0.5 text-[15px] font-extrabold uppercase leading-[1.15] tracking-[-0.02em] sm:text-[17px]">
              {t('programme')}
            </div>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-[900px] flex-1 px-4 pb-16 sm:px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)' }}
      >
        {children}
      </main>
    </div>
  )
}

export default PublicShell
