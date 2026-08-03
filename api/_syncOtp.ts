import { createHash, timingSafeEqual } from 'node:crypto'
import { consumeRateBucket } from './_chopWallet.js'

const EMAIL_COOLDOWN_MS = 60 * 1000
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_MAX_SENDS = 10
const VERIFY_IP_MAX = 30

/** Nur SYNC_OTP_PEPPER — kein Service-Role-Fallback. */
export function otpPepper(): string | null {
  const pepper = process.env.SYNC_OTP_PEPPER?.trim() || ''
  return pepper || null
}

export function hashOtpCode(email: string, code: string, pepper: string): string {
  return createHash('sha256').update(`${email}:${code}:${pepper}`).digest('hex')
}

export function otpHashesEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export function clientIp(req: {
  headers: Record<string, string | string[] | undefined>
}): string {
  const xf = req.headers['x-forwarded-for']
  const raw = Array.isArray(xf) ? xf[0] : xf
  if (raw) return raw.split(',')[0]?.trim() || 'unknown'
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real.trim()) return real.trim()
  return 'unknown'
}

export async function allowOtpSend(ip: string, email: string): Promise<
  | { ok: true }
  | { ok: false; error: 'rate_limited' }
> {
  const ipOk = await consumeRateBucket({
    key: `otp-send:ip:${ip}`,
    windowMs: IP_WINDOW_MS,
    max: IP_MAX_SENDS,
  })
  if (!ipOk) return { ok: false, error: 'rate_limited' }
  const emailOk = await consumeRateBucket({
    key: `otp-send:email:${email}`,
    windowMs: EMAIL_COOLDOWN_MS,
    max: 1,
  })
  if (!emailOk) return { ok: false, error: 'rate_limited' }
  return { ok: true }
}

export async function allowOtpVerify(ip: string): Promise<boolean> {
  return consumeRateBucket({
    key: `otp-verify:ip:${ip}`,
    windowMs: IP_WINDOW_MS,
    max: VERIFY_IP_MAX,
  })
}

export function emailSendCooldownActive(
  createdAtIso: string | null | undefined,
): boolean {
  if (!createdAtIso) return false
  const t = Date.parse(createdAtIso)
  if (Number.isNaN(t)) return false
  return Date.now() - t < EMAIL_COOLDOWN_MS
}

export { EMAIL_COOLDOWN_MS }
