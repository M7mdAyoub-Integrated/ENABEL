import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ICU from 'i18next-icu'

import enCommon from '../locales/en/common.json'
import enNav from '../locales/en/nav.json'
import enForms from '../locales/en/forms.json'
import enIndicators from '../locales/en/indicators.json'
import enSurvey from '../locales/en/survey.json'
import enErrors from '../locales/en/errors.json'
import enPortal from '../locales/en/portal.json'
import enAuth from '../locales/en/auth.json'

import arCommon from '../locales/ar/common.json'
import arNav from '../locales/ar/nav.json'
import arForms from '../locales/ar/forms.json'
import arIndicators from '../locales/ar/indicators.json'
import arSurvey from '../locales/ar/survey.json'
import arErrors from '../locales/ar/errors.json'
import arPortal from '../locales/ar/portal.json'
import arAuth from '../locales/ar/auth.json'

export const SUPPORTED_LOCALES = ['en', 'ar'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const NAMESPACES = [
  'common',
  'nav',
  'forms',
  'indicators',
  'survey',
  'errors',
  'portal',
  'auth',
] as const

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    forms: enForms,
    indicators: enIndicators,
    survey: enSurvey,
    errors: enErrors,
    portal: enPortal,
    auth: enAuth,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    forms: arForms,
    indicators: arIndicators,
    survey: arSurvey,
    errors: arErrors,
    portal: arPortal,
    auth: arAuth,
  },
} as const

void i18n
  // ICU MessageFormat. This is what gives Arabic all six plural categories
  // (zero/one/two/few/many/other). A `count === 1 ? x : y` ternary is wrong in
  // Arabic and reads as broken -- see build plan section 3.
  .use(ICU)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: 'common',

    // D-4: the users are Jordanian, so Arabic is the default. English is
    // reachable by toggle and is the fallback when an Arabic key is missing.
    fallbackLng: { ar: ['en'], default: ['en'] },
    load: 'languageOnly',

    detection: {
      order: ['querystring', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      // Section 6 of the build plan bans localStorage/sessionStorage outside
      // Supabase Auth, so the detector is not allowed to cache there.
      caches: [],
    },

    interpolation: {
      // React escapes for us.
      escapeValue: false,
    },

    // ── Never render blank ────────────────────────────────────────────────
    // A missing key must be loud in the console and still show something
    // readable on screen. Blank text in a donor-facing report is worse than an
    // untranslated string, because nobody notices it.
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key) => {
      console.warn(
        `[i18n] missing key "${ns}:${key}" for locale(s) ${Array.isArray(lngs) ? lngs.join(', ') : String(lngs)} — falling back.`,
      )
    },
    parseMissingKeyHandler: (key: string) => key,
    returnEmptyString: false,
  })

// Dev-only handle so the locale rig can be poked from the browser console
// (missing-key behaviour, plural categories, formatter output) without adding a
// UI for it. Stripped from production builds by the DEV guard.
if (import.meta.env.DEV) {
  ;(window as unknown as { i18n: typeof i18n }).i18n = i18n
}

export default i18n
