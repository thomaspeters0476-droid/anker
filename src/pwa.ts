/** PWA / Home-Bildschirm Hilfen */

export type ProductShell = 'anker' | 'schublade'

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || iosStandalone
}

export function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isLikelyAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/** Welche Produkt-PWA zur aktuellen URL gehört */
export function productShellFromPath(pathname = window.location.pathname): ProductShell {
  return pathname.startsWith('/schublade') ? 'schublade' : 'anker'
}

/**
 * Manifest + Meta für getrennte Installationen (zwei Homescreen-Apps, ein Origin).
 * Früh in index.html und erneut beim Routenwechsel aufrufen.
 */
export function applyProductShell(shell: ProductShell): void {
  if (typeof document === 'undefined') return

  const isDrawer = shell === 'schublade'
  const manifestHref = isDrawer
    ? '/manifest-schublade.webmanifest'
    : '/manifest.webmanifest'
  const title = isDrawer ? 'Die Schublade' : 'Tagesanker'
  const description = isDrawer
    ? 'Ablegen, zerlegen, Schritte holen — sicher weg, nicht weg.'
    : 'Tagesanker hilft dir, den Tag mit einer Sache nach der anderen zu halten — ohne Scores, ohne Streaks, ohne Druck.'

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== manifestHref) {
    link.setAttribute('href', manifestHref)
  }

  const appleTitle = document.querySelector(
    'meta[name="apple-mobile-web-app-title"]',
  )
  if (appleTitle) appleTitle.setAttribute('content', title)

  const desc = document.querySelector('meta[name="description"]')
  if (desc) desc.setAttribute('content', description)

  document.title = isDrawer
    ? 'Die Schublade — Ablegen & vorbereiten'
    : 'Tagesanker — Eine Sache. Realistisch. Zurückfinden.'
}
