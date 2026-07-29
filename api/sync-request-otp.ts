import { createHash, randomInt } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_TTL_MS = 10 * 60 * 1000

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
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' })
  }

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Tagesanker <noreply@tagesanker.de>'
  const sb = adminClient()
  if (!resendKey || !sb) {
    return res.status(503).json({
      ok: false,
      error: 'sync_otp_not_configured',
      message: 'RESEND oder SUPABASE_SERVICE_ROLE_KEY fehlt.',
    })
  }

  const code = String(randomInt(100000, 999999))
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

  const { error: upsertError } = await sb.from('sync_otp').upsert(
    {
      email,
      code_hash: hashCode(email, code),
      expires_at: expiresAt,
      attempts: 0,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'email' },
  )
  if (upsertError) {
    return res.status(500).json({ ok: false, error: upsertError.message })
  }

  const locale = String(req.body?.locale ?? 'de').toLowerCase() === 'en' ? 'en' : 'de'
  const copy =
    locale === 'en'
      ? {
          subject: `Tagesanker: sync code ${code}`,
          kicker: 'Tagesanker · device sync',
          title: 'Your sync code',
          body: 'Enter this code in the app under Settings → Device sync. No link needed.',
          foot: 'Valid for about 10 minutes. If this wasn’t you: ignore.',
          text: `Tagesanker sync code: ${code}\n\nEnter it in the app under Settings → Device sync. Valid ~10 minutes.`,
        }
      : {
          subject: `Tagesanker: Sync-Code ${code}`,
          kicker: 'Tagesanker · Geräte-Sync',
          title: 'Dein Sync-Code',
          body: 'Tippe diesen Code in der App unter Einstellungen → Geräte-Sync ein. Kein Link nötig.',
          foot: 'Gültig etwa 10 Minuten. Falls du das nicht warst: ignorieren.',
          text: `Tagesanker Sync-Code: ${code}\n\nIn der App unter Einstellungen → Geräte-Sync eintippen. Gültig ca. 10 Minuten.`,
        }

  const resend = new Resend(resendKey)
  const { error: mailError } = await resend.emails.send({
    from,
    to: email,
    subject: copy.subject,
    html: `<div style="font-family:system-ui,sans-serif;max-width:32rem;color:#1c2b24;line-height:1.5">
      <p style="color:#4a5c52;margin:0 0 1rem">${copy.kicker}</p>
      <h1 style="font-size:1.35rem;margin:0 0 0.75rem">${copy.title}</h1>
      <p style="margin:0 0 1rem">${copy.body}</p>
      <p style="font-size:2rem;letter-spacing:0.2em;font-weight:700;margin:0 0 1rem">${code}</p>
      <p style="color:#4a5c52;font-size:0.85rem;margin:0">${copy.foot}</p>
    </div>`,
    text: copy.text,
  })

  if (mailError) {
    return res.status(502).json({ ok: false, error: mailError.message })
  }

  return res.status(200).json({ ok: true })
}
