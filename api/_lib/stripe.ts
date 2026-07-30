import Stripe from 'stripe'

/** Server-only Stripe client. Returns null if not configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key, {
    apiVersion: '2025-06-30.basil',
    typescript: true,
  })
}

export function checkoutEnabled(): boolean {
  return process.env.STRIPE_CHECKOUT_ENABLED === 'true'
}

/** Internal smoke-test: header `x-tagesanker-checkout-preview: <token>` */
export function previewTokenOk(reqToken: string | undefined): boolean {
  const expected = process.env.STRIPE_CHECKOUT_PREVIEW_TOKEN?.trim()
  if (!expected) return false
  return Boolean(reqToken && reqToken === expected)
}

export function siteOrigin(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel}`
  return 'https://tagesanker.de'
}

export type Interval = 'month' | 'year'

export function priceIdFor(interval: Interval): string | null {
  if (interval === 'year') {
    return process.env.STRIPE_PRICE_YEARLY?.trim() || null
  }
  return process.env.STRIPE_PRICE_MONTHLY?.trim() || null
}
