import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { MunicipalitySwitcher } from '../components/MunicipalitySwitcher'
import { useCurrentMunicipality, useMunicipalityName } from '../data/municipalities'
import { EXTERNAL } from '../ui/glyphs'
import { usePlatformDialog } from './platformDialogContext'

/**
 * The account: one icon at the end of the header, and everything that belongs
 * to the person rather than to the screen behind a press of it.
 *
 * ── WHY AN ICON IN THE HEADER ──
 *
 * Until 26 September 2026 the account was a chip at the foot of the rail on a
 * desktop, in the header on a tablet and at the foot of the "More" sheet on a
 * phone, with the language, the public-site link and a super admin's
 * municipality chooser as separate chips in the header. In Arabic the rail
 * mirrors to the right, so the chip sat in the bottom-right corner — exactly
 * where the hosting provider draws its badge, over the account's name. The
 * header's end is top-right in English and top-left in Arabic (a logical
 * `end`, flipped by <html dir>), clear of anything pinned to the bottom, and
 * one place at every width is one place to look.
 *
 * ── WHAT IT OPENS ──
 *
 * In order: who is signed in (role, email, the municipality); for a super
 * admin, the municipality they are acting on — a choice, so here and not on
 * every screen; the language; the public site of the municipality on screen;
 * the platform's administration; Sign out.
 *
 * The header still names the municipality on every screen, and tells a super
 * admin it is the one they CHOSE (ShellFrame): moving the chooser in here
 * does not move the statement of what was chosen.
 *
 * The administration item is the ONE way into that dialog (the addresses
 * /accounts and /settings redirect into it): it belongs to the person, not
 * to the municipality being looked at. For an account that manages accounts
 * it reads "Platform administration" and opens on the Accounts tab; for
 * anyone else it reads "Settings" and opens a dialog with no tabs. The same
 * capability test titles the dialog, so the item and what it opens cannot
 * disagree. Nothing here is a permission boundary; the dialog decides what
 * to show by capability and the database refuses what the role cannot do.
 *
 * Signing out lands on the public home page, never on the sign-in form: a
 * coordinator leaving the app should see what a resident sees, and nothing
 * on that page mentions an account. In demo mode a reload signs in again
 * (src/demo/demoMode.ts).
 *
 * ── A DISCLOSURE, NOT role="menu" ──
 *
 * The panel holds a select and a two-button language group. A `menu` promises
 * arrow-key navigation between items, which a select inside it would break;
 * a button that shows and hides a panel of ordinary controls is what this is,
 * and Tab moves through it. A click outside or Escape closes it; Escape hands
 * focus back to the icon so a keyboard user is not left in a closed panel.
 * Changing the language keeps it open: the panel moves to the other corner
 * with the icon, and the person sees the change they made.
 */
export function AccountMenu() {
  const { t } = useTranslation(['auth', 'nav', 'common'])
  const { email, role, signOut, isSuperAdmin, municipalityId } = useAuth()
  const municipality = useCurrentMunicipality()
  const name = useMunicipalityName()
  const site = usePublicSite()
  const navigate = useNavigate()
  const { openDialog } = usePlatformDialog()
  const manages = can(role, 'accounts.manage')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!email) return null

  const where = municipality
    ? name(municipality)
    : isSuperAdmin && !municipalityId
      ? t('nav:allMunicipalities')
      : null
  const roleLabel = role ? t(`auth:role.${role}`) : t('auth:role.none')

  const section = 'border-b border-border-default px-[18px] py-3'
  const item =
    'flex min-h-11 w-full cursor-pointer items-center gap-2 px-[18px] py-2 text-start text-sm font-medium text-ink no-underline hover:bg-ink hover:text-bg'

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('nav:accountMenu.label')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-11 flex-none cursor-pointer items-center justify-center border-[1.5px] border-ink ${
          open ? 'bg-ink text-bg' : 'bg-bg text-ink hover:bg-sunken'
        }`}
      >
        <PersonIcon />
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={t('nav:accountMenu.label')}
          className="absolute end-0 top-full z-[8] mt-2 max-h-[calc(100dvh-10rem)] w-[min(300px,calc(100vw-2rem))] overflow-y-auto border-2 border-ink bg-bg md:max-h-[calc(100dvh-6rem)]"
        >
          <div className={section}>
            <div className="font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              {t('nav:signedIn')}
            </div>
            <div className="mt-[3px] text-[13.5px] font-bold leading-[1.25] tracking-[-0.01em]">{roleLabel}</div>
            {/* The address reads left to right in either language; the line
                it sits on aligns with the rest of the panel. */}
            <div className="mt-[3px] truncate text-[12px] text-muted">
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {email}
              </span>
            </div>
            {where ? (
              <div className="mt-[6px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink">
                <span className="text-dim">{isSuperAdmin ? t('nav:actingOn') : t('nav:workingIn')}</span> {where}
              </div>
            ) : null}
          </div>

          {isSuperAdmin ? (
            <div className={section}>
              <MunicipalitySwitcher onSwitched={() => setOpen(false)} />
            </div>
          ) : null}

          <div className={`${section} flex items-center justify-between gap-3`}>
            <span className="font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              {t('common:language.label')}
            </span>
            <LocaleSwitcher />
          </div>

          {site ? (
            <a
              href={site.to}
              target="_blank"
              rel="noopener"
              onClick={() => setOpen(false)}
              className={`${item} border-b border-border-default`}
            >
              <span aria-hidden="true" className="inline-block flex-none mirror-rtl">
                {EXTERNAL}
              </span>
              <span>{site.label}</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              // The dialog returns focus to whatever had it when it opened;
              // this item is about to unmount, so hand focus to the icon
              // first or the dialog would return it to nothing.
              buttonRef.current?.focus()
              openDialog(manages ? 'accounts' : 'settings')
            }}
            className={item}
          >
            {manages ? t('nav:platform.title') : t('nav:settings')}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void signOut().then(() => navigate('/', { replace: true }))
            }}
            className={`${item} border-t border-border-default`}
          >
            {t('auth:signOut')}
          </button>
        </div>
      ) : null}
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
 * Opens in a new tab for everyone: the app stays where it was.
 */
function usePublicSite(): { to: string; label: string } | null {
  const { t } = useTranslation('nav')
  const municipality = useCurrentMunicipality()
  const name = useMunicipalityName()
  if (!municipality) return null
  return { to: `/${municipality.slug}`, label: t('publicSiteOf', { name: name(municipality) }) }
}

/** A head and shoulders, drawn in the header's 1.75 stroke. */
function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.75 17c0-3.2 2.8-5.25 6.25-5.25S16.25 13.8 16.25 17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
