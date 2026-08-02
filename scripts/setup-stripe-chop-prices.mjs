/**
 * Legt Stripe Products/Prices für Abos + KI-Pakete an (oder nutzt vorhandene)
 * und schreibt die Price-IDs nach stdout als KEY=value.
 *
 * Usage: node --env-file=.env.vercel.tmp scripts/setup-stripe-chop-prices.mjs
 */
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY missing')
  process.exit(1)
}

async function findOrCreateProduct(name, metadata = {}) {
  const list = await stripe.products.list({ limit: 100, active: true })
  const existing = list.data.find((p) => p.name === name)
  if (existing) return existing
  return stripe.products.create({ name, metadata })
}

async function findOrCreateRecurringPrice(productId, unitAmount, interval, nickname) {
  const list = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const hit = list.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === 'eur' &&
      p.recurring?.interval === interval,
  )
  if (hit) return hit
  return stripe.prices.create({
    product: productId,
    currency: 'eur',
    unit_amount: unitAmount,
    recurring: { interval },
    nickname,
  })
}

async function findOrCreateOneTimePrice(productId, unitAmount, nickname) {
  const list = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const hit = list.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === 'eur' &&
      !p.recurring,
  )
  if (hit) return hit
  return stripe.prices.create({
    product: productId,
    currency: 'eur',
    unit_amount: unitAmount,
    nickname,
  })
}

const out = {}

// Abos
const ta = await findOrCreateProduct('Tagesanker', {
  tagesanker: 'abo',
  tier: 'tagesanker',
})
const schub = await findOrCreateProduct('Die Schublade', {
  tagesanker: 'abo',
  tier: 'schublade',
})
const bundle = await findOrCreateProduct('Tagesanker Bundle', {
  tagesanker: 'abo',
  tier: 'bundle',
})

out.STRIPE_PRICE_MONTHLY = (
  await findOrCreateRecurringPrice(ta.id, 349, 'month', 'TA Monat 3,49')
).id
out.STRIPE_PRICE_YEARLY = (
  await findOrCreateRecurringPrice(ta.id, 3490, 'year', 'TA Jahr 34,90')
).id
out.STRIPE_PRICE_SCHUBLADE_MONTHLY = (
  await findOrCreateRecurringPrice(schub.id, 499, 'month', 'Schublade Monat 4,99')
).id
out.STRIPE_PRICE_SCHUBLADE_YEARLY = (
  await findOrCreateRecurringPrice(schub.id, 4990, 'year', 'Schublade Jahr 49,90')
).id
out.STRIPE_PRICE_BUNDLE_MONTHLY = (
  await findOrCreateRecurringPrice(bundle.id, 749, 'month', 'Bundle Monat 7,49')
).id
out.STRIPE_PRICE_BUNDLE_YEARLY = (
  await findOrCreateRecurringPrice(bundle.id, 7490, 'year', 'Bundle Jahr 74,90')
).id

// KI-Pakete
const packS = await findOrCreateProduct('Tagesanker KI-Paket S', {
  tagesanker: 'chop_pack',
  pack: 's',
  credits: '35',
})
const packM = await findOrCreateProduct('Tagesanker KI-Paket M', {
  tagesanker: 'chop_pack',
  pack: 'm',
  credits: '120',
})
const packL = await findOrCreateProduct('Tagesanker KI-Paket L', {
  tagesanker: 'chop_pack',
  pack: 'l',
  credits: '333',
})

out.STRIPE_PRICE_CHOP_S = (
  await findOrCreateOneTimePrice(packS.id, 99, 'KI S 35 Calls 0,99')
).id
out.STRIPE_PRICE_CHOP_M = (
  await findOrCreateOneTimePrice(packM.id, 249, 'KI M 120 Calls 2,49')
).id
out.STRIPE_PRICE_CHOP_L = (
  await findOrCreateOneTimePrice(packL.id, 499, 'KI L 333 Calls 4,99')
).id

for (const [k, v] of Object.entries(out)) {
  console.log(`${k}=${v}`)
}
