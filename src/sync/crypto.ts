import { b64ToBuf, bufToB64, bufToUtf8, utf8ToBuf } from './bytes'

const PBKDF2_ITERATIONS = 310_000
const SALT_LEN = 16
const IV_LEN = 12
const DEK_BITS = 256

export type KeyWrap = {
  kdf: 'PBKDF2'
  iter: number
  salt: string
  iv: string
  wrappedDek: string
}

export type EncryptedBlob = {
  iv: string
  ciphertext: string
}

export type SyncEnvelopeV1 = {
  v: 1
  alg: 'AES-GCM'
  iv: string
  ciphertext: string
  wraps: {
    passphrase: KeyWrap
    recovery: KeyWrap
  }
}

export function isSyncEnvelope(raw: unknown): raw is SyncEnvelopeV1 {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    o.v === 1 &&
    typeof o.ciphertext === 'string' &&
    typeof o.iv === 'string' &&
    !!o.wraps &&
    typeof o.wraps === 'object'
  )
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  crypto.getRandomValues(out)
  return out
}

export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: DEK_BITS },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function exportDekRaw(dek: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', dek))
}

export async function importDekRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, 'AES-GCM', true, [
    'encrypt',
    'decrypt',
  ])
}

async function deriveWrapKey(
  secret: string,
  salt: Uint8Array,
  iter: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    utf8ToBuf(secret).buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: iter,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: DEK_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function wrapDek(
  dek: CryptoKey,
  secret: string,
): Promise<KeyWrap> {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const wrapKey = await deriveWrapKey(secret, salt, PBKDF2_ITERATIONS)
  const raw = await exportDekRaw(dek)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    wrapKey,
    raw.buffer as ArrayBuffer,
  )
  return {
    kdf: 'PBKDF2',
    iter: PBKDF2_ITERATIONS,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    wrappedDek: bufToB64(wrapped),
  }
}

export async function unwrapDek(
  wrap: KeyWrap,
  secret: string,
): Promise<CryptoKey> {
  const salt = b64ToBuf(wrap.salt)
  const iv = b64ToBuf(wrap.iv)
  const wrapKey = await deriveWrapKey(secret, salt, wrap.iter || PBKDF2_ITERATIONS)
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    wrapKey,
    b64ToBuf(wrap.wrappedDek).buffer as ArrayBuffer,
  )
  return importDekRaw(new Uint8Array(raw))
}

export async function encryptJson(
  dek: CryptoKey,
  value: unknown,
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_LEN)
  const plain = utf8ToBuf(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    dek,
    plain.buffer as ArrayBuffer,
  )
  return { iv: bufToB64(iv), ciphertext: bufToB64(ciphertext) }
}

export async function decryptJson<T>(
  dek: CryptoKey,
  blob: EncryptedBlob,
): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(blob.iv).buffer as ArrayBuffer },
    dek,
    b64ToBuf(blob.ciphertext).buffer as ArrayBuffer,
  )
  return JSON.parse(bufToUtf8(plain)) as T
}

export async function encryptBytes(
  dek: CryptoKey,
  data: Uint8Array,
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_LEN)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    dek,
    data.buffer as ArrayBuffer,
  )
  return { iv: bufToB64(iv), ciphertext: bufToB64(ciphertext) }
}

export async function decryptBytes(
  dek: CryptoKey,
  blob: EncryptedBlob,
): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(blob.iv).buffer as ArrayBuffer },
    dek,
    b64ToBuf(blob.ciphertext).buffer as ArrayBuffer,
  )
  return new Uint8Array(plain)
}

/** Human-friendly recovery code: 8 groups of 4 hex chars */
export function generateRecoveryCode(): string {
  const raw = randomBytes(16)
  const hex = Array.from(raw)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  const parts: string[] = []
  for (let i = 0; i < hex.length; i += 4) parts.push(hex.slice(i, i + 4))
  return parts.join('-')
}

export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[^a-fA-F0-9]/g, '').toUpperCase()
}

export function recoveryCodeForKdf(code: string): string {
  return normalizeRecoveryCode(code)
}

export function formatRecoveryCode(normalizedHex: string): string {
  const h = normalizeRecoveryCode(normalizedHex)
  const parts: string[] = []
  for (let i = 0; i < h.length; i += 4) parts.push(h.slice(i, i + 4))
  return parts.join('-')
}

export async function buildEnvelope(
  dek: CryptoKey,
  plaintext: unknown,
  passphrase: string,
  recoveryCode: string,
): Promise<SyncEnvelopeV1> {
  const body = await encryptJson(dek, plaintext)
  const passphraseWrap = await wrapDek(dek, passphrase)
  const recoveryWrap = await wrapDek(dek, recoveryCodeForKdf(recoveryCode))
  return {
    v: 1,
    alg: 'AES-GCM',
    iv: body.iv,
    ciphertext: body.ciphertext,
    wraps: {
      passphrase: passphraseWrap,
      recovery: recoveryWrap,
    },
  }
}

export async function openEnvelopeWithPassphrase(
  envelope: SyncEnvelopeV1,
  passphrase: string,
): Promise<{ dek: CryptoKey; plaintext: unknown }> {
  const dek = await unwrapDek(envelope.wraps.passphrase, passphrase)
  const plaintext = await decryptJson(dek, {
    iv: envelope.iv,
    ciphertext: envelope.ciphertext,
  })
  return { dek, plaintext }
}

export async function openEnvelopeWithRecovery(
  envelope: SyncEnvelopeV1,
  recoveryCode: string,
): Promise<{ dek: CryptoKey; plaintext: unknown }> {
  const dek = await unwrapDek(
    envelope.wraps.recovery,
    recoveryCodeForKdf(recoveryCode),
  )
  const plaintext = await decryptJson(dek, {
    iv: envelope.iv,
    ciphertext: envelope.ciphertext,
  })
  return { dek, plaintext }
}

/** Re-wrap passphrase only; keep recovery wrap + re-encrypt body with same DEK */
export async function rewrapPassphrase(
  envelope: SyncEnvelopeV1,
  dek: CryptoKey,
  plaintext: unknown,
  newPassphrase: string,
): Promise<SyncEnvelopeV1> {
  const body = await encryptJson(dek, plaintext)
  const passphraseWrap = await wrapDek(dek, newPassphrase)
  return {
    ...envelope,
    iv: body.iv,
    ciphertext: body.ciphertext,
    wraps: {
      ...envelope.wraps,
      passphrase: passphraseWrap,
    },
  }
}

export async function rotateRecovery(
  envelope: SyncEnvelopeV1,
  dek: CryptoKey,
  plaintext: unknown,
  newRecoveryCode: string,
): Promise<SyncEnvelopeV1> {
  const body = await encryptJson(dek, plaintext)
  const recoveryWrap = await wrapDek(dek, recoveryCodeForKdf(newRecoveryCode))
  return {
    ...envelope,
    iv: body.iv,
    ciphertext: body.ciphertext,
    wraps: {
      ...envelope.wraps,
      recovery: recoveryWrap,
    },
  }
}
