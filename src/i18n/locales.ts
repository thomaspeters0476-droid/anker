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
  return 'de'
}

/** Einmalig: Browser-Hinweis nur de/en */
export function detectBrowserLocale(): AppLocale {
  try {
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language]
    for (const raw of langs) {
      const base = String(raw).toLowerCase().split('-')[0]
      if (base === 'en') return 'en'
      if (base === 'de') return 'de'
    }
  } catch {
    /* ignore */
  }
  return 'de'
}
