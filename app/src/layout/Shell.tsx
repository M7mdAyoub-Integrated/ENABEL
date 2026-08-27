import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type ModuleId } from '../modules'
import { useNavCounts } from '../data/moduleCounts'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { OfflineBar } from '../components/OfflineBar'
import { useAuth } from '../auth/AuthProvider'
import { can, modulesFor } from '../auth/permissions'
import { DEMO_MODE } from '../demo/demoMode'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  This shell is a copy of the prototype's, not an interpretation of it.
 *
 *  Every number here -- 238px rail, 2px rules, 10.5px/0.2em brand line, the
 *  16px numeral gutter -- comes from `shm-install/SHM Platform v2.dc.html`.
 *  The design is flat and ruled: structure is carried by black rules of three
 *  weights (1.5 / 2 / 3px) and a 6px accent bar, never by rounded corners or
 *  shadows. If a change here adds a radius or a shadow, it is wrong.
 *
 *  Logical properties (`border-e`, `ps-`, `text-start`) are used instead of the
 *  prototype's physical left/right, because this build is bilingual and the
 *  whole rail mirrors in Arabic. That is the one intentional difference.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Dest = { to: string; labelKey: string; num: string; count?: number | string }
type Group = { labelKey: string | null; items: Dest[] }

/**
 * Navigation, grouped and numbered exactly as the prototype's NAV table.
 *
 * Filtered to the signed-in role: a role never sees a link it cannot open, and
 * a group whose every item is filtered away disappears rather than leaving a
 * heading with nothing under it. Convenience only -- the route guards refuse
 * the same paths and RLS refuses the same data.
 */
function useNavGroups(): Group[] {
  const counts = useNavCounts()
  const { role } = useAuth()
  const allowed = modulesFor(role)

  const mod = (m: ModuleId, num: string): Dest[] =>
    allowed.includes(m)
      ? [{ to: `/forms/${m}`, labelKey: `nav:module.${m}`, num, count: counts[m] }]
      : []

  const groups: Group[] = [
    {
      labelKey: null,
      items: can(role, 'dashboard.view')
        ? [{ to: '/dashboard', labelKey: 'nav:dashboard', num: '00' }]
        : [],
    },
    { labelKey: 'nav:group.partnerships', items: [...mod('tp', '01'), ...mod('pp', '02')] },
    {
      labelKey: 'nav:group.training',
      items: [
        // Sessions was reachable only by typing the URL until now. It is the
        // screen that creates and publishes the thing the public flow depends
        // on, so it belongs in the navigation.
        ...(can(role, 'record.edit')
          ? [{ to: '/sessions', labelKey: 'nav:sessions', num: '03' } as Dest]
          : []),
        ...mod('tc', '04'),
      ],
    },
    {
      labelKey: 'nav:group.production',
      items: [
        ...(can(role, 'record.edit')
          ? [{ to: '/advisory', labelKey: 'nav:advisory', num: '05' } as Dest]
          : []),
        ...mod('ln', '06'),
      ],
    },
    { labelKey: 'nav:group.markets', items: [...mod('ex', '05'), ...mod('rg', '06')] },
    { labelKey: 'nav:group.followup', items: mod('fu', '07') },
    {
      labelKey: 'nav:group.noForm',
      items: can(role, 'manual.view')
        // No count: the number of indicators without a form changed twice in
        // one session, and a hardcoded badge is a claim that goes stale
        // silently. See CLAUDE.md, checks that verify shape not substance.
        ? [{ to: '/manual-entries', labelKey: 'nav:manualEntries', num: '08' }]
        : [],
    },
    { labelKey: null, items: [{ to: '/settings', labelKey: 'nav:settings', num: '09' }] },
  ]
  return groups.filter((g) => g.items.length > 0)
}

/** Flat list, for the phone tab bar and the More sheet. */
function useFlatDests(groups: Group[]): Dest[] {
  return groups.flatMap((g) => g.items)
}

function NavItem({ dest, onNavigate }: { dest: Dest; onNavigate?: (() => void) | undefined }) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={dest.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex w-full items-center gap-[11px] px-[18px] py-2 text-start ${
          isActive ? 'bg-ink text-bg' : 'text-ink hover:bg-sunken'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`w-4 flex-none font-narrow text-[11px] font-bold tracking-[0.08em] tabular-nums ${
              isActive ? 'text-dim' : 'text-ghost'
            }`}
          >
            {dest.num}
          </span>
          <span className={`text-sm tracking-[-0.005em] ${isActive ? 'font-extrabold' : 'font-medium'}`}>
            {t(dest.labelKey)}
          </span>
          {dest.count != null ? (
            <span
              className={`ms-auto font-narrow text-[11.5px] font-semibold tabular-nums ${
                isActive ? 'text-dim' : 'text-ghost'
              }`}
            >
              {dest.count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function NavGroups({
  groups,
  onNavigate,
}: {
  groups: Group[]
  onNavigate?: (() => void) | undefined
}) {
  const { t } = useTranslation()
  return (
    <>
      {groups.map((g, i) => (
        <div key={g.labelKey ?? `g${i}`}>
          {g.labelKey ? (
            <div className="px-[18px] pb-[5px] pt-[15px] font-narrow text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
              {t(g.labelKey)}
            </div>
          ) : null}
          {g.items.map((d) => (
            <NavItem key={d.to} dest={d} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </>
  )
}

/** Foot of the rail: who is signed in, and the way out. */
function SignedInAs({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation(['auth', 'nav'])
  const { email, role, signOut } = useAuth()
  // Demo mode shows nothing about accounts, roles or sessions. The component is
  // untouched and returns in full when DEMO_MODE is false.
  // See src/demo/demoMode.ts.
  if (DEMO_MODE) return null
  if (!email) return null
  return (
    <div className={`border-t-2 border-ink px-[18px] py-[14px] ${compact ? '' : 'mt-auto'}`}>
      <div className="font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
        {t('nav:signedIn')}
      </div>
      <div className="mt-[3px] text-[13.5px] font-bold leading-[1.25] tracking-[-0.01em]">
        {role ? t(`auth:role.${role}`) : t('auth:role.none')}
      </div>
      <div
        className="mt-[3px] truncate text-[12px] text-muted"
        dir="ltr"
        style={{ unicodeBidi: 'isolate' }}
      >
        {email}
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-[10px] w-full cursor-pointer border-[1.5px] border-ink bg-bg px-4 py-[7px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink hover:bg-sunken"
      >
        {t('auth:signOut')}
      </button>
    </div>
  )
}

/** The rail's masthead. Two lines, 2px rule under. */
function Brand() {
  const { t } = useTranslation('common')
  return (
    <div className="border-b-2 border-ink px-[18px] pb-4 pt-5">
      <div className="font-narrow text-[10.5px] font-bold uppercase tracking-[0.2em] text-muted">
        {t('orgShort')}
      </div>
      <div className="mt-[5px] text-[20px] font-black uppercase leading-none tracking-[-0.03em]">
        {t('appNameShort')}
      </div>
    </div>
  )
}

/**
 * Municipality / Participant.
 *
 * In demo mode this is the prototype's toggle: two segments, one button, same
 * placement in the header. It switches VIEW, not identity -- there is one
 * session underneath and it never changes. Participant simply routes to the
 * producer portal, which is a different screen, not a different account.
 *
 * With DEMO_MODE off it goes back to being a static label showing which side of
 * the app you are on, because then the side is decided by your real role and
 * offering to switch it would undo Phase 3. See src/demo/demoMode.ts.
 */
function ViewToggle() {
  const { t } = useTranslation('nav')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onPortal = pathname.startsWith('/portal')

  if (!DEMO_MODE) {
    return (
      <div className="flex border-[1.5px] border-ink">
        <span className="flex min-h-11 items-center bg-ink px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg sm:min-h-0">
          {t('municipality')}
        </span>
      </div>
    )
  }

  const segments = [
    { key: 'municipality' as const, to: '/dashboard', active: !onPortal },
    { key: 'participant' as const, to: '/portal', active: onPortal },
  ]

  return (
    <div className="flex flex-none border-[1.5px] border-ink">
      {segments.map((seg, i) => (
        <button
          key={seg.key}
          type="button"
          aria-pressed={seg.active}
          onClick={() => navigate(seg.to)}
          className={`min-h-11 cursor-pointer whitespace-nowrap px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] sm:min-h-0 ${
            i > 0 ? 'border-s-[1.5px] border-ink' : ''
          } ${seg.active ? 'bg-ink text-bg' : 'bg-bg text-muted hover:text-ink'}`}
        >
          {t(seg.key)}
        </button>
      ))}
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['nav', 'common'])
  const groups = useNavGroups()
  const all = useFlatDests(groups)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = all.slice(0, 4)

  return (
    <div className="flex min-h-dvh items-start">
      {/* ── Rail, 1024+ ── 238px, 2px rule down the inline edge ── */}
      <aside className="sticky top-0 hidden h-dvh w-[238px] flex-none flex-col border-e-2 border-ink bg-bg lg:flex">
        <Brand />
        <nav aria-label={t('nav:landmark')} className="flex-1 overflow-auto pb-2">
          <NavGroups groups={groups} />
        </nav>
        <SignedInAs />
      </aside>

      <div className="min-w-0 flex-1">
        {/* ── Header ── sticky, 2px rule under, brand left, chips right ── */}
        <header
          className="sticky top-0 z-[6] flex items-end justify-between gap-4 border-b-2 border-ink bg-bg px-4 py-3 sm:gap-7 sm:px-[34px]"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('nav:openMenu')}
              className="hidden h-11 w-11 flex-none items-center justify-center border-[1.5px] border-ink md:inline-flex lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-extrabold uppercase tracking-[-0.015em]">
                {t('common:orgName')}
              </div>
              <div className="mt-[2px] hidden font-narrow text-[11.5px] font-medium uppercase tracking-[0.07em] text-muted sm:block">
                {t('common:programmeLine')}
              </div>
            </div>
          </div>
          <div className="flex flex-none items-stretch gap-[10px]">
            <div className="hidden sm:flex">
              <ViewToggle />
            </div>
            <LocaleSwitcher />
          </div>
        </header>
        <OfflineBar />

        {/* Tablet drawer, same design language as the rail. */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label={t('common:actions.dismiss')}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-ink/55"
            />
            <nav
              aria-label={t('nav:landmark')}
              className="absolute inset-y-0 start-0 flex w-[238px] max-w-[85vw] flex-col border-e-2 border-ink bg-bg"
            >
              <Brand />
              <div className="flex-1 overflow-auto pb-2">
                <NavGroups groups={groups} onNavigate={() => setDrawerOpen(false)} />
              </div>
              <SignedInAs />
            </nav>
          </div>
        ) : null}

        <main
          id="main"
          className="w-full max-w-[1210px] px-4 pb-20 sm:px-[34px]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
        >
          {children}
        </main>
      </div>

      {/* Phone <768: bottom tab bar. Not in the prototype, which is desktop
          only -- but 320px is a hard requirement of the build plan, so it is
          drawn in the same flat, ruled language. */}
      <nav
        aria-label={t('nav:landmark')}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-ink bg-bg md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {primary.map((d) => (
          <NavLink
            key={d.to}
            to={d.to}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 border-e border-border-default px-1 py-2 text-center font-narrow text-[10.5px] font-bold uppercase tracking-[0.08em] ${
                isActive ? 'bg-ink text-bg' : 'text-muted'
              }`
            }
          >
            <span className="line-clamp-2 leading-tight">{t(d.labelKey)}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 font-narrow text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted"
        >
          {t('nav:more')}
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 flex items-end md:hidden">
          <button
            type="button"
            aria-label={t('common:actions.dismiss')}
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-ink/55"
          />
          <nav
            aria-label={t('nav:more')}
            className="relative max-h-[80vh] w-full overflow-y-auto border-t-2 border-ink bg-bg pb-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <NavGroups groups={groups} onNavigate={() => setMoreOpen(false)} />
            <SignedInAs compact />
          </nav>
        </div>
      ) : null}
    </div>
  )
}
