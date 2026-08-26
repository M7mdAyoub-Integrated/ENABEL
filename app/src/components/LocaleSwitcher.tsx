import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES } from '../i18n'

const LABEL: Record<string, string> = { en: 'EN', ar: 'عربي' }

/**
 * The segmented language chip from the prototype header.
 *
 * The prototype draws both halves but leaves the Arabic one dead, labelled
 * "عربي · soon", because that mock never had a second locale. This build does,
 * so both halves are live buttons and the active one takes the black fill.
 * Flips <html dir> via useDirection, which App calls at the root.
 *
 * `tone="invert"` is the producer portal's variant: the portal sits on teal, so
 * the chip is drawn in cream on the accent instead of black on cream.
 */
export function LocaleSwitcher({ tone = 'default' }: { tone?: 'default' | 'invert' }) {
  const { t, i18n } = useTranslation('common')
  const current = i18n.resolvedLanguage ?? i18n.language

  const invert = tone === 'invert'
  const frame = invert ? 'border-bg' : 'border-ink'
  const on = invert ? 'bg-bg text-teal' : 'bg-ink text-bg'
  const off = invert ? 'bg-transparent text-bg/60 hover:text-bg' : 'bg-raised text-ghost hover:text-muted'

  return (
    <div
      className={`flex flex-none border-[1.5px] ${frame}`}
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LOCALES.map((loc, i) => {
        const active = loc === current
        return (
          <button
            key={loc}
            type="button"
            lang={loc}
            aria-current={active ? 'true' : undefined}
            onClick={() => void i18n.changeLanguage(loc)}
            className={`min-h-11 cursor-pointer px-[11px] py-[5px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] sm:min-h-0 ${
              i > 0 ? `border-s-[1.5px] ${frame}` : ''
            } ${active ? on : off}`}
          >
            {LABEL[loc] ?? loc.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

export default LocaleSwitcher
