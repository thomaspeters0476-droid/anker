import { Capacitor } from '@capacitor/core'

/** True in Capacitor Android/iOS — false im Browser / PWA. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Produktions-Origin für API und Deep-Links aus der Store-App. */
export const NATIVE_SITE_ORIGIN = 'https://tagesanker.de'

/**
 * Relativer `/api/...`-Pfad bleibt im Browser.
 * In der nativen App zeigt er auf die Live-Website (gebündelte UI, remote API).
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (!isNativeApp()) return p
  return `${NATIVE_SITE_ORIGIN}${p}`
}
