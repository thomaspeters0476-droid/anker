import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'

export type ChopTier = 'tagesanker' | 'schublade' | 'bundle'

export function getAdminSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getAnonSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function userIdFromAuthHeader(
  req: VercelRequest,
): Promise<string | null> {
  const raw = req.headers.authorization
  if (!raw || Array.isArray(raw)) return null
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
  if (!m?.[1]) return null
  const sb = getAnonSupabase()
  if (!sb) return null
  const { data, error } = await sb.auth.getUser(m[1])
  if (error || !data.user) return null
  return data.user.id
}

export async function getWallet(
  sb: SupabaseClient,
  userId: string,
): Promise<{ balance: number; tier: ChopTier | null }> {
  const { data } = await sb
    .from('chop_ai_wallets')
    .select('balance, tier')
    .eq('user_id', userId)
    .maybeSingle()
  return {
    balance: typeof data?.balance === 'number' ? data.balance : 0,
    tier:
      data?.tier === 'tagesanker' ||
      data?.tier === 'schublade' ||
      data?.tier === 'bundle'
        ? data.tier
        : null,
  }
}

/** useFreeQuota: kein Schublade/Bundle-Abo → Free 10/Tag + 50/Monat */
export function useFreeQuota(tier: ChopTier | null): boolean {
  return tier !== 'schublade' && tier !== 'bundle'
}

export async function creditWallet(input: {
  userId: string
  delta: number
  reason: 'abo_grant' | 'purchase'
  stripeSessionId?: string | null
  stripeInvoiceId?: string | null
  tier?: ChopTier | null
  note?: string
}): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const sb = getAdminSupabase()
  if (!sb) return { ok: false, error: 'db_not_configured' }
  if (input.delta <= 0) return { ok: false, error: 'bad_delta' }

  if (input.stripeSessionId) {
    const { data: existing } = await sb
      .from('chop_ai_ledger')
      .select('id')
      .eq('stripe_session_id', input.stripeSessionId)
      .maybeSingle()
    if (existing) {
      const w = await getWallet(sb, input.userId)
      return { ok: true, balance: w.balance }
    }
  }
  if (input.stripeInvoiceId) {
    const { data: existing } = await sb
      .from('chop_ai_ledger')
      .select('id')
      .eq('stripe_invoice_id', input.stripeInvoiceId)
      .maybeSingle()
    if (existing) {
      const w = await getWallet(sb, input.userId)
      return { ok: true, balance: w.balance }
    }
  }

  const current = await getWallet(sb, input.userId)
  const nextBalance = current.balance + input.delta
  const nextTier = input.tier !== undefined ? input.tier : current.tier

  const { error: upErr } = await sb.from('chop_ai_wallets').upsert(
    {
      user_id: input.userId,
      balance: nextBalance,
      tier: nextTier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (upErr) return { ok: false, error: upErr.message }

  const { error: ledErr } = await sb.from('chop_ai_ledger').insert({
    user_id: input.userId,
    delta: input.delta,
    reason: input.reason,
    stripe_session_id: input.stripeSessionId ?? null,
    stripe_invoice_id: input.stripeInvoiceId ?? null,
    note: input.note ?? null,
  })
  if (ledErr) {
    // Unique race — treat as success
    if (/duplicate|unique/i.test(ledErr.message)) {
      const w = await getWallet(sb, input.userId)
      return { ok: true, balance: w.balance }
    }
    return { ok: false, error: ledErr.message }
  }
  return { ok: true, balance: nextBalance }
}

/**
 * Nach Entitlement-Verlust: Abo-Credits verfallen (FIFO: Consume zuerst gegen Abo),
 * gekaufte Pack-Credits bleiben. Tier wird genullt.
 * `entitlement_revoke`-Zeilen werden ignoriert (Idempotenz).
 */
export function remainingPurchaseBalance(
  ledger: ReadonlyArray<{ delta: number; reason: string }>,
): number {
  let purchases = 0
  let abo = 0
  let consumed = 0
  for (const row of ledger) {
    if (row.reason === 'entitlement_revoke') continue
    if (row.reason === 'purchase' && row.delta > 0) purchases += row.delta
    else if (row.reason === 'abo_grant' && row.delta > 0) abo += row.delta
    else if (row.reason === 'consume' && row.delta < 0) consumed += -row.delta
  }
  const consumedFromAbo = Math.min(abo, consumed)
  const consumedFromPurchases = Math.max(0, consumed - consumedFromAbo)
  return Math.max(0, purchases - consumedFromPurchases)
}

/** Tier clear + Abo-Guthaben forfeit; Pack-Rest bleibt. */
export async function revokeAboWalletAccess(
  userId: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const sb = getAdminSupabase()
  if (!sb) return { ok: false, error: 'db_not_configured' }

  const { data: rows, error } = await sb
    .from('chop_ai_ledger')
    .select('delta, reason')
    .eq('user_id', userId)
  if (error) return { ok: false, error: error.message }

  const nextBalance = remainingPurchaseBalance(rows ?? [])
  const current = await getWallet(sb, userId)
  const { error: upErr } = await sb.from('chop_ai_wallets').upsert(
    {
      user_id: userId,
      balance: nextBalance,
      tier: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (upErr) return { ok: false, error: upErr.message }

  const forfeited = Math.max(0, current.balance - nextBalance)
  if (forfeited > 0 || current.tier) {
    const { error: ledErr } = await sb.from('chop_ai_ledger').insert({
      user_id: userId,
      delta: -forfeited,
      reason: 'entitlement_revoke',
      note: 'abo_forfeit_on_inactive',
    })
    if (ledErr) console.error('chop ledger revoke', ledErr.message)
  }
  return { ok: true, balance: nextBalance }
}

export async function consumeWalletCredit(
  userId: string,
): Promise<
  | { ok: true; balance: number }
  | { ok: false; error: 'empty' | 'db_not_configured' | string }
> {
  const sb = getAdminSupabase()
  if (!sb) return { ok: false, error: 'db_not_configured' }

  const { data, error } = await sb
    .from('chop_ai_wallets')
    .select('balance, tier')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  const bal = typeof data?.balance === 'number' ? data.balance : 0
  if (bal < 1) return { ok: false, error: 'empty' }

  const next = bal - 1
  const { data: updated, error: upErr } = await sb
    .from('chop_ai_wallets')
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('balance', bal)
    .select('balance')
  if (upErr) return { ok: false, error: upErr.message }
  if (!updated?.length) return { ok: false, error: 'empty' }

  const { error: ledErr } = await sb.from('chop_ai_ledger').insert({
    user_id: userId,
    delta: -1,
    reason: 'consume',
  })
  if (ledErr) console.error('chop ledger consume', ledErr.message)
  return { ok: true, balance: next }
}

export const FREE_CHOP_DAILY = 10
export const FREE_CHOP_MONTHLY = 50

async function freeUsageCount(
  userId: string,
  periodType: 'day' | 'month',
  periodKey: string,
): Promise<number> {
  const sb = getAdminSupabase()
  if (!sb) return FREE_CHOP_MONTHLY
  const { data } = await sb
    .from('chop_ai_free_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .maybeSingle()
  return typeof data?.count === 'number' ? data.count : 0
}

async function incrementFreeUsage(
  userId: string,
  periodType: 'day' | 'month',
  periodKey: string,
): Promise<void> {
  const sb = getAdminSupabase()
  if (!sb) return
  const cur = await freeUsageCount(userId, periodType, periodKey)
  await sb.from('chop_ai_free_usage').upsert(
    {
      user_id: userId,
      period_type: periodType,
      period_key: periodKey,
      count: cur + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,period_type,period_key' },
  )
}

/** Free-Quota oder Wallet — vor Azure-Call. */
export async function authorizeChopAiUse(
  userId: string,
): Promise<
  | { ok: true; source: 'free' | 'wallet'; balance?: number }
  | { ok: false; error: 'rate_limited' | 'empty_balance' | 'db_not_configured' }
> {
  const sb = getAdminSupabase()
  if (!sb) return { ok: false, error: 'db_not_configured' }

  const wallet = await getWallet(sb, userId)
  const day = new Date().toISOString().slice(0, 10)
  const month = day.slice(0, 7)

  if (useFreeQuota(wallet.tier)) {
    const dayUsed = await freeUsageCount(userId, 'day', day)
    const monthUsed = await freeUsageCount(userId, 'month', month)
    if (dayUsed < FREE_CHOP_DAILY && monthUsed < FREE_CHOP_MONTHLY) {
      await incrementFreeUsage(userId, 'day', day)
      await incrementFreeUsage(userId, 'month', month)
      return { ok: true, source: 'free' }
    }
  }

  const consumed = await consumeWalletCredit(userId)
  if (consumed.ok === true) {
    return { ok: true, source: 'wallet', balance: consumed.balance }
  }
  if (useFreeQuota(wallet.tier)) {
    return { ok: false, error: 'rate_limited' }
  }
  return { ok: false, error: 'empty_balance' }
}

/** Durable Rate-Limit über api_rate_buckets. */
export async function consumeRateBucket(opts: {
  key: string
  windowMs: number
  max: number
}): Promise<boolean> {
  const sb = getAdminSupabase()
  if (!sb) return true // fail-open nur wenn DB fehlt (lokal)
  const now = Date.now()
  const { data } = await sb
    .from('api_rate_buckets')
    .select('window_start, count')
    .eq('bucket_key', opts.key)
    .maybeSingle()

  let windowStart = now
  let count = 0
  if (data?.window_start) {
    const start = Date.parse(data.window_start)
    if (!Number.isNaN(start) && now - start < opts.windowMs) {
      windowStart = start
      count = typeof data.count === 'number' ? data.count : 0
    }
  }
  if (count >= opts.max) return false
  await sb.from('api_rate_buckets').upsert(
    {
      bucket_key: opts.key,
      window_start: new Date(windowStart).toISOString(),
      count: count + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'bucket_key' },
  )
  return true
}

export const PACK_CREDITS: Record<string, number> = {
  s: 35,
  m: 120,
  l: 333,
}

export function monthlyCreditsForTier(tier: ChopTier | null): number {
  if (tier === 'schublade') return 100
  if (tier === 'bundle') return 150
  return 0
}

export function tierFromPriceId(priceId: string | null | undefined): {
  tier: ChopTier
  credits: number
} | null {
  if (!priceId) return null
  const map: { env: string; tier: ChopTier; credits: number }[] = [
    {
      env: process.env.STRIPE_PRICE_SCHUBLADE_MONTHLY?.trim() || '',
      tier: 'schublade',
      credits: 100,
    },
    {
      env: process.env.STRIPE_PRICE_SCHUBLADE_YEARLY?.trim() || '',
      tier: 'schublade',
      credits: 100,
    },
    {
      env: process.env.STRIPE_PRICE_BUNDLE_MONTHLY?.trim() || '',
      tier: 'bundle',
      credits: 150,
    },
    {
      env: process.env.STRIPE_PRICE_BUNDLE_YEARLY?.trim() || '',
      tier: 'bundle',
      credits: 150,
    },
    {
      env: process.env.STRIPE_PRICE_MONTHLY?.trim() || '',
      tier: 'tagesanker',
      credits: 0,
    },
    {
      env: process.env.STRIPE_PRICE_YEARLY?.trim() || '',
      tier: 'tagesanker',
      credits: 0,
    },
  ]
  for (const row of map) {
    if (row.env && row.env === priceId) {
      return { tier: row.tier, credits: row.credits }
    }
  }
  return null
}
