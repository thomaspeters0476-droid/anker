import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { getAdminSupabase, userIdFromAuthHeader } from './_chopWallet.js'
import { getEntitlement } from './_entitlements.js'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key)
}

function siteOrigin(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel}`
  return 'https://tagesanker.de'
}

/**
 * Opens Stripe Customer Portal for cancel / plan change.
 * Body: { returnPath?: string } e.g. "/app" or "/schublade"
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const userId = await userIdFromAuthHeader(req)
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' })
  }

  const stripe = getStripe()
  const sb = getAdminSupabase()
  if (!stripe || !sb) {
    return res.status(503).json({ ok: false, error: 'stripe_not_configured' })
  }

  const row = await getEntitlement(sb, userId)
  if (!row?.stripe_customer_id) {
    return res.status(404).json({
      ok: false,
      error: 'no_customer',
      message: 'Kein Stripe-Kunde für dieses Konto.',
    })
  }

  const returnPathRaw = String(req.body?.returnPath ?? '/app')
  const returnPath =
    returnPathRaw === '/schublade' || returnPathRaw.startsWith('/schublade')
      ? '/schublade'
      : '/app'

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${siteOrigin()}${returnPath}`,
    })
    return res.status(200).json({ ok: true, url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'portal_failed'
    console.error('create-portal-session', message)
    return res.status(502).json({ ok: false, error: 'portal_failed' })
  }
}
