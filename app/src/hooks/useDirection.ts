import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export type Direction = 'ltr' | 'rtl'

/** Locales written right-to-left. Extend here, not at each call site. */
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])

export function directionForLocale(locale: string): Direction {
  return RTL_LOCALES.has(locale.split('-')[0] ?? '') ? 'rtl' : 'ltr'
}

/**
 * Keeps `dir` and `lang` on <html> in sync with the active locale.
 *
 * On <html>, not on a wrapper div -- see build plan section 3. Setting it on a
 * wrapper leaves portals, dialogs, tooltips and the scrollbar on the wrong
 * side, because those render outside the wrapper. It also breaks the
 * `html:lang(ar)` font switch in index.css.
 */
export function useDirection(): { direction: Direction; locale: string } {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  const direction = directionForLocale(locale)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('dir', direction)
    root.setAttribute('lang', locale)
  }, [direction, locale])

  return { direction, locale }
}
