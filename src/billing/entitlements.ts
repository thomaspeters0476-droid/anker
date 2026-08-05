import { getSession } from '../sync/auth'
import { apiUrl } from '../native/platform'
import {
  cacheEntitlements,
  deniedEntitlementsAccess,
  getCachedEntitlements,
  type AboTier,
  type EntitlementsState,
} from './entitlementsCache'

export type { AboTier, EntitlementsState } from './entitlementsCache'
export {
  getCachedEntitlements,
  clearEntitlementsCache,
  deniedEntitlementsAccess,
} from './entitlementsCache'

function parseEntitlementsPayload(data: {
  enforced?: boolean
  tier?: AboTier | null
  status?: string
  canUseTagesanker?: boolean
  canUseSchublade?: boolean
  hasPortal?: boolean
}): EntitlementsState {
  const enforced = Boolean(data.enforced)
  return {
    enforced,
    tier: data.tier ?? null,
    status: data.status || 'none',
    canUseTagesanker: enforced
      ? data.canUseTagesanker === true
      : data.canUseTagesanker !== false,
    canUseSchublade: enforced
      ? data.canUseSchublade === true
      : data.canUseSchublade !== false,
    hasPortal: Boolean(data.hasPortal),
    updatedAt: Date.now(),
  }
}

/**
 * Immer vom Server laden — auch ohne Session (nur `enforced` + Unsigned-Rechte).
 * Bei Fehler: Cache behalten wenn vorhanden, sonst fail-closed.
 */
export async function refreshEntitlements(): Promise<EntitlementsState> {
  const session = await getSession()
  try {
    const headers: HeadersInit = {}
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    const res = await fetch(apiUrl('/api/entitlements'), { headers })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      enforced?: boolean
      tier?: AboTier | null
      status?: string
      canUseTagesanker?: boolean
      canUseSchublade?: boolean
      hasPortal?: boolean
    } | null
    if (!res.ok || !data?.ok) {
      const cached = getCachedEntitlements()
      if (cached.updatedAt > 0) return cached
      return deniedEntitlementsAccess()
    }
    const next = parseEntitlementsPayload(data)
    cacheEntitlements(next)
    return next
  } catch {
    const cached = getCachedEntitlements()
    if (cached.updatedAt > 0) return cached
    return deniedEntitlementsAccess()
  }
}

export type CheckoutProduct = AboTier
export type CheckoutInterval = 'month' | 'year'

function isTrustedStripeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.stripe.com')
  } catch {
    return false
  }
}

/** Stripe Checkout: 7-Tage-Trial — ohne Zahlungsmittel startet kein Trial. */
export async function startSubscriptionCheckout(opts: {
  product: CheckoutProduct
  interval: CheckoutInterval
  topupCents?: number
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session?.access_token) {
    return { ok: false, error: 'not_signed_in' }
  }
  try {
    const res = await fetch(apiUrl('/api/create-checkout-session'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product: opts.product,
        interval: opts.interval,
        topupCents: opts.topupCents ?? 0,
      }),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      url?: string
      error?: string
    } | null
    if (!res.ok || !data?.ok || !data.url || !isTrustedStripeUrl(data.url)) {
      return { ok: false, error: data?.error || 'checkout_failed' }
    }
    return { ok: true, url: data.url }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function startPortalSession(
  returnPath: '/app' | '/schublade' = '/app',
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session?.access_token) {
    return { ok: false, error: 'not_signed_in' }
  }
  try {
    const res = await fetch(apiUrl('/api/create-portal-session'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ returnPath }),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      url?: string
      error?: string
    } | null
    if (!res.ok || !data?.ok || !data.url || !isTrustedStripeUrl(data.url)) {
      return { ok: false, error: data?.error || 'portal_failed' }
    }
    return { ok: true, url: data.url }
  } catch {
    return { ok: false, error: 'network' }
  }
}
