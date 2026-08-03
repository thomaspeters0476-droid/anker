import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeLocale, type AppLocale } from './locales'

type Ns = 'common' | 'buddy' | 'handbook'

const nsLoaders: Record<
  AppLocale,
  Record<Ns, () => Promise<{ default: Record<string, unknown> }>>
> = {
  de: {
    common: () => import('./locales/de/common.json'),
    buddy: () => import('./locales/de/buddy.json'),
    handbook: () => import('./locales/de/handbook.json'),
  },
  en: {
    common: () => import('./locales/en/common.json'),
    buddy: () => import('./locales/en/buddy.json'),
    handbook: () => import('./locales/en/handbook.json'),
  },
}

const loaded = new Set<string>()

async function loadBundle(lng: AppLocale, ns: Ns) {
  const key = `${lng}:${ns}`
  if (loaded.has(key) || i18n.hasResourceBundle(lng, ns)) {
    loaded.add(key)
    return
  }
  const mod = await nsLoaders[lng][ns]()
  i18n.addResourceBundle(lng, ns, mod.default, true, true)
  loaded.add(key)
}

let started = false
let boot: Promise<typeof i18n> | null = null

async function ensureBundles(lng: AppLocale, namespaces: Ns[]) {
  const need = new Set<AppLocale>([lng])
  if (lng !== 'de') need.add('de')
  await Promise.all(
    [...need].flatMap((l) => namespaces.map((ns) => loadBundle(l, ns))),
  )
}

/**
 * Sync-shim: startet Boot falls nötig. Volle Bundles erst via `bootI18n` /
 * `setAppLocale` / `ensureNs`. Buddy/Sync dürfen das oft aufrufen.
 */
export function ensureI18n(locale?: AppLocale) {
  if (!started) {
    const lng = normalizeLocale(locale ?? 'de')
    void i18n.use(initReactI18next).init({
      resources: {},
      lng,
      fallbackLng: 'de',
      supportedLngs: ['de', 'en'],
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      defaultNS: 'common',
      ns: ['common', 'buddy', 'handbook'],
      partialBundledLanguages: true,
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: false },
    })
    started = true
    boot = ensureBundles(lng, ['common']).then(() => i18n)
  } else if (locale) {
    const next = normalizeLocale(locale)
    if (normalizeLocale(i18n.language) !== next) {
      void setAppLocale(next)
    }
  }
  return i18n
}

/** App-Entry: Locale + common laden, bevor UI mit Übersetzungen rendert. */
export async function bootI18n(locale?: AppLocale) {
  const lng = normalizeLocale(locale ?? 'de')
  ensureI18n(lng)
  await (boot ?? ensureBundles(lng, ['common']))
  if (normalizeLocale(i18n.language) !== lng) {
    await i18n.changeLanguage(lng)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
  return i18n
}

/** Buddy-/Handbook-Namespace nachladen. */
export async function ensureNs(ns: Ns, locale?: AppLocale) {
  const lng = normalizeLocale(locale ?? i18n.language ?? 'de')
  ensureI18n(lng)
  await ensureBundles(lng, [ns])
}

export async function setAppLocale(locale: AppLocale) {
  const next = normalizeLocale(locale)
  ensureI18n(next)
  await ensureBundles(next, ['common'])
  // Bereits geladene Extra-NS für neue Sprache nachziehen
  const extra: Ns[] = []
  if (loaded.has(`${normalizeLocale(i18n.language)}:buddy`) || loaded.has('de:buddy')) {
    extra.push('buddy')
  }
  if (
    loaded.has(`${normalizeLocale(i18n.language)}:handbook`) ||
    loaded.has('de:handbook')
  ) {
    extra.push('handbook')
  }
  if (extra.length) await ensureBundles(next, extra)
  if (normalizeLocale(i18n.language) !== next) {
    await i18n.changeLanguage(next)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next
  }
}

export default i18n
