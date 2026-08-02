import { getSession } from '../sync/auth'

export type AboTier = 'tagesanker' | 'schublade' | 'bundle'

export type EntitlementsState = {
  enforced: boolean
  tier: AboTier | null
  status: string
  stripeCustomerId: string | null
  canUseTagesanker: boolean
  canUseSchublade: boolean
  hasPortal: boolean
  updatedAt: number
}

const CACHE_KEY = 'anker-entitlements-v1'

const openAccess: EntitlementsState = {
  enforced: false,
  tier: null,
  status: 'none',
  stripeCustomerId: null,
  canUseTagesanker: true,
  canUseSchublade: true,
  hasPortal: false,
  updatedAt: 0,
}

function readCache(): EntitlementsState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EntitlementsState
    if (typeof parsed?.canUseTagesanker !== 'boolean') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(state: EntitlementsState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function getCachedEntitlements(): EntitlementsState {
  return readCache() ?? { ...openAccess }
}

export function clearEntitlementsCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export async function refreshEntitlements(): Promise<EntitlementsState> {
  const session = await getSession()
  if (!session?.access_token) {
    const next = { ...openAccess, updatedAt: Date.now() }
    writeCache(next)
    return next
  }
  try {
    const res = await fetch('/api/entitlements', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      enforced?: boolean
      tier?: AboTier | null
      status?: string
      stripeCustomerId?: string | null
      canUseTagesanker?: boolean
      canUseSchublade?: boolean
      hasPortal?: boolean
    } | null
    if (!res.ok || !data?.ok) {
      return getCachedEntitlements()
    }
    const next: EntitlementsState = {
      enforced: Boolean(data.enforced),
      tier: data.tier ?? null,
      status: data.status || 'none',
      stripeCustomerId: data.stripeCustomerId ?? null,
      canUseTagesanker: data.canUseTagesanker !== false,
      canUseSchublade: data.canUseSchublade !== false,
      hasPortal: Boolean(data.hasPortal),
      updatedAt: Date.now(),
    }
    writeCache(next)
    return next
  } catch {
    return getCachedEntitlements()
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
    const res = await fetch('/api/create-portal-session', {
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
    if (!res.ok || !data?.ok || !data.url) {
      return { ok: false, error: data?.error || 'portal_failed' }
    }
    return { ok: true, url: data.url }
  } catch {
    return { ok: false, error: 'network' }
  }
}
