import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type ModuleId } from '../modules'
import { useNavCounts } from '../data/moduleCounts'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { OfflineBar } from '../components/OfflineBar'
import { useAuth } from '../auth/AuthProvider'
import { can, modulesFor } from '../auth/permissions'
import { EXTERNAL } from '../ui/glyphs'
import { MunicipalitySwitcher } from '../components/MunicipalitySwitcher'
import { useCurrentMunicipality, useMunicipalityName, useProgrammeLine } from '../data/municipalities'
import { RMTH_FORMS, RMTH_FORM_IDS, type RmthFormId } from '../rmth/forms.generated'
import { KHLD_FORM_IDS, KHLD_GROUPS } from '../khld/forms.generated'
import { formDef } from '../khld/labels'
import { AccountMenu } from './AccountMenu'
import { PlatformDialog } from './PlatformDialog'
import {
  PlatformDialogContext,
  sectionFromParams,
  withDialogSection,
  withoutDialog,
  type DialogSection,
} from './platformDialogContext'

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

/**
 * A navigation entry: a route. Nothing else — the platform's two sections
 * (accounts, settings) used to be entries here too, for a super admin with no
 * municipality chosen, and are reached from the account menu only now; see
 * useNavGroups.
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
/**
 * Which nav group a Ramtha form belongs to, DERIVED from its indicator code
 * rather than listed here.
 *
 * `RMTH-SO1-A1.2` -> `so1`, `RMTH-IMP-0` -> `impact`. A hand-written map of
 * seventeen form ids to four groups is a second copy of something the
 * definition already states, and CLAUDE.md's register is mostly second copies
 * that drifted. Add an eighteenth form and it lands in the right group with no
 * edit here; give one an indicator code in a shape this does not recognise and
 * it returns undefined, which the caller turns into a visible group rather
 * than dropping the form silently.
 */
function rmthGroupOf(fid: RmthFormId): 'impact' | 'so1' | 'so2' | 'so3' | undefined {
  const code = (RMTH_FORMS[fid] as { indicator: string }).indicator
  const part = code.split('-')[1]
  if (part === 'IMP') return 'impact'
  if (part === 'SO1') return 'so1'
  if (part === 'SO2') return 'so2'
  if (part === 'SO3') return 'so3'
  return undefined
}

const RMTH_GROUP_ORDER = ['impact', 'so1', 'so2', 'so3'] as const

/**
 * Two scopes, never mixed.
 *
 * Administering the platform and looking at a municipality are different
 * activities. The sidebar is for the second: a municipality's product, built
 * by the same code path its own admin's is, so a super admin acting on Ramtha
 * sees the sidebar the Ramtha admin sees, entry for entry. A super admin who
 * has not chosen a municipality has nothing to navigate — a form belongs to a
 * municipality, and listing one municipality's forms under "choose a
 * municipality" implies a choice that has not been made — so the sidebar is
 * EMPTY for them, and says so (ShellFrame), while the chooser in the main
 * area does the choosing.
 *
 * The platform's administration — accounts and settings — is not in the
 * sidebar for anyone. It belongs to the person, not to the municipality
 * being looked at, so it lives in the one control that already carries the
 * identity: the account menu (AccountMenu), which opens the platform dialog
 * (PlatformDialog). Until 16 September 2026 a super admin with no
 * municipality ALSO had the two as sidebar entries, which put the same
 * destination in two places, one of them inside the thing the other opened.
 * There is exactly one way in now.
 */
function useNavGroups(): Group[] {
  const counts = useNavCounts()
  const { role, isSuperAdmin, municipalityId } = useAuth()
  const allowed = modulesFor(role)
  const municipality = useCurrentMunicipality()

  if (isSuperAdmin && !municipalityId) return []

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
    // One entry, not two. `tp` and `pp` are retired and redirect here.
    { labelKey: 'nav:group.partnerships', items: mod('pn', '01') },
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
        // The queue the public linkage form feeds. Without a link here it
        // would be URL-only, which is exactly how /sessions was missed.
        ...(can(role, 'record.edit')
          ? [{ to: '/linkage-requests', labelKey: 'nav:linkageRequests', num: '06' } as Dest]
          : []),
        // Where mentorship sessions are recorded. Without a link here the
        // screen would be URL-only, which is exactly how /sessions was missed.
        ...(can(role, 'record.edit')
          ? [{ to: '/initiatives', labelKey: 'nav:initiatives', num: '06' } as Dest]
          : []),
        // `mod('ln')` was here and rendered nothing: `ln` is retired, no role
        // has it in MODULE_ACCESS, and /forms/ln redirects to
        // /linkage-requests anyway. A nav call that can only ever return []
        // reads as a live entry to whoever edits this next.
      ],
    },
    // `mod('rg')` was here for the same reason and with the same effect.
    // Registrations are decided on /exhibitions/:id, reached from the
    // exhibition record.
    { labelKey: 'nav:group.markets', items: mod('ex', '05') },
    // The coordination office. Its own group rather than folded into another:
    // it is the only module that is a record of walk-in advice, and B1.2 is the
    // only indicator it feeds.
    { labelKey: 'nav:group.office', items: mod('os', '07') },
    // The guidance log. Its own group for the same reason the office has one:
    // it is a record of advice given at the counter, and D0.1 is the only
    // indicator it feeds.
    { labelKey: 'nav:group.guidance', items: mod('gd', '07') },
    {
      labelKey: 'nav:group.followup',
      // Its own route, not a /forms module: the survey is used on a phone in a
      // field and needed screens built for that. Enumerators reach it too, so
      // it is gated on record.edit rather than on a module list.
      items: can(role, 'record.edit')
        ? [{ to: '/followups', labelKey: 'nav:followups', num: '07' } as Dest]
        : [],
    },
    {
      labelKey: 'nav:group.noForm',
      items: can(role, 'manual.view')
        // No count: the number of indicators without a form changed twice in
        // one session, and a hardcoded badge is a claim that goes stale
        // silently. See CLAUDE.md, checks that verify shape not substance.
        ? [{ to: '/manual-entries', labelKey: 'nav:manualEntries', num: '08' }]
        : [],
    },
    // Accounts and settings used to end this list — an "Administration"
    // group for a super admin, and Settings for everyone. Both are the
    // platform's, not the programme's, and are reached from the account
    // menu only; see the note above.
  ]

  // ── Ramtha ────────────────────────────────────────────────────────────────
  //
  // Ramtha's seventeen forms replace the Sahel Horan groups entirely when the
  // acting municipality is Ramtha: they are a different programme, not extra
  // modules, and the Sahel Horan screens would answer empty lists. The
  // dashboard entry above stays, because it is the same screen for both.
  //
  // A super admin switching municipality switches this, because
  // useCurrentMunicipality reads the acting municipality (0117).
  if (municipality?.code === 'RMTH') {
    const keep = new Set(['/dashboard'])
    const platform = groups
      .map((g) => ({ ...g, items: g.items.filter((d) => d.to !== undefined && keep.has(d.to)) }))
      .filter((g) => g.items.length > 0)

    const byGroup = new Map<string, Dest[]>()
    let n = 0
    for (const fid of RMTH_FORM_IDS) {
      const g = rmthGroupOf(fid)
      // An unrecognised indicator shape gets its own visible group rather than
      // being dropped. A form missing from the sidebar is invisible; a form
      // under a heading nobody expected is a question someone asks.
      const key = g ?? 'other'
      n += 1
      const dest: Dest = {
        to: `/rmth/${fid}`,
        // `.short`, not `.title`: the English title is the sheet's full
        // indicator statement, which belongs on the form page and not in a
        // 238px rail. Arabic's short and title are the same string.
        labelKey: `rmth:forms.${fid}.short`,
        num: String(n).padStart(2, '0'),
      }
      byGroup.set(key, [...(byGroup.get(key) ?? []), dest])
    }
    const ordered: Group[] = [...RMTH_GROUP_ORDER, 'other']
      .filter((k) => byGroup.has(k))
      .map((k) => ({
        labelKey: k === 'other' ? 'rmth:nav.group.other' : `rmth:nav.group.${k}`,
        items: byGroup.get(k) ?? [],
      }))
    // The seven open items, after the forms: the dashboard says "not
    // computable until decided" and this is where it is decided. Every Ramtha
    // role can read it; the screen shows the Decide control to coordinators.
    ordered.push({
      labelKey: 'rmth:nav.group.definitions',
      items: [{ to: '/rmth/thresholds', labelKey: 'rmth:nav.thresholds', num: String(n + 1).padStart(2, '0') }],
    })

    return [...platform, ...ordered].filter((g) => g.items.length > 0)
  }

  // ── Khalidiyah ────────────────────────────────────────────────────────────
  //
  // The same replacement as Ramtha's: twenty-three forms under the workbook's
  // four pages (Page En / Page Ar of Khaldia_2_reviewed.xlsx), in the
  // catalogue's order, the page of each read from its definition.
  if (municipality?.code === 'KHLD') {
    const keep = new Set(['/dashboard'])
    const platform = groups
      .map((g) => ({ ...g, items: g.items.filter((d) => d.to !== undefined && keep.has(d.to)) }))
      .filter((g) => g.items.length > 0)

    const byGroup = new Map<string, Dest[]>()
    let n = 0
    for (const fid of KHLD_FORM_IDS) {
      const key = formDef(fid).group
      n += 1
      const dest: Dest = { to: `/khld/${fid}`, labelKey: `khld:forms.${fid}.short`, num: String(n).padStart(2, '0') }
      byGroup.set(key, [...(byGroup.get(key) ?? []), dest])
    }
    const ordered: Group[] = KHLD_GROUPS
      .filter((k) => byGroup.has(k))
      .map((k) => ({ labelKey: `khld:nav.group.${k}`, items: byGroup.get(k) ?? [] }))
    return [...platform, ...ordered].filter((g) => g.items.length > 0)
  }

  return groups.filter((g) => g.items.length > 0)
}

/** Flat list, for the phone tab bar and the More sheet. */
function useFlatDests(groups: Group[]): Dest[] {
  return groups.flatMap((g) => g.items)
}

const NAV_ITEM = 'flex w-full items-center gap-[11px] px-[18px] py-2 text-start'
const NAV_ITEM_ON = 'bg-ink text-bg'
const NAV_ITEM_OFF = 'text-ink hover:bg-sunken'

function NavItemBody({ dest, isActive }: { dest: Dest; isActive: boolean }) {
  const { t } = useTranslation()
  return (
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
  )
}

function NavItem({ dest, onNavigate }: { dest: Dest; onNavigate?: (() => void) | undefined }) {
  return (
    <NavLink
      to={dest.to}
      onClick={onNavigate}
      className={({ isActive }) => `${NAV_ITEM} ${isActive ? NAV_ITEM_ON : NAV_ITEM_OFF}`}
    >
      {({ isActive }) => <NavItemBody dest={dest} isActive={isActive} />}
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
  const { isSuperAdmin, municipalityId } = useAuth()
  // The one state with nothing to navigate (useNavGroups): a super admin
  // before choosing. An empty rail with no word about why reads as broken;
  // this names the state. Derived from the same condition that empties the
  // list, not from the list being empty, so it cannot say this for some
  // other reason.
  if (isSuperAdmin && !municipalityId) {
    return (
      <p className="m-0 px-[18px] pb-[5px] pt-[15px] text-[13px] leading-[1.45] text-muted">
        {t('nav:noMunicipalityNav')}
      </p>
    )
  }
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

/**
 * The rail's masthead. Two lines, 2px rule under.
 *
 * The first line is the municipality the account is working in, read from
 * the `municipality` row rather than from a locale string: the locale string
 * said "Sahel Horan" to everyone, and from 0111 there are two. A super admin
 * who has not switched into one sees "all municipalities".
 */
function Brand() {
  const { t } = useTranslation(['common', 'nav'])
  const municipality = useCurrentMunicipality()
  const name = useMunicipalityName()
  const { isSuperAdmin, municipalityId } = useAuth()
  const first = municipality
    ? name(municipality)
    : isSuperAdmin && !municipalityId
      ? t('nav:allMunicipalities')
      : t('common:orgShort')
  return (
    <div className="border-b-2 border-ink px-[18px] pb-4 pt-5">
      <div className="font-narrow text-[10.5px] font-bold uppercase tracking-[0.2em] text-muted">
        {first}
      </div>
      <div className="mt-[5px] text-[20px] font-black uppercase leading-none tracking-[-0.03em]">
        {t('appNameShort')}
      </div>
    </div>
  )
}

/**
 * Visit the public site.
 *
 * ── WHAT THIS REPLACED, AND WHY IT HAD TO CHANGE ──
 *
 * This was a Municipality / Participant segmented control. It routed to
 * `/portal`, and the participant portal was retired when `/` became the public
 * home page -- so the second segment led to "Page not found", in the header of
 * every municipal screen. A dead control in permanent chrome is worse than no
 * control: it is on screen constantly, and the only way to find out it is
 * broken is to press it.
 *
 * ── AND WHY IT IS NOT A SWITCHER AT ALL ANY MORE ──
 *
 * It used to imply two sides of one app that a person could move between. There
 * are no longer two sides: there is the Municipality's app, and there is a
 * public website that anyone can read without an account. Going to the second
 * is not switching who you are -- it is a coordinator looking at what a farmer
 * sees.
 *
 * That is a PREVIEW, and the honest treatment is the one a CMS uses: a way out
 * to the public view, and a bar on the far side saying you are previewing and
 * how to come back. Not an account switcher, which promises a change of
 * identity that never happens. The return half lives in PublicShell.
 *
 * ── NO LONGER TIED TO DEMO_MODE ──
 *
 * The old control was demo-only, and collapsed to a dead "Municipality" label
 * with the flag off, because switching between roles is a thing Phase 3 had to
 * stop. Previewing a public page is not a role change and has nothing to do
 * with identity, so it works the same either way. The public pages read
 * `v_public_opportunity`, which `anon` is granted, so a coordinator sees
 * exactly what a visitor sees.
 *
 * ── ONE LINK, THE ACTING MUNICIPALITY'S ──
 *
 * Since 0120 the public site is one page per municipality, and this is a
 * property of the municipality on screen, not a navigation menu. A super
 * admin used to get one link per municipality, listed together, which is the
 * wrong shape: acting on Ramtha there is nothing about Sahel Horan anywhere
 * else on the screen, and the links were the one place the other programme
 * bled in. So: acting on a municipality, one link naming it; a municipal
 * account, the same link for its own; no municipality chosen, no link at
 * all — there is no site to visit until one is. The chooser screen does not
 * offer both on purpose: its one job is the choice, and a super admin who
 * wants to see a public site chooses the municipality first, which is also
 * how they see everything else about it.
 *
 * Opens in a new tab for everyone. The municipal preview used to navigate the
 * same tab; the two behaviours were the two components, and one component
 * has one behaviour.
 */
function usePublicSite(): { to: string; label: string } | null {
  const { t } = useTranslation('nav')
  const municipality = useCurrentMunicipality()
  const name = useMunicipalityName()
  if (!municipality) return null
  return { to: `/${municipality.slug}`, label: t('publicSiteOf', { name: name(municipality) }) }
}

const PUBLIC_LINK_CLASS =
  'flex min-h-11 flex-none items-center gap-2 border-[1.5px] border-ink bg-bg px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink no-underline hover:bg-ink hover:text-bg'

/**
 * The one public-site control, wherever it is placed: the header from `sm`
 * up, the phone's More sheet below it. Renders nothing when no municipality
 * is acting.
 */
function PublicSiteLink({ stacked = false, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  const site = usePublicSite()
  if (!site) return null
  return (
    <a
      href={site.to}
      target="_blank"
      rel="noopener"
      onClick={onNavigate}
      // Stacked in the sheet, the label may wrap: at 320px a municipality's
      // name does not fit on one line beside the verb. In the header it is
      // one line, like the chips beside it.
      className={stacked ? `${PUBLIC_LINK_CLASS} py-2` : `${PUBLIC_LINK_CLASS} whitespace-nowrap sm:min-h-0`}
    >
      <span aria-hidden="true" className="inline-block mirror-rtl">{EXTERNAL}</span>
      {site.label}
    </a>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  // The platform dialog's state is the URL — `?platform=<section>` on
  // whatever route is underneath (platformDialogContext.ts) — read here,
  // above the routed screen, so a switch of municipality that remounts the
  // Outlet does not close it, a refresh does not lose it, and /accounts and
  // /settings can open it by redirecting to an address that names it.
  // Every write replaces the history entry: opening, closing and typing in
  // a filter are one screen's state, not places to go Back to.
  const [params, setParams] = useSearchParams()
  const open = sectionFromParams(params)
  const openDialog = useCallback(
    (section: DialogSection) => setParams((prev) => withDialogSection(prev, section), { replace: true }),
    [setParams],
  )
  const closeDialog = useCallback(() => setParams((prev) => withoutDialog(prev), { replace: true }), [setParams])
  const dialogState = useMemo(() => ({ open, openDialog, closeDialog }), [open, openDialog, closeDialog])
  return (
    <PlatformDialogContext.Provider value={dialogState}>
      <ShellFrame>{children}</ShellFrame>
      <PlatformDialog />
    </PlatformDialogContext.Provider>
  )
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['nav', 'common'])
  const groups = useNavGroups()
  const municipality = useCurrentMunicipality()
  const name = useMunicipalityName()
  const programme = useProgrammeLine()
  const { isSuperAdmin, municipalityId } = useAuth()
  // The header names the municipality on EVERY screen (plan §3.4). From the
  // municipality row, so a Ramtha admin does not read Sahel Horan's programme
  // above Ramtha's data; the locale strings remain the fallback while the
  // row is still loading.
  const headerName = municipality
    ? name(municipality)
    : isSuperAdmin && !municipalityId
      ? t('nav:allMunicipalities')
      : t('common:orgName')
  const headerProgramme = municipality
    ? programme(municipality)
    : isSuperAdmin && !municipalityId
      ? t('nav:allMunicipalitiesLine')
      : t('common:programmeLine')
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
        <div className="mt-auto">
          <AccountMenu placement="up" />
        </div>
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
              {/* A super admin is told, on every screen and at every width,
                  that the name below is the municipality they CHOSE. The
                  switcher is a control, not a statement. These two, and the
                  Accounts tab in the platform dialog, are the only marks of a super
                  admin on a municipal screen. */}
              {isSuperAdmin ? (
                <div className="truncate font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-amber">
                  {municipality ? t('nav:superAdminActingOn') : t('nav:superAdminNotActing')}
                </div>
              ) : null}
              <div className="truncate text-[15px] font-extrabold uppercase tracking-[-0.015em]">
                {headerName}
              </div>
              <div className="mt-[2px] hidden font-narrow text-[11.5px] font-medium uppercase tracking-[0.07em] text-muted sm:block">
                {headerProgramme}
              </div>
            </div>
          </div>
          <div className="flex flex-initial flex-wrap items-stretch justify-end gap-[10px]">
            <MunicipalitySwitcher />
            {/* From sm up. On a phone the More sheet carries it. */}
            <div className="hidden sm:flex">
              <PublicSiteLink />
            </div>
            {/* The header's copy of the account, for the tablet widths where
                the rail is a drawer and the foot of it is out of sight.
                Hidden on a desktop (the rail's foot has it) and on a phone
                (the More sheet does, and the header has no room). */}
            <div className="hidden md:flex lg:hidden">
              <AccountMenu placement="down" compact />
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
              <AccountMenu placement="up" onAction={() => setDrawerOpen(false)} />
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
          <TabBarItem key={d.to} dest={d} onNavigate={() => setMoreOpen(false)} />
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
            {/* The header's copy sits in a `hidden sm:flex` wrapper, so on a
                phone it does not exist. Checking how the public site looks
                on a phone is the single most likely reason to press it. */}
            {municipality ? (
              <div className="border-t border-border-default px-[18px] py-3">
                <PublicSiteLink stacked onNavigate={() => setMoreOpen(false)} />
              </div>
            ) : null}
            <AccountMenu placement="inline" onAction={() => setMoreOpen(false)} />
          </nav>
        </div>
      ) : null}
    </div>
  )
}

/** A phone tab. */
function TabBarItem({ dest, onNavigate }: { dest: Dest; onNavigate: () => void }) {
  const { t } = useTranslation()
  const cls = (active: boolean) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 border-e border-border-default px-1 py-2 text-center font-narrow text-[10.5px] font-bold uppercase tracking-[0.08em] ${
      active ? 'bg-ink text-bg' : 'text-muted'
    }`
  return (
    <NavLink to={dest.to} onClick={onNavigate} className={({ isActive }) => cls(isActive)}>
      <span className="line-clamp-2 leading-tight">{t(dest.labelKey)}</span>
    </NavLink>
  )
}
