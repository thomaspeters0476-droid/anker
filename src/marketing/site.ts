export const SITE = {
  name: 'Tagesanker',
  url: 'https://tagesanker.de',
  email: 'info@tagesanker.de',
  tagline: 'Eine Sache. Realistisch. Zurückfinden.',
  description:
    'Tagesanker hilft dir, den Tag mit einer Sache nach der anderen zu halten — ohne Scores, ohne Streaks, ohne Druck.',
} as const

/** Marketing-Produkt „Die Schublade“ — App unter /schublade, Landing unter /die-schublade */
export const SCHUBLADE = {
  name: 'Die Schublade',
  path: '/die-schublade',
  appPath: '/schublade',
  tagline: 'Sicher weg, nicht weg.',
  description:
    'Die Schublade: ablegen, in Schritte zerlegen, später einen greifen — Vorrat ohne Chaos, einzeln nutzbar neben dem Tagesanker.',
} as const

export const PROVIDER = {
  name: 'Karina Peters',
  legalForm: 'Einzelunternehmen',
  street: 'Im Krähwinkel 10',
  zipCity: '52441 Linnich',
  email: 'info@tagesanker.de',
  vatId: 'DE323878495',
  taxId: '213/5078/2938',
} as const

/** App-UIs — nicht in der Suche, Canonical nur für Marketing-Seiten. */
export function isAppShellPath(pathname: string): boolean {
  return (
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/schublade' ||
    pathname.startsWith('/schublade/')
  )
}

export function canonicalUrl(pathname = '/'): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/' ? `${SITE.url}/` : `${SITE.url}${path}`
}

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string,
): void {
  const selector = `meta[${attr}="${key}"]`
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Canonical + robots je Pfad — sonst bleibt im index.html die Startseite als Canonical. */
export function applyPublicSeo(pathname: string): void {
  const url = canonicalUrl(pathname)
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (link) link.setAttribute('href', url)
  upsertMeta('property', 'og:url', url)
  upsertMeta(
    'name',
    'robots',
    isAppShellPath(pathname) ? 'noindex, nofollow' : 'index, follow',
  )
}

export function setPageMeta(
  title: string,
  description: string,
  opts?: { noIndex?: boolean },
) {
  document.title = title
  const el = document.querySelector('meta[name="description"]')
  if (el) el.setAttribute('content', description)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  if (typeof window !== 'undefined') {
    const url = canonicalUrl(window.location.pathname)
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (link) link.setAttribute('href', url)
    upsertMeta('property', 'og:url', url)
  }
  if (opts?.noIndex) {
    upsertMeta('name', 'robots', 'noindex, nofollow')
  }
}
