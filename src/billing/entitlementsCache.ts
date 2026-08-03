export type AboTier = 'tagesanker' | 'schublade' | 'bundle'

export type EntitlementsState = {
  enforced: boolean
  tier: AboTier | null
  status: string
  canUseTagesanker: boolean
  canUseSchublade: boolean
  hasPortal: boolean
  updatedAt: number
}

const CACHE_KEY = 'anker-entitlements-v2'

/** Fail-closed bis der Server etwas anderes sagt. */
const deniedAccess: EntitlementsState = {
  enforced: true,
  tier: null,
  status: 'none',
  canUseTagesanker: false,
  canUseSchublade: false,
  hasPortal: false,
  updatedAt: 0,
}

const openAccess: EntitlementsState = {
  enforced: false,
  tier: null,
  status: 'none',
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
    localStorage.removeItem('anker-entitlements-v1')
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
