import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { CROSS } from '../ui/glyphs'
import { AccountsSection } from '../routes/Accounts'
import { SettingsSections } from '../routes/Settings'
import { usePlatformPanel, type PanelSection } from './platformPanelContext'

/**
 * The platform's administration, in a panel over whatever the account is
 * looking at.
 *
 * A super admin acting on a municipality sees that municipality's product —
 * the same sidebar, the same screens its own admin has — and administers the
 * platform from here, without leaving it. Accounts and settings are not in
 * the sidebar beside the forms, because they are a different scope: mixing
 * them is how someone creates an account when they meant to open a form.
 *
 * Two shapes, decided by capability rather than by role name:
 *   - `accounts.manage` (a super admin): "Platform administration", with an
 *     Accounts tab and a Settings tab;
 *   - anyone else: "Settings", no tabs — the language, and the staff
 *     worklists their role reaches.
 * So a municipal admin and a super admin open the same control from the same
 * menu and get the same panel, with more or less in it.
 *
 * A dialog: Escape closes it, focus lands on the close control, the page
 * behind stops scrolling, and focus goes back where it was. The accounts
 * tab opens its own modals (the one-time password, the deactivation) inside
 * this one; Escape is left to them while one is open, or a single key would
 * close both.
 */
export function PlatformPanel() {
  const { t } = useTranslation(['nav', 'common'])
  const { open, openPanel, closePanel } = usePlatformPanel()
  const { role } = useAuth()
  const manages = can(role, 'accounts.manage')
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // A modal opened from inside the panel owns Escape while it is up.
      if (panelRef.current?.querySelector('[role="dialog"]')) return
      closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused.current?.focus()
    }
  }, [open, closePanel])

  if (!open) return null

  // The accounts tab needs the capability; a role without it asked for
  // /accounts by address and gets the panel it is entitled to instead.
  const section: PanelSection = open === 'accounts' && !manages ? 'settings' : open
  const tabs: PanelSection[] = manages ? ['accounts', 'settings'] : ['settings']

  return (
    <div className="fixed inset-0 z-50" style={{ animation: 'fin 0.1s ease-out' }}>
      <button
        type="button"
        aria-label={t('common:actions.dismiss')}
        onClick={closePanel}
        className="absolute inset-0 bg-ink/55"
      />
      {/* 2px rule down the inline-start edge, the rail's language; full
          width on a phone, a wide panel from md so the accounts table has
          room for its five columns. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 end-0 flex w-full flex-col border-s-2 border-ink bg-bg md:w-[min(760px,calc(100vw-48px))]"
      >
        <div
          className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-3 sm:px-6"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <div className="min-w-0">
            {/* Whose settings these are: the platform's, never a
                municipality's. The rail's masthead names the municipality
                in this position; this names the other scope. */}
            <div className="font-narrow text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              {t('common:appNameShort')}
            </div>
            <h2 id={titleId} className="text-[18px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[20px]">
              {manages ? t('nav:platform.title') : t('nav:settings')}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closePanel}
            aria-label={t('common:actions.dismiss')}
            className="inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center border-[1.5px] border-ink text-[22px] leading-none text-ink hover:bg-ink hover:text-bg"
          >
            <span aria-hidden="true">{CROSS}</span>
          </button>
        </div>

        {tabs.length > 1 ? (
          <div role="tablist" aria-label={t('nav:platform.title')} className="flex border-b-2 border-ink">
            {tabs.map((s) => {
              const active = s === section
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => openPanel(s)}
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
          className="flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)' }}
        >
          {section === 'accounts' ? <AccountsSection /> : <SettingsSections />}
        </div>
      </div>
    </div>
  )
}
