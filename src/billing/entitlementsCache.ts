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

/** Fail-closed bis der Server etwas anderes sagt. */
const deniedAccess: EntitlementsState = {
  enforced: true,
  tier: null,
  status: 'none',
  stripeCustomerId: null,
  canUseTagesanker: false,
  canUseSchublade: false,
  hasPortal: false,
  updatedAt: 0,
}

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
    if (typeof parsed?.enforced !== 'boolean') return null
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
  return readCache() ?? { ...deniedAccess }
}

export function clearEntitlementsCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export function openEntitlementsAccess(): EntitlementsState {
  return { ...openAccess }
}

/** Paywall aktiv, kein Zugang. */
export function deniedEntitlementsAccess(): EntitlementsState {
  return { ...deniedAccess, updatedAt: Date.now() }
}

export function cacheEntitlements(state: EntitlementsState) {
  writeCache(state)
}
