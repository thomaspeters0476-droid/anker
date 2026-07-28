import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'

type MailSpark = {
  id: string
  createdAt: string
  mode: 'note' | 'draw' | 'audio'
  text?: string
  drawingDataUrl?: string
  audioDataUrl?: string
  audioMimeType?: string
  omitted?: Array<'drawing' | 'audio'>
}

type Body = {
  email?: string
  retentionDays?: number
  sparks?: MailSpark[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function modeLabel(mode: MailSpark['mode']): string {
  if (mode === 'note') return 'Notiz'
  if (mode === 'draw') return 'Skizze'
  return 'Audio'
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl)
  if (!m) return null
  return { mime: m[1], base64: m[2] }
}

function extForMime(mime: string, fallback: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return fallback
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || process.env.ANKER_RESEND_FROM
  if (!apiKey || !from) {
    return res.status(503).json({
      ok: false,
      error: 'mail_not_configured',
      message: 'RESEND_API_KEY / RESEND_FROM fehlen auf Vercel.',
    })
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  const sparks = Array.isArray(body.sparks) ? body.sparks : []
  const retentionDays = Number(body.retentionDays) || 7

  if (!EMAIL_RE.test(email) || email.length > 120) {
    return res.status(400).json({ ok: false, error: 'invalid_email' })
  }
  if (sparks.length === 0) {
    return res.status(400).json({ ok: false, error: 'no_sparks' })
  }
  if (sparks.length > 40) {
    return res.status(400).json({ ok: false, error: 'too_many_sparks' })
  }

  const attachments: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }> = []

  const lines: string[] = [
    'Tagesanker — abgelaufene Geistesblitze',
    '',
    `Diese Ideen waren länger als ${retentionDays} Tage in der App und werden danach gelöscht.`,
    'Kein Archiv-Druck — nur eine Kopie für dich.',
    '',
  ]

  sparks.forEach((s, i) => {
    const when = new Date(s.createdAt)
    const whenLabel = Number.isNaN(when.getTime())
      ? s.createdAt
      : when.toLocaleString('de-DE')
    lines.push(`— ${i + 1}. ${modeLabel(s.mode)} · ${whenLabel}`)
    if (s.text?.trim()) lines.push(s.text.trim())
    if (s.omitted?.includes('drawing')) {
      lines.push('(Skizze war zu groß für die Mail — bitte vorher in der App exportieren.)')
    }
    if (s.omitted?.includes('audio')) {
      lines.push('(Audio war zu groß für die Mail — bitte vorher in der App exportieren.)')
    }

    if (s.drawingDataUrl) {
      const parsed = parseDataUrl(s.drawingDataUrl)
      if (parsed) {
        const ext = extForMime(parsed.mime, 'png')
        attachments.push({
          filename: `skizze-${i + 1}.${ext}`,
          content: Buffer.from(parsed.base64, 'base64'),
          contentType: parsed.mime,
        })
        lines.push(`→ Anhang: skizze-${i + 1}.${ext}`)
      }
    }
    if (s.audioDataUrl) {
      const parsed = parseDataUrl(s.audioDataUrl)
      if (parsed) {
        const mime = s.audioMimeType || parsed.mime
        const ext = extForMime(mime, 'webm')
        attachments.push({
          filename: `audio-${i + 1}.${ext}`,
          content: Buffer.from(parsed.base64, 'base64'),
          contentType: mime,
        })
        lines.push(`→ Anhang: audio-${i + 1}.${ext}`)
      }
    }
    lines.push('')
  })

  lines.push('—')
  lines.push('Gesendet von Tagesanker · tagesanker.de')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `Tagesanker: ${sparks.length} Geistesblitz${sparks.length === 1 ? '' : 'e'} (nach ${retentionDays} Tagen)`,
    text: lines.join('\n'),
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })

  if (error) {
    console.error('resend error', error)
    return res.status(502).json({ ok: false, error: 'send_failed' })
  }

  return res.status(200).json({ ok: true, count: sparks.length })
}
