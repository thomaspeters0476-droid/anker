import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CHOP_ABO_MONTHLY_CREDITS,
  CHOP_PACK_ORDER,
  CHOP_PACKS,
  formatEuroFromCents,
} from './chopPacks.ts'

test('KI-Pakete S/M/L — Credits und Preise', () => {
  assert.deepEqual(CHOP_PACK_ORDER, ['s', 'm', 'l'])
  assert.equal(CHOP_PACKS.s.credits, 35)
  assert.equal(CHOP_PACKS.s.priceCents, 99)
  assert.equal(CHOP_PACKS.m.credits, 120)
  assert.equal(CHOP_PACKS.l.credits, 333)
  assert.ok(CHOP_PACKS.m.storePriceCents >= CHOP_PACKS.m.priceCents)
  assert.ok(CHOP_PACKS.l.storePriceCents >= CHOP_PACKS.l.priceCents)
})

test('Abo-KI-Kontingent — Anker 0, Schublade/Bundle > 0', () => {
  assert.equal(CHOP_ABO_MONTHLY_CREDITS.tagesanker, 0)
  assert.ok(CHOP_ABO_MONTHLY_CREDITS.schublade > 0)
  assert.ok(
    CHOP_ABO_MONTHLY_CREDITS.bundle >= CHOP_ABO_MONTHLY_CREDITS.schublade,
  )
})

test('formatEuroFromCents', () => {
  const de = formatEuroFromCents(349, 'de')
  assert.match(de, /3[,.]49/)
  assert.match(de, /€/)
})
