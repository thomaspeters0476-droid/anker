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
  locale?: string
  sparks?: MailSpark[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function copyFor(locale: 'de' | 'en', retentionDays: number, count: number) {
  if (locale === 'en') {
    return {
      dateLocale: 'en-GB',
      mode: { note: 'Note', draw: 'Sketch', audio: 'Audio' } as const,
      subject: `Tagesanker: ${count} spark${count === 1 ? '' : 's'} (after ${retentionDays} days)`,
      header: 'Tagesanker — expired sparks',
      intro1: `These ideas sat in the app longer than ${retentionDays} days and will be deleted after this.`,
      intro2: 'No archive pressure — just a copy for you.',
      omittedDraw: '(Sketch was too large for email — please export in the app first.)',
      omittedAudio: '(Audio was too large for email — please export in the app first.)',
      attach: '→ Attachment:',
      fileSketch: 'sketch',
      fileAudio: 'audio',
      footer: 'Sent by Tagesanker · tagesanker.de',
    }
  }
  return {
    dateLocale: 'de-DE',
    mode: { note: 'Notiz', draw: 'Skizze', audio: 'Audio' } as const,
    subject: `Tagesanker: ${count} Geistesblitz${count === 1 ? '' : 'e'} (nach ${retentionDays} Tagen)`,
    header: 'Tagesanker — abgelaufene Geistesblitze',
    intro1: `Diese Ideen waren länger als ${retentionDays} Tage in der App und werden danach gelöscht.`,
    intro2: 'Kein Archiv-Druck — nur eine Kopie für dich.',
    omittedDraw: '(Skizze war zu groß für die Mail — bitte vorher in der App exportieren.)',
    omittedAudio: '(Audio war zu groß für die Mail — bitte vorher in der App exportieren.)',
    attach: '→ Anhang:',
    fileSketch: 'skizze',
    fileAudio: 'audio',
    footer: 'Gesendet von Tagesanker · tagesanker.de',
  }
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
  const locale = String(body.locale ?? 'de').toLowerCase() === 'en' ? 'en' : 'de'
  const copy = copyFor(locale, retentionDays, sparks.length)

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

  const lines: string[] = [copy.header, '', copy.intro1, copy.intro2, '']

  sparks.forEach((s, i) => {
    const when = new Date(s.createdAt)
    const whenLabel = Number.isNaN(when.getTime())
      ? s.createdAt
      : when.toLocaleString(copy.dateLocale)
    lines.push(`— ${i + 1}. ${copy.mode[s.mode]} · ${whenLabel}`)
    if (s.text?.trim()) lines.push(s.text.trim())
    if (s.omitted?.includes('drawing')) {
      lines.push(copy.omittedDraw)
    }
    if (s.omitted?.includes('audio')) {
      lines.push(copy.omittedAudio)
    }

    if (s.drawingDataUrl) {
      const parsed = parseDataUrl(s.drawingDataUrl)
      if (parsed) {
        const ext = extForMime(parsed.mime, 'png')
        const filename = `${copy.fileSketch}-${i + 1}.${ext}`
        attachments.push({
          filename,
          content: Buffer.from(parsed.base64, 'base64'),
          contentType: parsed.mime,
        })
        lines.push(`${copy.attach} ${filename}`)
      }
    }
    if (s.audioDataUrl) {
      const parsed = parseDataUrl(s.audioDataUrl)
      if (parsed) {
        const mime = s.audioMimeType || parsed.mime
        const ext = extForMime(mime, 'webm')
        const filename = `${copy.fileAudio}-${i + 1}.${ext}`
        attachments.push({
          filename,
          content: Buffer.from(parsed.base64, 'base64'),
          contentType: mime,
        })
        lines.push(`${copy.attach} ${filename}`)
      }
    }
    lines.push('')
  })

  lines.push('—')
  lines.push(copy.footer)

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: copy.subject,
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
