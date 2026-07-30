export const APP_LOCALES = ['de', 'en'] as const
export type AppLocale = (typeof APP_LOCALES)[number]

/** Später: fr, es, it, pl, nl, pt, tr — gleiche Key-Struktur */
export const PLANNED_LOCALES = ['fr', 'es', 'it', 'pl', 'nl', 'pt', 'tr'] as const

export const LOCALE_LABELS: Record<AppLocale, string> = {
  de: 'Deutsch',
  en: 'English',
}

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'de' || value === 'en'
}

export function normalizeLocale(value: unknown): AppLocale {
  if (isAppLocale(value)) return value
  if (typeof value === 'string') {
    const base = value.toLowerCase().split(/[-_]/)[0]
    if (base === 'en') return 'en'
    if (base === 'de') return 'de'
  }
  return 'de'
}

/** App-Standard ist Deutsch — Browser-Locale nur optional (z. B. spätere „System“-Option). */
export function detectBrowserLocale(): AppLocale {
  return 'de'
}
