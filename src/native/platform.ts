import { Capacitor } from '@capacitor/core'

/** True in Capacitor Android/iOS — false im Browser / PWA. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Welche Store-App gebündelt wurde (Vite-Define beim Native-Build). */
export type NativeProduct = 'anker' | 'schublade'

export function nativeProduct(): NativeProduct {
  const raw = String(import.meta.env.VITE_NATIVE_PRODUCT ?? 'anker').toLowerCase()
  return raw === 'schublade' ? 'schublade' : 'anker'
}

/** Startroute der jeweiligen Store-App. */
export function nativeHomePath(): '/app' | '/schublade' {
  return nativeProduct() === 'schublade' ? '/schublade' : '/app'
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
