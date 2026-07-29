export { isSyncConfigured, getSupabase, syncRedirectTo } from './client'
export {
  getSession,
  getUser,
  signInWithMagicLink,
  verifySyncOtp,
  signOut,
  onAuthChange,
} from './auth'
export {
  syncNow,
  schedulePush,
  pushSnapshot,
  resolveKeepLocal,
  resolveUseCloud,
  type SyncResult,
  type SyncConflict,
} from './sync'
export { pushSparkNow, deleteSparkRemote } from './sparkSync'
export { isVaultUnlocked, clearCachedDek, loadCachedDek } from './vault'
