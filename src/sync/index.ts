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
