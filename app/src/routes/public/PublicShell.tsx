import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LocaleSwitcher } from '../../components/LocaleSwitcher'
import { useAuth } from '../../auth/AuthProvider'
import { ARROW_START } from '../../ui/glyphs'

/**
 * The other half of the preview.
 *
 * Shown ONLY to someone with a session who is not a participant — that is, a
 * member of municipal staff who has walked over from the app. A visitor has no
 * session and never sees it, which is the property that matters most: this bar
 * must not become part of the public page.
 *
 * It says so out loud, because a coordinator who is not sure whether the public
 * can see it will either worry or, worse, start writing the public page around
 * it.
 *
 * Sticky and inverted, so it reads as chrome laid over the page rather than as
 * the page's own masthead — the same reason a CMS preview bar looks nothing
 * like the site it is previewing.
 */
function PreviewBar() {
  const { t } = useTranslation('public')
  const { session, role } = useAuth()

  if (!session || role === 'participant') return null

  return (
    <div className="sticky top-0 z-20 bg-ink text-bg">
      <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em]">
          {t('preview.title')}
        </span>
        <span className="order-last w-full text-[12px] leading-[1.45] text-bg/70 sm:order-none sm:w-auto">
          {t('preview.note')}
        </span>
        <Link
          to="/dashboard"
          className="flex min-h-9 flex-none items-center gap-2 border-[1.5px] border-bg px-3 font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:bg-bg hover:text-ink"
        >
          <span aria-hidden="true" className="inline-block mirror-rtl">
            {ARROW_START}
          </span>
          {t('preview.back')}
        </Link>
      </div>
    </div>
  )
}

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
 *
 *      One exception, and it proves the rule rather than bending it: the
 *      preview bar above, which renders only when a session already exists.
 *      A visitor has none, so for the reader this file is written for there is
 *      still nothing about accounts anywhere on the page.
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
      <PreviewBar />
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
