/** Beta/Trial ohne Abo: 10/Tag + max. 50/Monat; Wallet (Abo/Nachkauf) vom Server */

import { getSession } from '../sync/auth'

export const CHOP_AI_DAILY_LIMIT = 10
export const CHOP_AI_MONTHLY_LIMIT = 50

const QUOTA_KEY = 'anker-chop-ai-quota'
const WALLET_CACHE_KEY = 'anker-chop-ai-wallet'

type QuotaState = {
  day: string
  month: string
  dayUsed: number
  monthUsed: number
}

type WalletCache = {
  balance: number
  useFreeQuota: boolean
  tier: string | null
  at: string
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

function readQuota(): QuotaState {
  try {
    const raw = localStorage.getItem(QUOTA_KEY)
    if (!raw) {
      return { day: todayKey(), month: monthKey(), dayUsed: 0, monthUsed: 0 }
    }
    const data = JSON.parse(raw) as Partial<QuotaState> & { used?: number }
    const day = typeof data.day === 'string' ? data.day : todayKey()
    const month = typeof data.month === 'string' ? data.month : monthKey()
    let dayUsed =
      typeof data.dayUsed === 'number'
        ? data.dayUsed
        : typeof data.used === 'number'
          ? data.used
          : 0
    let monthUsed = typeof data.monthUsed === 'number' ? data.monthUsed : 0
    if (day !== todayKey()) dayUsed = 0
    if (month !== monthKey()) monthUsed = 0
    return {
      day: todayKey(),
      month: monthKey(),
      dayUsed: Math.max(0, dayUsed),
      monthUsed: Math.max(0, monthUsed),
    }
  } catch {
    return { day: todayKey(), month: monthKey(), dayUsed: 0, monthUsed: 0 }
  }
}

function writeQuota(state: QuotaState): void {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function readWalletCache(): WalletCache {
  try {
    const raw = localStorage.getItem(WALLET_CACHE_KEY)
    if (!raw) {
      return { balance: 0, useFreeQuota: true, tier: null, at: '' }
    }
    const data = JSON.parse(raw) as Partial<WalletCache>
    return {
      balance: typeof data.balance === 'number' ? Math.max(0, data.balance) : 0,
      useFreeQuota: data.useFreeQuota !== false,
      tier: typeof data.tier === 'string' ? data.tier : null,
      at: typeof data.at === 'string' ? data.at : '',
    }
  } catch {
    return { balance: 0, useFreeQuota: true, tier: null, at: '' }
  }
}

function writeWalletCache(cache: WalletCache): void {
  try {
    localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
}

export function freeDayRemaining(): number {
  const q = readQuota()
  return Math.max(0, CHOP_AI_DAILY_LIMIT - q.dayUsed)
}

export function freeMonthRemaining(): number {
  const q = readQuota()
  return Math.max(0, CHOP_AI_MONTHLY_LIMIT - q.monthUsed)
}

export function freeQuotaRemaining(): number {
  if (!readWalletCache().useFreeQuota) return 0
  return Math.min(freeDayRemaining(), freeMonthRemaining())
}

export function walletBalanceCached(): number {
  return readWalletCache().balance
}

export function usesFreeQuota(): boolean {
  return readWalletCache().useFreeQuota
}

/** @deprecated Alias — Gesamt „noch nutzbar“ inkl. Wallet-Cache */
export function chopAiQuotaRemaining(): number {
  return freeQuotaRemaining() + walletBalanceCached()
}

export function canUseChopAi(): boolean {
  return chopAiQuotaRemaining() > 0
}

function recordFreeUse(): void {
  const q = readQuota()
  writeQuota({
    day: todayKey(),
    month: monthKey(),
    dayUsed: q.dayUsed + 1,
    monthUsed: q.monthUsed + 1,
  })
}

export async function refreshChopWallet(): Promise<WalletCache> {
  const session = await getSession()
  if (!session?.access_token) {
    const cleared: WalletCache = {
      balance: 0,
      useFreeQuota: true,
      tier: null,
      at: new Date().toISOString(),
    }
    writeWalletCache(cleared)
    return cleared
  }
  try {
    const res = await fetch('/api/chop-credits', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      balance?: number
      useFreeQuota?: boolean
      tier?: string | null
    } | null
    if (!res.ok || !data?.ok) {
      return readWalletCache()
    }
    const next: WalletCache = {
      balance: typeof data.balance === 'number' ? data.balance : 0,
      useFreeQuota: data.useFreeQuota !== false,
      tier: data.tier ?? null,
      at: new Date().toISOString(),
    }
    writeWalletCache(next)
    return next
  } catch {
    return readWalletCache()
  }
}

/** Lokaler Free-Zähler für UI — Server verbucht verbindlich in chop-bites. */
export function noteFreeUseLocally(): void {
  if (usesFreeQuota()) recordFreeUse()
}

/**
 * @deprecated Verbrauch läuft serverseitig in /api/chop-bites.
 */
export async function recordChopAiUse(): Promise<boolean> {
  noteFreeUseLocally()
  await refreshChopWallet()
  return true
}

export async function startChopPackCheckout(
  pack: 's' | 'm' | 'l',
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session?.access_token) {
    return { ok: false, error: 'not_signed_in' }
  }
  try {
    const res = await fetch('/api/create-chop-checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pack }),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      url?: string
      error?: string
    } | null
    if (!res.ok || !data?.ok || !data.url) {
      return { ok: false, error: data?.error || 'checkout_failed' }
    }
    return { ok: true, url: data.url }
  } catch {
    return { ok: false, error: 'network' }
  }
}
