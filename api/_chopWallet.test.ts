import assert from 'node:assert/strict'
import test from 'node:test'
import { remainingPurchaseBalance } from './_chopWallet.ts'

test('remainingPurchaseBalance — nur Pack-Rest nach Abo-Consume', () => {
  assert.equal(
    remainingPurchaseBalance([
      { delta: 100, reason: 'abo_grant' },
      { delta: 35, reason: 'purchase' },
      { delta: -40, reason: 'consume' },
      { delta: -10, reason: 'consume' },
    ]),
    35,
  )
})

test('remainingPurchaseBalance — Consume frisst zuerst Abo', () => {
  assert.equal(
    remainingPurchaseBalance([
      { delta: 100, reason: 'abo_grant' },
      { delta: 35, reason: 'purchase' },
      { delta: -110, reason: 'consume' },
    ]),
    25,
  )
})

test('remainingPurchaseBalance — alles Abo verbraucht', () => {
  assert.equal(
    remainingPurchaseBalance([
      { delta: 100, reason: 'abo_grant' },
      { delta: -100, reason: 'consume' },
    ]),
    0,
  )
})

test('remainingPurchaseBalance — entitlement_revoke ignorieren', () => {
  assert.equal(
    remainingPurchaseBalance([
      { delta: 100, reason: 'abo_grant' },
      { delta: 35, reason: 'purchase' },
      { delta: -100, reason: 'entitlement_revoke' },
    ]),
    35,
  )
})
