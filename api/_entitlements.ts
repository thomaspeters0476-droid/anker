import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getAdminSupabase,
  monthlyCreditsForTier,
  tierFromPriceId,
  type ChopTier,
} from './_chopWallet.js'

export type EntitlementStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'

export type EntitlementRow = {
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  tier: ChopTier | null
  status: EntitlementStatus
  current_period_end: string | null
  updated_at: string
}

export function entitlementsEnforced(): boolean {
  return process.env.STRIPE_CHECKOUT_ENABLED === 'true'
}

export function isEntitlementActive(status: EntitlementStatus): boolean {
  return status === 'trialing' || status === 'active'
}

export function canUseTagesanker(
  tier: ChopTier | null,
  status: EntitlementStatus,
): boolean {
  if (!isEntitlementActive(status) || !tier) return false
  return tier === 'tagesanker' || tier === 'bundle'
}

export function canUseSchublade(
  tier: ChopTier | null,
  status: EntitlementStatus,
): boolean {
  if (!isEntitlementActive(status) || !tier) return false
  return tier === 'schublade' || tier === 'bundle'
}

function mapStripeStatus(status: Stripe.Subscription.Status): EntitlementStatus {
  if (status === 'trialing') return 'trialing'
  if (status === 'active') return 'active'
  if (status === 'past_due') return 'past_due'
  if (status === 'unpaid') return 'unpaid'
  if (status === 'canceled') return 'canceled'
  return 'canceled'
}

export async function getEntitlement(
  sb: SupabaseClient,
  userId: string,
): Promise<EntitlementRow | null> {
  const { data } = await sb
    .from('user_entitlements')
    .select(
      'user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end, updated_at',
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  return data as EntitlementRow
}

export async function getEntitlementByCustomer(
  sb: SupabaseClient,
  customerId: string,
): Promise<EntitlementRow | null> {
  const { data } = await sb
    .from('user_entitlements')
    .select(
      'user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end, updated_at',
    )
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!data) return null
  return data as EntitlementRow
}

export async function upsertEntitlement(input: {
  userId: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  tier?: ChopTier | null
  status: EntitlementStatus
  currentPeriodEnd?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getAdminSupabase()
  if (!sb) return { ok: false, error: 'db_not_configured' }

  const existing = await getEntitlement(sb, input.userId)
  const row = {
    user_id: input.userId,
    stripe_customer_id:
      input.stripeCustomerId !== undefined
        ? input.stripeCustomerId
        : existing?.stripe_customer_id ?? null,
    stripe_subscription_id:
      input.stripeSubscriptionId !== undefined
        ? input.stripeSubscriptionId
        : existing?.stripe_subscription_id ?? null,
    tier: input.tier !== undefined ? input.tier : existing?.tier ?? null,
    status: input.status,
    current_period_end:
      input.currentPeriodEnd !== undefined
        ? input.currentPeriodEnd
        : existing?.current_period_end ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await sb.from('user_entitlements').upsert(row, {
    onConflict: 'user_id',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export function tierFromSubscription(
  sub: Stripe.Subscription,
): ChopTier | null {
  const meta = sub.metadata?.tier || sub.metadata?.product || ''
  if (meta === 'tagesanker' || meta === 'schublade' || meta === 'bundle') {
    return meta
  }
  for (const item of sub.items?.data ?? []) {
    const priceId =
      typeof item.price === 'string' ? item.price : item.price?.id
    const hit = tierFromPriceId(priceId)
    if (hit) return hit.tier
  }
  return null
}

export function periodEndIso(sub: Stripe.Subscription): string | null {
  const end = (sub as { current_period_end?: number }).current_period_end
  if (typeof end !== 'number' || end <= 0) return null
  return new Date(end * 1000).toISOString()
}

export async function syncEntitlementFromSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null

  let userId = sub.metadata?.user_id?.trim() || ''
  if (!userId && customerId) {
    const sb = getAdminSupabase()
    if (sb) {
      const byCustomer = await getEntitlementByCustomer(sb, customerId)
      userId = byCustomer?.user_id || ''
    }
  }
  if (!userId && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      if (!customer.deleted) {
        userId =
          (customer as Stripe.Customer).metadata?.supabase_user_id?.trim() ||
          ''
      }
    } catch {
      /* ignore */
    }
  }
  if (!userId) {
    console.error('entitlement sync: missing user_id', sub.id)
    return
  }

  const tier = tierFromSubscription(sub)
  const status = mapStripeStatus(sub.status)
  const active = isEntitlementActive(status)

  const result = await upsertEntitlement({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    tier,
    status,
    currentPeriodEnd: periodEndIso(sub),
  })
  if (result.ok === false) {
    console.error('entitlement upsert', result.error)
    return
  }

  // Keep KI wallet tier in sync when subscription is active
  if (active && tier) {
    const sb = getAdminSupabase()
    if (!sb) return
    const { data } = await sb
      .from('chop_ai_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
    const balance = typeof data?.balance === 'number' ? data.balance : 0
    await sb.from('chop_ai_wallets').upsert(
      {
        user_id: userId,
        balance,
        tier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  }
}

export async function ensureStripeCustomer(
  stripe: Stripe,
  userId: string,
  email?: string | null,
): Promise<string | null> {
  const sb = getAdminSupabase()
  if (!sb) return null

  const existing = await getEntitlement(sb, userId)
  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  })

  await upsertEntitlement({
    userId,
    stripeCustomerId: customer.id,
    status: existing?.status || 'none',
    tier: existing?.tier ?? null,
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    currentPeriodEnd: existing?.current_period_end ?? null,
  })

  return customer.id
}

export function priceIdForProduct(
  product: ChopTier,
  interval: 'month' | 'year',
): string | null {
  if (product === 'tagesanker') {
    return interval === 'year'
      ? process.env.STRIPE_PRICE_YEARLY?.trim() || null
      : process.env.STRIPE_PRICE_MONTHLY?.trim() || null
  }
  if (product === 'schublade') {
    return interval === 'year'
      ? process.env.STRIPE_PRICE_SCHUBLADE_YEARLY?.trim() || null
      : process.env.STRIPE_PRICE_SCHUBLADE_MONTHLY?.trim() || null
  }
  return interval === 'year'
    ? process.env.STRIPE_PRICE_BUNDLE_YEARLY?.trim() || null
    : process.env.STRIPE_PRICE_BUNDLE_MONTHLY?.trim() || null
}

export function chopCreditsMeta(tier: ChopTier): string {
  return String(monthlyCreditsForTier(tier))
}
