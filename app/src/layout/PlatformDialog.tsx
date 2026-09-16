import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { Dialog } from '../ui/Dialog'
import { CROSS } from '../ui/glyphs'
import { AccountsSection } from '../routes/Accounts'
import { SettingsSections } from '../routes/Settings'
import { usePlatformDialog, type DialogSection } from './platformDialogContext'

/**
 * The platform's administration, in a dialog over whatever the account is
 * looking at.
 *
 * A super admin acting on a municipality sees that municipality's product —
 * the same sidebar, the same screens its own admin has — and administers the
 * platform from here, without leaving it. Accounts and settings are not in
 * the sidebar beside the forms, because they are a different scope: mixing
 * them is how someone creates an account when they meant to open a form.
 *
 * A centred dialog, not a drawer. Until 16 September 2026 this slid in from
 * the inline-end edge, and a drawer reads as another region of the same
 * page; this is a different scope entirely. A dialog over a dimmed screen
 * says plainly that you have stepped out of the municipality to administer
 * the platform and will step back. It is `Dialog` (ui/Dialog.tsx), the same
 * primitive under the delete confirmation: overlay, Escape, focus trap,
 * scroll lock, focus return, a full-screen sheet below 768px, and the
 * dialog stack that lets the accounts tab's own confirmations (the one-time
 * password, the deactivation) own Escape while they are up.
 *
 * Two shapes, decided by capability rather than by role name:
 *   - `accounts.manage` (a super admin): "Platform administration", with an
 *     Accounts tab and a Settings tab;
 *   - anyone else: "Settings", no tabs — the language, and the staff
 *     worklists their role reaches.
 * So a municipal admin and a super admin open the same control from the same
 * menu (AccountMenu) and get the same dialog, with more or less in it. The
 * menu is the ONE way in; `/accounts` and `/settings` are addresses that
 * redirect into it (PlatformRoute). Nothing here is a permission boundary:
 * RLS on `app_user` and `guard_app_user` are, and the database refuses what
 * the role cannot do whether or not this dialog is open.
 */
export function PlatformDialog() {
  const { t } = useTranslation(['nav', 'common'])
  const { open, openDialog, closeDialog } = usePlatformDialog()
  const { role, roleResolved } = useAuth()
  const manages = can(role, 'accounts.manage')
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  // The accounts tab needs the capability; a role without it asked for
  // /accounts by address and gets the dialog it is entitled to instead —
  // and the address is corrected to say so, since the URL describes what
  // is on screen. Only once the role is KNOWN: on a cold load it is null
  // for a moment, `can(null, …)` is false, and deciding then rewrote a
  // super admin's `?platform=accounts&role=coordinator` to `settings` and
  // threw the filter away before the account had finished signing in.
  // Not a permission boundary: outside demo mode RequireCapability has
  // already refused the address, and the database refuses the writes
  // regardless (RLS on app_user, guard_app_user).
  const redirected = roleResolved && open === 'accounts' && !manages
  useEffect(() => {
    if (redirected) openDialog('settings')
  }, [redirected, openDialog])

  // Nothing until the role is known, rather than a "Settings" title that
  // turns into "Platform administration" a moment later.
  if (!open || !roleResolved) return null

  const section: DialogSection = redirected ? 'settings' : open
  const tabs: DialogSection[] = manages ? ['accounts', 'settings'] : ['settings']

  return (
    <Dialog open onClose={closeDialog} size="wide" labelledBy={titleId} initialFocusRef={closeRef}>
      <div
        className="flex flex-none items-center justify-between gap-4 border-b-2 border-ink px-4 py-3 sm:px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="min-w-0">
          {/* Whose settings these are: the platform's, never a
              municipality's. The rail's masthead names the municipality
              in this position; this names the other scope. */}
          <div className="font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
            {t('common:appNameShort')}
          </div>
          <h2
            id={titleId}
            className="text-[18px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[20px]"
          >
            {manages ? t('nav:platform.title') : t('nav:settings')}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={closeDialog}
          aria-label={t('common:actions.dismiss')}
          className="inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center border-[1.5px] border-ink text-[22px] leading-none text-ink hover:bg-ink hover:text-bg"
        >
          <span aria-hidden="true">{CROSS}</span>
        </button>
      </div>

      {tabs.length > 1 ? (
        <div role="tablist" aria-label={t('nav:platform.title')} className="flex flex-none border-b-2 border-ink">
          {tabs.map((s) => {
            const active = s === section
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => openDialog(s)}
                className={`min-h-11 flex-1 cursor-pointer px-4 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] ${
                  active ? 'bg-ink text-bg' : 'text-muted hover:bg-sunken hover:text-ink'
                }`}
              >
                {s === 'accounts' ? t('nav:accounts') : t('nav:settings')}
              </button>
            )
          })}
        </div>
      ) : null}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)' }}
      >
        {section === 'accounts' ? <AccountsSection /> : <SettingsSections />}
      </div>
    </Dialog>
  )
}
