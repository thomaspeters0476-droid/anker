import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAdminSupabase, userIdFromAuthHeader } from './_chopWallet.js'
import {
  canUseSchublade,
  canUseTagesanker,
  entitlementsEnforced,
  getEntitlement,
  type EntitlementStatus,
} from './_entitlements.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const userId = await userIdFromAuthHeader(req)
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' })
  }

  const sb = getAdminSupabase()
  if (!sb) {
    return res.status(503).json({ ok: false, error: 'db_not_configured' })
  }

  const row = await getEntitlement(sb, userId)
  const tier = row?.tier ?? null
  const status: EntitlementStatus = row?.status ?? 'none'
  const enforced = entitlementsEnforced()

  return res.status(200).json({
    ok: true,
    enforced,
    tier,
    status,
    stripeCustomerId: row?.stripe_customer_id ?? null,
    subscriptionId: row?.stripe_subscription_id ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
    canUseTagesanker: enforced ? canUseTagesanker(tier, status) : true,
    canUseSchublade: enforced ? canUseSchublade(tier, status) : true,
    hasPortal: Boolean(row?.stripe_customer_id),
  })
}
