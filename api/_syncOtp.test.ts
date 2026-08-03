import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emailSendCooldownActive,
  hashOtpCode,
} from './_syncOtp.ts'

test('hashOtpCode — pepper beeinflusst Hash', () => {
  const a = hashOtpCode('a@b.de', '123456', 'pepper-a')
  const b = hashOtpCode('a@b.de', '123456', 'pepper-b')
  assert.notEqual(a, b)
  assert.equal(a.length, 64)
})

test('emailSendCooldownActive — frisch erstellt = aktiv', () => {
  assert.equal(emailSendCooldownActive(new Date().toISOString()), true)
  assert.equal(
    emailSendCooldownActive(new Date(Date.now() - 120_000).toISOString()),
    false,
  )
  assert.equal(emailSendCooldownActive(null), false)
})
