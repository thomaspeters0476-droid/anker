import { isSyncConfigured } from './config'

export { isSyncConfigured } from './config'

type SyncApi = typeof import('./index')

let pending: Promise<SyncApi> | null = null

/** Supabase/Sync-Stack erst bei Bedarf laden (~200KB). */
export function loadSync(): Promise<SyncApi> {
  if (!pending) pending = import('./index')
  return pending
}

export function schedulePushLazy() {
  if (!isSyncConfigured()) return
  void loadSync().then((m) => m.schedulePush())
}
