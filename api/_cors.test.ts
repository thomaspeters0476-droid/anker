import { describe, expect, it } from 'vitest'
import { isAllowedCorsOrigin } from './_cors.js'

describe('isAllowedCorsOrigin', () => {
  it('allows Capacitor and production origins', () => {
    expect(isAllowedCorsOrigin('https://localhost')).toBe(true)
    expect(isAllowedCorsOrigin('capacitor://localhost')).toBe(true)
    expect(isAllowedCorsOrigin('https://tagesanker.de')).toBe(true)
    expect(isAllowedCorsOrigin('http://127.0.0.1:5173')).toBe(true)
  })

  it('rejects unknown origins', () => {
    expect(isAllowedCorsOrigin('')).toBe(false)
    expect(isAllowedCorsOrigin('https://evil.example')).toBe(false)
  })
})
