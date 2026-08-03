import {
  buildEnvelope,
  formatRecoveryCode,
  generateDek,
  generateRecoveryCode,
  isSyncEnvelope,
  MIN_PASSPHRASE_LEN,
  normalizeRecoveryCode,
  openEnvelopeWithPassphrase,
  openEnvelopeWithRecovery,
  rewrapPassphrase,
  rotateRecovery,
  type SyncEnvelopeV1,
} from './crypto'
import { purgePersistedVaultSecrets } from './secretStore'

export type VaultStatus =
  | { state: 'locked' }
  | { state: 'unlocked'; userId: string }
  | { state: 'needs_setup' }

let memoryDek: { userId: string; key: CryptoKey } | null = null
let purgedLegacy = false

function ensureLegacyPurged() {
  if (purgedLegacy) return
  purgedLegacy = true
  purgePersistedVaultSecrets()
}

export function clearVaultMemory(): void {
  memoryDek = null
}

export async function cacheDek(userId: string, dek: CryptoKey): Promise<void> {
  ensureLegacyPurged()
  memoryDek = { userId, key: dek }
}

/** Nur Session-Memory — kein localStorage. */
export async function loadCachedDek(userId: string): Promise<CryptoKey | null> {
  ensureLegacyPurged()
  if (memoryDek?.userId === userId) return memoryDek.key
  return null
}

export function clearCachedDek(userId: string): void {
  if (memoryDek?.userId === userId) memoryDek = null
  purgePersistedVaultSecrets()
}

/** @deprecated Recovery wird nicht mehr lokal gespeichert — nur UI-State nach Setup/Regen. */
export function getCachedRecoveryCode(_userId: string): string | null {
  return null
}

export function setCachedRecoveryCode(_userId: string, _code: string): void {
  /* no-op — absichtlich nicht persistieren */
}

export async function getUnlockedDek(userId: string): Promise<CryptoKey | null> {
  return loadCachedDek(userId)
}

export function isVaultUnlocked(userId: string): boolean {
  ensureLegacyPurged()
  return memoryDek?.userId === userId
}

/** After login: setup if no envelope / no session DEK */
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

/**
 * Recovery-Unlock: neues Passwort + neuer Recovery-Code (alter Recovery ungültig).
 * Neuer Code nur einmal an die UI zurück — nicht speichern.
 */
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
  const newRecovery = generateRecoveryCode()
  let envelope = await rewrapPassphrase(
    params.envelope,
    dek,
    plaintext,
    params.newPassphrase,
  )
  envelope = await rotateRecovery(envelope, dek, plaintext, newRecovery)
  await cacheDek(params.userId, dek)
  return {
    plaintext,
    envelope,
    recoveryCode: formatRecoveryCode(newRecovery),
  }
}

export async function changePassphrase(params: {
  userId: string
  envelope: SyncEnvelopeV1
  plaintext: unknown
  newPassphrase: string
}): Promise<SyncEnvelopeV1> {
  const dek = await getUnlockedDek(params.userId)
  if (!dek) throw new Error('vault_locked')
  return rewrapPassphrase(
    params.envelope,
    dek,
    params.plaintext,
    params.newPassphrase,
  )
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

export {
  isSyncEnvelope,
  type SyncEnvelopeV1,
  formatRecoveryCode,
  normalizeRecoveryCode,
  MIN_PASSPHRASE_LEN,
}
