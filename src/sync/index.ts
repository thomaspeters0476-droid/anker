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
  deleteAccountAndLocalData,
  wipeLocalDeviceData,
} from './deleteAccount'
export {
  syncNow,
  schedulePush,
  pushSnapshot,
  resolveKeepLocal,
  resolveUseCloud,
  type SyncResult,
  type SyncConflict,
} from './sync'
export { pushSparkNow, deleteSparkRemote, retryPendingSync } from './sparkSync'
export { isVaultUnlocked, clearCachedDek, loadCachedDek } from './vault'
export { subscribeUserState } from './realtime'
export {
  flushSyncOutbox,
  outboxPendingCount,
  enqueueSnapshotPush,
} from './outbox'
