import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  allowOtpVerify,
  clientIp,
  hashOtpCode,
  otpHashesEqual,
  otpPepper,
} from './_syncOtp.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS = 8

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const pepper = otpPepper()
  if (!pepper) {
    return res.status(503).json({ ok: false, error: 'sync_otp_not_configured' })
  }

  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const code = String(req.body?.code ?? '').replace(/\D/g, '')
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' })
  }

  const ip = clientIp(req)
  if (!(await allowOtpVerify(ip))) {
    return res.status(429).json({ ok: false, error: 'rate_limited' })
  }

  const sb = adminClient()
  if (!sb) {
    return res.status(503).json({ ok: false, error: 'sync_otp_not_configured' })
  }

  const { data: row, error: readError } = await sb
    .from('sync_otp')
    .select('code_hash, expires_at, attempts')
    .eq('email', email)
    .maybeSingle()

  if (readError) {
    return res.status(500).json({ ok: false, error: 'read_failed' })
  }

  // Einheitliche Fehler — keine OTP-State-Enumeration
  const failAuth = async (bumpAttempts: boolean) => {
    if (bumpAttempts && row) {
      const next = (row.attempts ?? 0) + 1
      if (next >= MAX_ATTEMPTS) {
        await sb.from('sync_otp').delete().eq('email', email)
      } else {
        await sb
          .from('sync_otp')
          .update({ attempts: next })
          .eq('email', email)
          .eq('attempts', row.attempts)
      }
    }
    return res.status(400).json({ ok: false, error: 'invalid_code' })
  }

  if (!row) return failAuth(false)
  if (row.attempts >= MAX_ATTEMPTS) {
    await sb.from('sync_otp').delete().eq('email', email)
    return failAuth(false)
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    await sb.from('sync_otp').delete().eq('email', email)
    return failAuth(false)
  }
  if (!otpHashesEqual(row.code_hash, hashOtpCode(email, code, pepper))) {
    return failAuth(true)
  }

  await sb.from('sync_otp').delete().eq('email', email)

  const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError || !linkData?.properties?.hashed_token) {
    return res.status(500).json({
      ok: false,
      error: 'session_link_failed',
    })
  }

  const { data: verified, error: verifyError } = await sb.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })
  if (verifyError || !verified.session) {
    return res.status(500).json({ ok: false, error: 'session_failed' })
  }

  return res.status(200).json({
    ok: true,
    session: {
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    },
  })
}
