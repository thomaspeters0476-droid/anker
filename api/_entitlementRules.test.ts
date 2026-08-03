import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CHECKOUT_PAYMENT_METHOD_COLLECTION,
  TRIAL_PERIOD_DAYS,
  canUseSchublade,
  canUseTagesanker,
  effectiveEntitlementStatus,
  isEntitlementActive,
  mapStripeSubscriptionStatus,
  subscriptionHasPaymentMethod,
} from './_entitlementRules.ts'

test('Trial: 7 Tage, Zahlungsdaten Pflicht (always)', () => {
  assert.equal(TRIAL_PERIOD_DAYS, 7)
  assert.equal(CHECKOUT_PAYMENT_METHOD_COLLECTION, 'always')
  assert.notEqual(CHECKOUT_PAYMENT_METHOD_COLLECTION, 'if_required')
})

test('isEntitlementActive — nur trialing/active', () => {
  assert.equal(isEntitlementActive('trialing'), true)
  assert.equal(isEntitlementActive('active'), true)
  assert.equal(isEntitlementActive('none'), false)
  assert.equal(isEntitlementActive('canceled'), false)
  assert.equal(isEntitlementActive('past_due'), false)
})

test('canUseTagesanker — Anker + Bundle, nicht Schublade allein', () => {
  assert.equal(canUseTagesanker('tagesanker', 'active'), true)
  assert.equal(canUseTagesanker('bundle', 'trialing'), true)
  assert.equal(canUseTagesanker('schublade', 'active'), false)
  assert.equal(canUseTagesanker('tagesanker', 'none'), false)
  assert.equal(canUseTagesanker(null, 'active'), false)
})

test('canUseSchublade — Schublade + Bundle, nicht Anker allein', () => {
  assert.equal(canUseSchublade('schublade', 'active'), true)
  assert.equal(canUseSchublade('bundle', 'trialing'), true)
  assert.equal(canUseSchublade('tagesanker', 'active'), false)
  assert.equal(canUseSchublade('schublade', 'canceled'), false)
})

test('mapStripeSubscriptionStatus', () => {
  assert.equal(mapStripeSubscriptionStatus('trialing'), 'trialing')
  assert.equal(mapStripeSubscriptionStatus('active'), 'active')
  assert.equal(mapStripeSubscriptionStatus('incomplete'), 'canceled')
})

test('subscriptionHasPaymentMethod', () => {
  assert.equal(subscriptionHasPaymentMethod({}), false)
  assert.equal(
    subscriptionHasPaymentMethod({ default_payment_method: 'pm_123' }),
    true,
  )
  assert.equal(
    subscriptionHasPaymentMethod({ default_source: 'card_1' }),
    true,
  )
})

test('effectiveEntitlementStatus — ohne PM kein Trial', () => {
  assert.equal(effectiveEntitlementStatus('trialing', {}), 'none')
  assert.equal(
    effectiveEntitlementStatus('trialing', {
      default_payment_method: 'pm_x',
    }),
    'trialing',
  )
  assert.equal(effectiveEntitlementStatus('active', {}), 'none')
  assert.equal(
    effectiveEntitlementStatus('active', { default_source: 'card_x' }),
    'active',
  )
  assert.equal(effectiveEntitlementStatus('canceled', {}), 'canceled')
})
