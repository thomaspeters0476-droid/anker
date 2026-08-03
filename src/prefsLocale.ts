import { normalizeLocale, type AppLocale } from './i18n/locales'

const PREFS_KEY = 'anker-prefs'

/** Nur Locale aus Prefs — ohne storage/drawer für App-Entry. */
export function loadStoredLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return 'de'
    const data = JSON.parse(raw) as { locale?: unknown }
    return data.locale ? normalizeLocale(data.locale) : 'de'
  } catch {
    return 'de'
  }
}
