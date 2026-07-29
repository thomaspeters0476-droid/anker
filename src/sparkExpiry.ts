import type { Spark } from './types'
import { SPARK_RETENTION_DAYS } from './storage'
import i18n, { ensureI18n } from './i18n'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Max. Data-URL-Länge für Mail-Anhänge (Vercel ~4,5 MB Body; Audio max. 60 s) */
const MAX_DRAWING_CHARS = 700_000
/** ~60 s WebM/Opus als Data-URL inkl. Base64 — bewusst großzügig */
const MAX_AUDIO_CHARS = 2_800_000

export function normalizeSparksEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidSparksEmail(value: string): boolean {
  const e = normalizeSparksEmail(value)
  return e.length > 0 && e.length <= 120 && EMAIL_RE.test(e)
}

export type MailSparkPayload = {
  id: string
  createdAt: string
  mode: Spark['mode']
  text?: string
  drawingDataUrl?: string
  audioDataUrl?: string
  audioMimeType?: string
  omitted: Array<'drawing' | 'audio'>
}

export function toMailPayload(spark: Spark): MailSparkPayload {
  const omitted: Array<'drawing' | 'audio'> = []
  let drawingDataUrl = spark.drawingDataUrl
  let audioDataUrl = spark.audioDataUrl

  if (drawingDataUrl && drawingDataUrl.length > MAX_DRAWING_CHARS) {
    omitted.push('drawing')
    drawingDataUrl = undefined
  }
  if (audioDataUrl && audioDataUrl.length > MAX_AUDIO_CHARS) {
    omitted.push('audio')
    audioDataUrl = undefined
  }

  return {
    id: spark.id,
    createdAt: spark.createdAt,
    mode: spark.mode,
    text: spark.text,
    drawingDataUrl,
    audioDataUrl,
    audioMimeType: spark.audioMimeType,
    omitted,
  }
}

export type SparkReconcileResult = {
  sparks: Spark[]
  mailed: number
  purgedWithoutMail: number
  mailFailed: boolean
  notice: string | null
}

function sparkAgeMs(s: Spark): number {
  const t = Date.parse(s.createdAt)
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY
  return Date.now() - t
}

const RETENTION_MS = SPARK_RETENTION_DAYS * 24 * 60 * 60 * 1000

export function partitionSparksByAge(sparks: Spark[]): {
  fresh: Spark[]
  expired: Spark[]
} {
  const fresh: Spark[] = []
  const expired: Spark[] = []
  for (const s of sparks) {
    const age = sparkAgeMs(s)
    if (!Number.isFinite(age) || age >= RETENTION_MS) expired.push(s)
    else fresh.push(s)
  }
  return { fresh, expired }
}

async function postExpiredSparks(
  email: string,
  expired: Spark[],
): Promise<boolean> {
  const payload = {
    email: normalizeSparksEmail(email),
    retentionDays: SPARK_RETENTION_DAYS,
    sparks: expired.map(toMailPayload),
  }
  try {
    const res = await fetch('/api/send-expired-sparks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

/**
 * Abgelaufene Geistesblitze: mit E-Mail erst senden dann löschen;
 * ohne E-Mail still löschen. Bei Mail-Fehler behalten.
 */
export async function reconcileExpiredSparks(
  sparks: Spark[],
  email: string,
): Promise<SparkReconcileResult> {
  const { fresh, expired } = partitionSparksByAge(sparks)
  if (expired.length === 0) {
    return {
      sparks,
      mailed: 0,
      purgedWithoutMail: 0,
      mailFailed: false,
      notice: null,
    }
  }

  ensureI18n()
  const mail = normalizeSparksEmail(email)
  if (isValidSparksEmail(mail)) {
    const ok = await postExpiredSparks(mail, expired)
    if (ok) {
      return {
        sparks: fresh,
        mailed: expired.length,
        purgedWithoutMail: 0,
        mailFailed: false,
        notice: i18n.t('sparkExpiry.mailed', {
          count: expired.length,
          email: mail,
        }),
      }
    }
    return {
      sparks: [...fresh, ...expired],
      mailed: 0,
      purgedWithoutMail: 0,
      mailFailed: true,
      notice: i18n.t('sparkExpiry.mailFailed'),
    }
  }

  return {
    sparks: fresh,
    mailed: 0,
    purgedWithoutMail: expired.length,
    mailFailed: false,
    notice:
      expired.length > 0
        ? i18n.t('sparkExpiry.purged', {
            count: expired.length,
            days: SPARK_RETENTION_DAYS,
          })
        : null,
  }
}
