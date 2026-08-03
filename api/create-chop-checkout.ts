import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { PACK_CREDITS, userIdFromAuthHeader } from './_chopWallet.js'
import { secretsEqual } from './_timingSafe.js'

type PackId = 's' | 'm' | 'l'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key)
}

function packsEnabled(): boolean {
  return process.env.STRIPE_CHOP_PACKS_ENABLED === 'true'
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

function priceIdFor(pack: PackId): string | null {
  if (pack === 's') return process.env.STRIPE_PRICE_CHOP_S?.trim() || null
  if (pack === 'm') return process.env.STRIPE_PRICE_CHOP_M?.trim() || null
  return process.env.STRIPE_PRICE_CHOP_L?.trim() || null
}

function packFallbackCents(pack: PackId): number {
  if (pack === 's') return 99
  if (pack === 'm') return 249
  return 499
}

/**
 * One-time KI-Paket Checkout.
 * Gate: STRIPE_CHOP_PACKS_ENABLED=true oder Preview-Token.
 * Body: { pack: 's'|'m'|'l' } + Authorization Bearer (Sync-Session).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const preview = previewTokenOk(
    String(req.headers['x-tagesanker-checkout-preview'] ?? ''),
  )
  if (!packsEnabled() && !preview) {
    return res.status(503).json({
      ok: false,
      error: 'checkout_disabled',
      message: 'KI-Nachkauf ist vorbereitet, aber noch nicht öffentlich.',
    })
  }

  const userId = await userIdFromAuthHeader(req)
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' })
  }

  const packRaw = String(req.body?.pack ?? '').toLowerCase()
  const pack: PackId | null =
    packRaw === 's' || packRaw === 'm' || packRaw === 'l' ? packRaw : null
  if (!pack) {
    return res.status(400).json({ ok: false, error: 'invalid_pack' })
  }

  const credits = PACK_CREDITS[pack]
  if (!credits) {
    return res.status(400).json({ ok: false, error: 'invalid_pack' })
  }

  const stripe = getStripe()
  if (!stripe) {
    return res.status(503).json({ ok: false, error: 'stripe_not_configured' })
  }

  const origin = siteOrigin()
  const priceId = priceIdFor(pack)
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: 'eur',
            unit_amount: packFallbackCents(pack),
            product_data: {
              name: `Tagesanker KI-Paket ${pack.toUpperCase()} (${credits} Vorschläge)`,
              metadata: {
                tagesanker: 'chop_pack',
                pack,
              },
            },
          },
          quantity: 1,
        },
      ]

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: userId,
      metadata: {
        product: 'chop_pack',
        pack,
        user_id: userId,
      },
      success_url: `${origin}/schublade?chop_checkout=success`,
      cancel_url: `${origin}/schublade?chop_checkout=cancel`,
    })

    return res.status(200).json({
      ok: true,
      url: session.url,
      id: session.id,
      preview: preview && !packsEnabled(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'checkout_failed'
    console.error('create-chop-checkout', message)
    return res.status(502).json({ ok: false, error: 'checkout_failed' })
  }
}
