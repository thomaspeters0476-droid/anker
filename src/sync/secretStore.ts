/**
 * Local secret cache — swap later for Capacitor Secure Storage.
 * Only used when Sync is enabled; no-op path for local-only users.
 */

const DEK_PREFIX = 'anker-sync-dek:'
const RECOVERY_PREFIX = 'anker-sync-recovery:'

export function getLocalSecret(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setLocalSecret(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota */
  }
}

export function removeLocalSecret(key: string): void {
  try {
    localStorage.removeItem(key)
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
