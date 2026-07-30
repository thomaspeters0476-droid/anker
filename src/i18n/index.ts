import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeLocale, type AppLocale } from './locales'
import deCommon from './locales/de/common.json'
import deBuddy from './locales/de/buddy.json'
import deHandbook from './locales/de/handbook.json'
import enCommon from './locales/en/common.json'
import enBuddy from './locales/en/buddy.json'
import enHandbook from './locales/en/handbook.json'

const resources = {
  de: { common: deCommon, buddy: deBuddy, handbook: deHandbook },
  en: { common: enCommon, buddy: enBuddy, handbook: enHandbook },
} as const

let started = false

/**
 * Init once. Without `locale`, never override the active language
 * (Buddy/Sync call this often — must not reset to browser EN).
 */
export function ensureI18n(locale?: AppLocale) {
  if (!started) {
    const lng = normalizeLocale(locale ?? 'de')
    void i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'de',
      defaultNS: 'common',
      ns: ['common', 'buddy', 'handbook'],
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    started = true
    return i18n
  }
  if (locale && normalizeLocale(i18n.language) !== locale) {
    void i18n.changeLanguage(locale)
  }
  return i18n
}

export async function setAppLocale(locale: AppLocale) {
  ensureI18n(locale)
  await i18n.changeLanguage(locale)
}

export default i18n
