import type { Spark } from '../types'
import { b64ToBuf, bufToB64 } from './bytes'
import { decryptBytes, encryptBytes, type EncryptedBlob } from './crypto'
import { getSupabase } from './client'
import { getSession } from './auth'

export const SYNC_BLOB_BUCKET = 'sync-blobs'

export type CloudSpark = {
  id: string
  createdAt: string
  mode: Spark['mode']
  text?: string
  audioMimeType?: string
  hasDrawing?: boolean
  hasAudio?: boolean
}

function pathFor(userId: string, sparkId: string, kind: 'drawing' | 'audio') {
  return `${userId}/${sparkId}/${kind}.enc.json`
}

function parseDataUrl(dataUrl: string): Uint8Array | null {
  const m = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl)
  if (!m?.[1]) return null
  try {
    return b64ToBuf(m[1])
  } catch {
    return null
  }
}

function toDataUrl(mime: string, bytes: Uint8Array): string {
  return `data:${mime};base64,${bufToB64(bytes)}`
}

async function uploadEnc(
  userId: string,
  sparkId: string,
  kind: 'drawing' | 'audio',
  dek: CryptoKey,
  bytes: Uint8Array,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const enc = await encryptBytes(dek, bytes)
  const body = JSON.stringify(enc)
  const { error } = await sb.storage
    .from(SYNC_BLOB_BUCKET)
    .upload(pathFor(userId, sparkId, kind), body, {
      contentType: 'application/json',
      upsert: true,
    })
  return !error
}

async function downloadEnc(
  userId: string,
  sparkId: string,
  kind: 'drawing' | 'audio',
  dek: CryptoKey,
): Promise<Uint8Array | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.storage
    .from(SYNC_BLOB_BUCKET)
    .download(pathFor(userId, sparkId, kind))
  if (error || !data) return null
  try {
    const text = await data.text()
    const blob = JSON.parse(text) as EncryptedBlob
    return decryptBytes(dek, blob)
  } catch {
    return null
  }
}

export async function deleteSparkBlobs(
  userId: string,
  sparkId: string,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.storage
    .from(SYNC_BLOB_BUCKET)
    .remove([
      pathFor(userId, sparkId, 'drawing'),
      pathFor(userId, sparkId, 'audio'),
    ])
}

/** Upload media for one spark immediately. Returns cloud meta (no data URLs). */
export async function pushSparkBlobs(
  dek: CryptoKey,
  spark: Spark,
): Promise<CloudSpark> {
  const session = await getSession()
  if (!session) throw new Error('not_signed_in')
  const userId = session.user.id
  const cloud: CloudSpark = {
    id: spark.id,
    createdAt: spark.createdAt,
    mode: spark.mode,
    text: spark.text,
    audioMimeType: spark.audioMimeType,
  }

  if (spark.drawingDataUrl) {
    const bytes = parseDataUrl(spark.drawingDataUrl)
    if (bytes) {
      const ok = await uploadEnc(userId, spark.id, 'drawing', dek, bytes)
      if (!ok) throw new Error('blob_upload_failed')
      cloud.hasDrawing = true
    }
  }
  if (spark.audioDataUrl) {
    const bytes = parseDataUrl(spark.audioDataUrl)
    if (bytes) {
      const ok = await uploadEnc(userId, spark.id, 'audio', dek, bytes)
      if (!ok) throw new Error('blob_upload_failed')
      cloud.hasAudio = true
      cloud.audioMimeType = spark.audioMimeType || 'audio/webm'
    }
  }
  return cloud
}

export async function hydrateSparkFromCloud(
  dek: CryptoKey,
  userId: string,
  cloud: CloudSpark,
): Promise<Spark> {
  const spark: Spark = {
    id: cloud.id,
    createdAt: cloud.createdAt,
    mode: cloud.mode,
    text: cloud.text,
    audioMimeType: cloud.audioMimeType,
  }
  if (cloud.hasDrawing) {
    const bytes = await downloadEnc(userId, cloud.id, 'drawing', dek)
    if (bytes) spark.drawingDataUrl = toDataUrl('image/png', bytes)
  }
  if (cloud.hasAudio) {
    const bytes = await downloadEnc(userId, cloud.id, 'audio', dek)
    if (bytes) {
      spark.audioDataUrl = toDataUrl(
        cloud.audioMimeType || 'audio/webm',
        bytes,
      )
    }
  }
  return spark
}

export function sparkToCloudStub(spark: Spark): CloudSpark {
  return {
    id: spark.id,
    createdAt: spark.createdAt,
    mode: spark.mode,
    text: spark.text,
    audioMimeType: spark.audioMimeType,
    hasDrawing: Boolean(spark.drawingDataUrl),
    hasAudio: Boolean(spark.audioDataUrl),
  }
}

export async function pushAllSparkBlobs(
  dek: CryptoKey,
  sparks: Spark[],
): Promise<CloudSpark[]> {
  const out: CloudSpark[] = []
  for (const s of sparks) {
    out.push(await pushSparkBlobs(dek, s))
  }
  return out
}

export async function hydrateAllSparks(
  dek: CryptoKey,
  userId: string,
  clouds: CloudSpark[],
): Promise<Spark[]> {
  const out: Spark[] = []
  for (const c of clouds) {
    out.push(await hydrateSparkFromCloud(dek, userId, c))
  }
  return out
}
