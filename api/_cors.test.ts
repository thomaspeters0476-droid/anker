import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedCorsOrigin } from './_cors.ts'

test('isAllowedCorsOrigin — Capacitor und Produktion erlaubt', () => {
  assert.equal(isAllowedCorsOrigin('https://localhost'), true)
  assert.equal(isAllowedCorsOrigin('capacitor://localhost'), true)
  assert.equal(isAllowedCorsOrigin('https://tagesanker.de'), true)
  assert.equal(isAllowedCorsOrigin('http://127.0.0.1:5173'), true)
})

test('isAllowedCorsOrigin — unbekannte Origins abweisen', () => {
  assert.equal(isAllowedCorsOrigin(''), false)
  assert.equal(isAllowedCorsOrigin('https://evil.example'), false)
})
