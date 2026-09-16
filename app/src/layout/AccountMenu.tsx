import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { useCurrentMunicipality, useMunicipalityName } from '../data/municipalities'
import { usePlatformDialog } from './platformDialogContext'

/**
 * Who is signed in, and the two things they can do about it.
 *
 * The chip names the account, the role and the municipality the account is
 * working in — fixed for a municipal account, chosen for a super admin, and
 * a super admin who has lost track of which one they chose enters data
 * against the wrong municipality, so it is on every screen at every width:
 * the foot of the rail on a desktop, the header on a tablet, the foot of the
 * "More" sheet on a phone.
 *
 * The chip is a button. It opens a menu carrying the same identity, then the
 * platform's administration — a dialog over the screen — and Sign out. The
 * administration item is the ONE way into that dialog (the addresses
 * /accounts and /settings redirect into it): it belongs to the person, not
 * to the municipality being looked at, so it lives in the control that
 * already carries the identity and nowhere in the municipality's sidebar.
 * One control for every role: for an account that manages accounts the item
 * reads "Platform administration" and opens on the Accounts tab; for anyone
 * else it reads "Settings" and opens a dialog with no tabs. The same
 * capability test titles the dialog, so the item and what it opens cannot
 * disagree. Nothing here is a permission boundary; the dialog decides what
 * to show by capability and the database refuses what the role cannot do.
 *
 * Signing out lands on the public home page, never on the sign-in form: a
 * coordinator leaving the app should see what a resident sees, and nothing
 * on that page mentions an account. In demo mode a reload signs in again
 * (src/demo/demoMode.ts).
 *
 * `placement`: where the menu appears relative to the chip. `up` for the
 * foot of the rail and the drawer, `down` for the header, and `inline` for
 * the phone sheet, where a popover would fight the sheet's own scrolling and
 * the menu simply expands in place.
 */
export function AccountMenu({
  placement,
  compact = false,
  onAction,
}: {
  placement: 'up' | 'down' | 'inline'
  compact?: boolean
  /** Called when an item is chosen: the sheet or drawer holding the menu closes itself. */
  onAction?: () => void
}) {
  const { t } = useTranslation(['auth', 'nav'])
  const { email, role, signOut, isSuperAdmin, municipalityId } = useAuth()
  const municipality = useCurrentMunicipality()
  const name = useMunicipalityName()
  const navigate = useNavigate()
  const { openDialog } = usePlatformDialog()
  const manages = can(role, 'accounts.manage')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  // A click anywhere else, or Escape, closes the menu. Focus goes back to
  // the chip on Escape so a keyboard user is not left in a closed menu.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        chipRef.current?.focus()
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

  const menuClass =
    placement === 'inline'
      ? 'border-t border-border-default'
      : `absolute z-[8] border-2 border-ink bg-bg ${
          placement === 'up'
            ? 'inset-x-0 bottom-full mb-[-2px]'
            : 'end-0 top-full mt-[-2px] w-[min(280px,calc(100vw-2rem))]'
        }`

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={chipRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'flex min-h-11 cursor-pointer items-center gap-2 border-[1.5px] border-ink bg-bg px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink hover:bg-sunken sm:min-h-0'
            : `flex w-full cursor-pointer items-start gap-3 border-t-2 border-ink px-[18px] py-[14px] text-start hover:bg-sunken ${
                open ? 'bg-sunken' : ''
              }`
        }
      >
        {compact ? (
          <span>{roleLabel}</span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              {t('nav:signedIn')}
            </span>
            <span className="mt-[3px] block text-[13.5px] font-bold leading-[1.25] tracking-[-0.01em]">
              {roleLabel}
            </span>
            <span
              className="mt-[3px] block truncate text-[12px] text-muted"
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {email}
            </span>
            {where ? (
              <span className="mt-[6px] block font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink">
                <span className="text-dim">{isSuperAdmin ? t('nav:actingOn') : t('nav:workingIn')}</span>{' '}
                {where}
              </span>
            ) : null}
          </span>
        )}
        <Chevron up={placement === 'up' ? !open : open} />
      </button>

      {open ? (
        <div id={menuId} role="menu" aria-label={t('nav:accountMenu.label')} className={menuClass}>
          {/* The identity in full, under the compact chip only: that chip
              shows the role alone, and the menu is where the account and
              the municipality are read. The full chip already says all of
              it directly above the menu. */}
          {compact ? (
            <div className="border-b border-border-default px-[18px] py-3">
              <div className="text-[13.5px] font-bold leading-[1.25]">{roleLabel}</div>
              <div className="mt-[2px] truncate text-[12px] text-muted" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {email}
              </div>
              {where ? (
                <div className="mt-[6px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink">
                  <span className="text-dim">{isSuperAdmin ? t('nav:actingOn') : t('nav:workingIn')}</span>{' '}
                  {where}
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              // The dialog returns focus to whatever had it when it opened;
              // this item is about to unmount, so hand focus to the chip
              // first or the dialog would return it to nothing.
              chipRef.current?.focus()
              onAction?.()
              openDialog(manages ? 'accounts' : 'settings')
            }}
            className="flex min-h-11 w-full cursor-pointer items-center px-[18px] text-start text-sm font-medium text-ink hover:bg-ink hover:text-bg"
          >
            {manages ? t('nav:platform.title') : t('nav:settings')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onAction?.()
              void signOut().then(() => navigate('/', { replace: true }))
            }}
            className="flex min-h-11 w-full cursor-pointer items-center border-t border-border-default px-[18px] text-start text-sm font-medium text-ink hover:bg-ink hover:text-bg"
          >
            {t('auth:signOut')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** The disclosure mark on the chip. Points where the menu will open. */
function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`mt-[3px] flex-none ${up ? 'rotate-180' : ''}`}
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
