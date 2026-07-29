import {
  buildEnvelope,
  exportDekRaw,
  formatRecoveryCode,
  generateDek,
  generateRecoveryCode,
  importDekRaw,
  isSyncEnvelope,
  normalizeRecoveryCode,
  openEnvelopeWithPassphrase,
  openEnvelopeWithRecovery,
  rewrapPassphrase,
  rotateRecovery,
  type SyncEnvelopeV1,
} from './crypto'
import { bufToB64, b64ToBuf } from './bytes'
import {
  dekCacheKey,
  getLocalSecret,
  recoveryCacheKey,
  removeLocalSecret,
  setLocalSecret,
} from './secretStore'

export type VaultStatus =
  | { state: 'locked' }
  | { state: 'unlocked'; userId: string }
  | { state: 'needs_setup' }

let memoryDek: { userId: string; key: CryptoKey } | null = null

export function clearVaultMemory(): void {
  memoryDek = null
}

export async function cacheDek(userId: string, dek: CryptoKey): Promise<void> {
  memoryDek = { userId, key: dek }
  const raw = await exportDekRaw(dek)
  setLocalSecret(dekCacheKey(userId), bufToB64(raw))
}

export async function loadCachedDek(userId: string): Promise<CryptoKey | null> {
  if (memoryDek?.userId === userId) return memoryDek.key
  const b64 = getLocalSecret(dekCacheKey(userId))
  if (!b64) return null
  try {
    const dek = await importDekRaw(b64ToBuf(b64))
    memoryDek = { userId, key: dek }
    return dek
  } catch {
    removeLocalSecret(dekCacheKey(userId))
    return null
  }
}

export function clearCachedDek(userId: string): void {
  if (memoryDek?.userId === userId) memoryDek = null
  removeLocalSecret(dekCacheKey(userId))
  removeLocalSecret(recoveryCacheKey(userId))
}

export function getCachedRecoveryCode(userId: string): string | null {
  const raw = getLocalSecret(recoveryCacheKey(userId))
  return raw ? formatRecoveryCode(raw) : null
}

export function setCachedRecoveryCode(userId: string, code: string): void {
  setLocalSecret(recoveryCacheKey(userId), normalizeRecoveryCode(code))
}

export async function getUnlockedDek(userId: string): Promise<CryptoKey | null> {
  return loadCachedDek(userId)
}

export function isVaultUnlocked(userId: string): boolean {
  return memoryDek?.userId === userId || !!getLocalSecret(dekCacheKey(userId))
}

/** After login: setup if no envelope / no local DEK */
export async function resolveVaultStatus(
  userId: string,
  remotePayload: unknown,
): Promise<'unlocked' | 'needs_setup' | 'locked' | 'legacy_plaintext'> {
  const cached = await loadCachedDek(userId)
  if (cached) return 'unlocked'
  if (!remotePayload) return 'needs_setup'
  if (isSyncEnvelope(remotePayload)) return 'locked'
  return 'legacy_plaintext'
}

export async function setupVault(params: {
  userId: string
  passphrase: string
  plaintext: unknown
}): Promise<{ envelope: SyncEnvelopeV1; recoveryCode: string }> {
  const dek = await generateDek()
  const recoveryCode = generateRecoveryCode()
  const envelope = await buildEnvelope(
    dek,
    params.plaintext,
    params.passphrase,
    recoveryCode,
  )
  await cacheDek(params.userId, dek)
  setCachedRecoveryCode(params.userId, recoveryCode)
  return { envelope, recoveryCode }
}

export async function unlockWithPassphrase(params: {
  userId: string
  envelope: SyncEnvelopeV1
  passphrase: string
}): Promise<{ plaintext: unknown }> {
  const { dek, plaintext } = await openEnvelopeWithPassphrase(
    params.envelope,
    params.passphrase,
  )
  await cacheDek(params.userId, dek)
  return { plaintext }
}

export async function unlockWithRecovery(params: {
  userId: string
  envelope: SyncEnvelopeV1
  recoveryCode: string
  newPassphrase: string
}): Promise<{ plaintext: unknown; envelope: SyncEnvelopeV1; recoveryCode: string }> {
  const { dek, plaintext } = await openEnvelopeWithRecovery(
    params.envelope,
    params.recoveryCode,
  )
  const recoveryCode = params.recoveryCode
  const envelope = await rewrapPassphrase(
    params.envelope,
    dek,
    plaintext,
    params.newPassphrase,
  )
  await cacheDek(params.userId, dek)
  setCachedRecoveryCode(params.userId, recoveryCode)
  return { plaintext, envelope, recoveryCode: formatRecoveryCode(recoveryCode) }
}

export async function changePassphrase(params: {
  userId: string
  envelope: SyncEnvelopeV1
  plaintext: unknown
  newPassphrase: string
}): Promise<SyncEnvelopeV1> {
  const dek = await getUnlockedDek(params.userId)
  if (!dek) throw new Error('vault_locked')
  const next = await rewrapPassphrase(
    params.envelope,
    dek,
    params.plaintext,
    params.newPassphrase,
  )
  return next
}

export async function regenerateRecovery(params: {
  userId: string
  envelope: SyncEnvelopeV1
  plaintext: unknown
}): Promise<{ envelope: SyncEnvelopeV1; recoveryCode: string }> {
  const dek = await getUnlockedDek(params.userId)
  if (!dek) throw new Error('vault_locked')
  const recoveryCode = generateRecoveryCode()
  const envelope = await rotateRecovery(
    params.envelope,
    dek,
    params.plaintext,
    recoveryCode,
  )
  setCachedRecoveryCode(params.userId, recoveryCode)
  return { envelope, recoveryCode }
}

/**
 * Forgot password but local data exists: new DEK, overwrite cloud.
 */
export async function restoreFromLocalDevice(params: {
  userId: string
  passphrase: string
  plaintext: unknown
}): Promise<{ envelope: SyncEnvelopeV1; recoveryCode: string }> {
  clearCachedDek(params.userId)
  return setupVault(params)
}

export { isSyncEnvelope, type SyncEnvelopeV1, formatRecoveryCode, normalizeRecoveryCode }
