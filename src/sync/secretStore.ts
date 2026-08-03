/**
 * Früher: DEK/Recovery in localStorage (XSS-/Geräte-Risiko).
 * Jetzt: nur noch Aufräumen alter Keys — Secrets liegen in Vault-Memory.
 */

const DEK_PREFIX = 'anker-sync-dek:'
const RECOVERY_PREFIX = 'anker-sync-recovery:'

/** Einmalig/idempotent: alte Klartext-Secrets aus localStorage entfernen. */
export function purgePersistedVaultSecrets(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (
        k &&
        (k.startsWith(DEK_PREFIX) || k.startsWith(RECOVERY_PREFIX))
      ) {
        keys.push(k)
      }
    }
    for (const k of keys) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

export function dekCacheKey(userId: string): string {
  return `${DEK_PREFIX}${userId}`
}

export function recoveryCacheKey(userId: string): string {
  return `${RECOVERY_PREFIX}${userId}`
}
