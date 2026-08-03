/**
 * Reine Zugangs-/Trial-Regeln — ohne DB/Stripe-SDK.
 * Getestet via npm test (wie Schwundbuch: node:test + tsx).
 */

export type ChopTier = 'tagesanker' | 'schublade' | 'bundle'

export type EntitlementStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'

/** Stripe Checkout: Trial-Länge in Tagen */
export const TRIAL_PERIOD_DAYS = 7

/**
 * Ohne Zahlungsmittel startet kein Trial.
 * Stripe: payment_method_collection=always (nicht if_required).
 */
export const CHECKOUT_PAYMENT_METHOD_COLLECTION = 'always' as const

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

export function mapStripeSubscriptionStatus(
  status: string,
): EntitlementStatus {
  if (status === 'trialing') return 'trialing'
  if (status === 'active') return 'active'
  if (status === 'past_due') return 'past_due'
  if (status === 'unpaid') return 'unpaid'
  if (status === 'canceled') return 'canceled'
  return 'canceled'
}

/** Minimales Shape — Stripe Subscription Felder für PM-Check */
export type PaymentMethodCarrier = {
  default_payment_method?: string | { id?: string } | null
  default_source?: string | { id?: string } | null
}

export function subscriptionHasPaymentMethod(
  sub: PaymentMethodCarrier,
): boolean {
  if (sub.default_payment_method) return true
  if (sub.default_source) return true
  return false
}

/**
 * Effektiver Status für Freischaltung.
 * Regel: Trial/Abo ohne Zahlungsmittel zählt nicht.
 */
export function effectiveEntitlementStatus(
  stripeStatus: string,
  sub: PaymentMethodCarrier,
): EntitlementStatus {
  const status = mapStripeSubscriptionStatus(stripeStatus)
  if (
    (status === 'trialing' || status === 'active') &&
    !subscriptionHasPaymentMethod(sub)
  ) {
    return 'none'
  }
  return status
}
