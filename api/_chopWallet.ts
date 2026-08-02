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
  const { error: upErr } = await sb
    .from('chop_ai_wallets')
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('balance', bal)
  if (upErr) return { ok: false, error: upErr.message }

  const { error: ledErr } = await sb.from('chop_ai_ledger').insert({
    user_id: userId,
    delta: -1,
    reason: 'consume',
  })
  if (ledErr) console.error('chop ledger consume', ledErr.message)
  return { ok: true, balance: next }
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
