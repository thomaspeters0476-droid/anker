import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  detectBrowserLocale,
  normalizeLocale,
  type AppLocale,
} from './locales'
import deCommon from './locales/de/common.json'
import deBuddy from './locales/de/buddy.json'
import enCommon from './locales/en/common.json'
import enBuddy from './locales/en/buddy.json'

const resources = {
  de: { common: deCommon, buddy: deBuddy },
  en: { common: enCommon, buddy: enBuddy },
} as const

let started = false

export function ensureI18n(locale?: AppLocale) {
  const lng = normalizeLocale(locale ?? detectBrowserLocale())
  if (!started) {
    void i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'de',
      defaultNS: 'common',
      ns: ['common', 'buddy'],
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    started = true
  } else if (i18n.language !== lng) {
    void i18n.changeLanguage(lng)
  }
  return i18n
}

export async function setAppLocale(locale: AppLocale) {
  ensureI18n(locale)
  await i18n.changeLanguage(locale)
}

export default i18n
