import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  checkoutEnabled,
  getStripe,
  previewTokenOk,
  priceIdFor,
  siteOrigin,
  type Interval,
} from '../server/stripe'

/**
 * Creates a Stripe Checkout Session (subscription + optional one-time top-up).
 * Publicly disabled until STRIPE_CHECKOUT_ENABLED=true.
 * Internal test: header x-tagesanker-checkout-preview + STRIPE_CHECKOUT_PREVIEW_TOKEN.
 *
 * Body: { interval: 'month'|'year', topupCents?: number, customerEmail?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const preview = previewTokenOk(
    String(req.headers['x-tagesanker-checkout-preview'] ?? ''),
  )
  if (!checkoutEnabled() && !preview) {
    return res.status(503).json({
      ok: false,
      error: 'checkout_disabled',
      message: 'Checkout is prepared but not public yet.',
    })
  }

  const stripe = getStripe()
  if (!stripe) {
    return res.status(503).json({ ok: false, error: 'stripe_not_configured' })
  }

  const intervalRaw = String(req.body?.interval ?? 'month')
  const interval: Interval = intervalRaw === 'year' ? 'year' : 'month'
  const priceId = priceIdFor(interval)
  if (!priceId) {
    return res.status(503).json({
      ok: false,
      error: 'stripe_prices_missing',
      message: 'Set STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY in env.',
    })
  }

  const topupCents = Math.round(Number(req.body?.topupCents ?? 0))
  const email = String(req.body?.customerEmail ?? '')
    .trim()
    .toLowerCase()

  const origin = siteOrigin()
  const lineItems: {
    price?: string
    quantity?: number
    price_data?: {
      currency: string
      product_data: { name: string; metadata?: Record<string, string> }
      unit_amount: number
    }
  }[] = [{ price: priceId, quantity: 1 }]

  if (topupCents >= 100 && topupCents <= 50000) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        unit_amount: topupCents,
        product_data: {
          name: 'Tagesanker Spendentopf (Unterstützung)',
          metadata: { tagesanker: 'spend_topup' },
        },
      },
      quantity: 1,
    })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_email: email || undefined,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          product: 'tagesanker',
          interval,
        },
      },
      metadata: {
        product: 'tagesanker',
        interval,
        topup_cents: topupCents >= 100 ? String(topupCents) : '0',
      },
      success_url: `${origin}/preise?checkout=success`,
      cancel_url: `${origin}/preise?checkout=cancel`,
    })

    return res.status(200).json({
      ok: true,
      url: session.url,
      id: session.id,
      preview: preview && !checkoutEnabled(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'checkout_failed'
    console.error('create-checkout-session', message)
    return res.status(502).json({ ok: false, error: 'checkout_failed' })
  }
}
