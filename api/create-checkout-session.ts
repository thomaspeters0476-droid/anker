import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_cors.js'
import Stripe from 'stripe'
import {
  userIdFromAuthHeader,
  type ChopTier,
} from './_chopWallet.js'
import {
  chopCreditsMeta,
  ensureStripeCustomer,
  priceIdForProduct,
} from './_entitlements.js'
import {
  CHECKOUT_PAYMENT_METHOD_COLLECTION,
  TRIAL_PERIOD_DAYS,
} from './_entitlementRules.js'
import { secretsEqual } from './_timingSafe.js'

type Interval = 'month' | 'year'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key)
}

function checkoutEnabled(): boolean {
  return process.env.STRIPE_CHECKOUT_ENABLED === 'true'
}

function previewTokenOk(reqToken: string | undefined): boolean {
  const expected = process.env.STRIPE_CHECKOUT_PREVIEW_TOKEN?.trim()
  if (!expected) return false
  return secretsEqual(reqToken, expected)
}

function siteOrigin(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel}`
  return 'https://tagesanker.de'
}

function parseProduct(raw: unknown): ChopTier {
  const v = String(raw ?? 'tagesanker').toLowerCase()
  if (v === 'schublade' || v === 'bundle') return v
  return 'tagesanker'
}

/**
 * Creates a Stripe Checkout Session (subscription + optional one-time top-up).
 * Publicly disabled until STRIPE_CHECKOUT_ENABLED=true.
 * Internal test: header x-tagesanker-checkout-preview + STRIPE_CHECKOUT_PREVIEW_TOKEN.
 *
 * Body: {
 *   product?: 'tagesanker'|'schublade'|'bundle',
 *   interval: 'month'|'year',
 *   topupCents?: number
 * }
 * Requires Authorization Bearer (Sync login).
 *
 * Regel: Ohne Zahlungsmittel startet kein Trial (payment_method_collection=always).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
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

  const userId = await userIdFromAuthHeader(req)
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' })
  }

  const stripe = getStripe()
  if (!stripe) {
    return res.status(503).json({ ok: false, error: 'stripe_not_configured' })
  }

  const product = parseProduct(req.body?.product)
  const intervalRaw = String(req.body?.interval ?? 'month')
  const interval: Interval = intervalRaw === 'year' ? 'year' : 'month'
  const priceId = priceIdForProduct(product, interval)
  if (!priceId) {
    return res.status(503).json({
      ok: false,
      error: 'stripe_prices_missing',
      message: 'Set STRIPE_PRICE_* for this product in env.',
    })
  }

  const topupCents = Math.round(Number(req.body?.topupCents ?? 0))
  const origin = siteOrigin()
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ]

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
    const customerId = await ensureStripeCustomer(stripe, userId)
    if (!customerId) {
      return res.status(503).json({ ok: false, error: 'customer_failed' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: lineItems,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'de',
      // Ohne Zahlungsdaten ist Checkout nicht abschließbar → kein Trial.
      payment_method_collection: CHECKOUT_PAYMENT_METHOD_COLLECTION,
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
        metadata: {
          product,
          tier: product,
          user_id: userId,
          chop_monthly_credits: chopCreditsMeta(product),
          interval,
          require_payment_method: 'true',
        },
      },
      custom_text: {
        submit: {
          message:
            'Ohne Zahlungsdaten startet kein Trial. 7 Tage testen — erste Abbuchung danach, wenn du nicht vorher kündigst.',
        },
      },
      metadata: {
        product,
        tier: product,
        user_id: userId,
        interval,
        topup_cents: topupCents >= 100 ? String(topupCents) : '0',
        trial_days: String(TRIAL_PERIOD_DAYS),
        require_payment_method: 'true',
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
