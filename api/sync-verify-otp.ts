import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS = 8

function hashCode(email: string, code: string): string {
  const pepper = process.env.SYNC_OTP_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || 'anker'
  return createHash('sha256').update(`${email}:${code}:${pepper}`).digest('hex')
}

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

  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const code = String(req.body?.code ?? '').replace(/\D/g, '')
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' })
  }

  const sb = adminClient()
  if (!sb) {
    return res.status(503).json({
      ok: false,
      error: 'sync_otp_not_configured',
      message: 'SUPABASE_SERVICE_ROLE_KEY fehlt.',
    })
  }

  const { data: row, error: readError } = await sb
    .from('sync_otp')
    .select('code_hash, expires_at, attempts')
    .eq('email', email)
    .maybeSingle()

  if (readError) {
    return res.status(500).json({ ok: false, error: readError.message })
  }
  if (!row) {
    return res.status(400).json({
      ok: false,
      error: 'no_code',
      message: 'Kein Code offen — bitte zuerst „Neuen Code per Mail senden“.',
    })
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await sb.from('sync_otp').delete().eq('email', email)
    return res.status(429).json({
      ok: false,
      error: 'too_many_attempts',
      message: 'Zu viele Versuche. Bitte neuen Code senden.',
    })
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    await sb.from('sync_otp').delete().eq('email', email)
    return res.status(400).json({
      ok: false,
      error: 'expired',
      message: 'Code abgelaufen. Bitte neuen Code senden.',
    })
  }
  if (row.code_hash !== hashCode(email, code)) {
    await sb
      .from('sync_otp')
      .update({ attempts: row.attempts + 1 })
      .eq('email', email)
    return res.status(400).json({
      ok: false,
      error: 'bad_code',
      message: 'Code stimmt nicht. Nochmal prüfen.',
    })
  }

  await sb.from('sync_otp').delete().eq('email', email)

  const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError || !linkData?.properties?.hashed_token) {
    return res.status(500).json({
      ok: false,
      error: linkError?.message || 'session_link_failed',
    })
  }

  const { data: verified, error: verifyError } = await sb.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })
  if (verifyError || !verified.session) {
    return res.status(500).json({
      ok: false,
      error: verifyError?.message || 'session_failed',
      message: 'Anmeldung nach Code-Check fehlgeschlagen.',
    })
  }

  return res.status(200).json({
    ok: true,
    session: {
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    },
  })
}
