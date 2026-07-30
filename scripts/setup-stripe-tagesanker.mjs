/**
 * One-shot: create Tagesanker Stripe product/prices (test or live key via env).
 * Usage: STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-tagesanker.mjs
 * Prints only IDs (no secret).
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY?.trim()
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY')
  process.exit(1)
}

const stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' })

const existing = await stripe.products.search({
  query: "name:'Tagesanker' AND active:'true'",
  limit: 5,
})

let product = existing.data[0]
if (!product) {
  product = await stripe.products.create({
    name: 'Tagesanker',
    description:
      'Tagesanker Abo — Fokus-App ohne Werbung und ohne Datenhandel. 7 Tage Trial.',
    metadata: { product: 'tagesanker' },
  })
  console.log('product_created', product.id)
} else {
  console.log('product_existing', product.id)
}

async function ensurePrice(unitAmount, interval) {
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  })
  const found = prices.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === 'eur' &&
      p.recurring?.interval === interval,
  )
  if (found) {
    console.log(`price_${interval}_existing`, found.id)
    return found.id
  }
  const created = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: unitAmount,
    recurring: { interval },
    metadata: { product: 'tagesanker', interval },
  })
  console.log(`price_${interval}_created`, created.id)
  return created.id
}

const monthly = await ensurePrice(399, 'month')
const yearly = await ensurePrice(3900, 'year')

console.log('RESULT_MONTHLY=' + monthly)
console.log('RESULT_YEARLY=' + yearly)
console.log('RESULT_MODE=' + (key.startsWith('sk_live') ? 'live' : 'test'))
