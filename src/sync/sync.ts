import {
  applySyncSnapshot,
  getLocalUpdatedAt,
  getSyncSnapshot,
  hasMeaningfulLocalData,
  setLocalUpdatedAt,
  type SyncSnapshot,
} from '../storage'
import type { DayState, Spark } from '../types'
import type { CarryItem, Prefs } from '../storage'
import i18n, { ensureI18n } from '../i18n'
import { getSupabase } from './client'
import { getSession } from './auth'

function syncMsg(key: string): string {
  ensureI18n()
  return i18n.t(`sync.errors.${key}`)
}

type UserStateRow = {
  user_id: string
  payload: unknown
  updated_at: string
}

export type RemoteState = {
  updatedAt: string
  payload: SyncSnapshotPayload
}

/** Cloud payload — same shape as local snapshot minus updatedAt nesting */
export type SyncSnapshotPayload = {
  day: DayState | null
  prefs: Prefs
  carry: CarryItem[]
  sparks: Spark[]
}

export type SyncConflict = {
  local: SyncSnapshot
  remote: RemoteState
}

export type SyncResult =
  | { status: 'idle' }
  | { status: 'skipped' }
  | { status: 'applied_remote'; day: DayState }
  | { status: 'pushed_local' }
  | { status: 'conflict'; conflict: SyncConflict }
  | { status: 'error'; message: string }

function asPayload(raw: unknown): SyncSnapshotPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    day: (o.day as DayState | null) ?? null,
    prefs: o.prefs as Prefs,
    carry: Array.isArray(o.carry) ? (o.carry as CarryItem[]) : [],
    sparks: Array.isArray(o.sparks) ? (o.sparks as Spark[]) : [],
  }
}

function snapshotToPayload(snap: SyncSnapshot): SyncSnapshotPayload {
  return {
    day: snap.day,
    prefs: snap.prefs,
    carry: snap.carry,
    sparks: snap.sparks,
  }
}

function payloadsEqual(a: SyncSnapshotPayload, b: SyncSnapshotPayload): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export async function fetchRemoteState(): Promise<
  | { ok: true; remote: RemoteState | null }
  | { ok: false; message: string }
> {
  const sb = getSupabase()
  const session = await getSession()
  if (!sb || !session) return { ok: true, remote: null }

  const { data, error } = await sb
    .from('user_state')
    .select('user_id, payload, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) return { ok: false, message: syncMsg('generic') }
  if (!data) return { ok: true, remote: null }

  const row = data as UserStateRow
  const payload = asPayload(row.payload)
  if (!payload || !payload.prefs) {
    return { ok: false, message: syncMsg('invalidCloudData') }
  }
  return {
    ok: true,
    remote: { updatedAt: row.updated_at, payload },
  }
}

export async function pushSnapshot(
  snap: SyncSnapshot = getSyncSnapshot(),
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase()
  const session = await getSession()
  if (!sb || !session) return { ok: false, message: syncMsg('notSignedIn') }

  const updatedAt = snap.updatedAt || new Date().toISOString()
  const { error } = await sb.from('user_state').upsert(
    {
      user_id: session.user.id,
      payload: snapshotToPayload(snap),
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    const msg = /payload|size|too large|bytes/i.test(error.message)
      ? syncMsg('payloadTooLarge')
      : syncMsg('generic')
    return { ok: false, message: msg }
  }
  setLocalUpdatedAt(updatedAt)
  return { ok: true }
}

export function applyRemote(remote: RemoteState): DayState {
  return applySyncSnapshot({
    updatedAt: remote.updatedAt,
    ...remote.payload,
  })
}

export async function resolveKeepLocal(
  conflict: SyncConflict,
): Promise<SyncResult> {
  const pushed = await pushSnapshot(conflict.local)
  if (!pushed.ok) return { status: 'error', message: pushed.message }
  return { status: 'pushed_local' }
}

export async function resolveUseCloud(
  conflict: SyncConflict,
): Promise<SyncResult> {
  const day = applyRemote(conflict.remote)
  return { status: 'applied_remote', day }
}

/**
 * Pull remote and merge with local (last-write-wins).
 * Returns conflict when both sides have data and timestamps match but payloads differ.
 */
export async function syncNow(options?: {
  preferConflictPrompt?: boolean
}): Promise<SyncResult> {
  const sb = getSupabase()
  const session = await getSession()
  if (!sb || !session) return { status: 'skipped' }

  const remoteRes = await fetchRemoteState()
  if (!remoteRes.ok) return { status: 'error', message: remoteRes.message }

  const local = getSyncSnapshot()
  const remote = remoteRes.remote
  const localMeaningful = hasMeaningfulLocalData()

  if (!remote) {
    if (!localMeaningful) return { status: 'idle' }
    const pushed = await pushSnapshot(local)
    if (!pushed.ok) return { status: 'error', message: pushed.message }
    return { status: 'pushed_local' }
  }

  if (!localMeaningful) {
    const day = applyRemote(remote)
    return { status: 'applied_remote', day }
  }

  const localMs = Date.parse(local.updatedAt) || 0
  const remoteMs = Date.parse(remote.updatedAt) || 0
  const localPayload = snapshotToPayload(local)

  if (remoteMs > localMs) {
    const day = applyRemote(remote)
    return { status: 'applied_remote', day }
  }
  if (localMs > remoteMs) {
    const pushed = await pushSnapshot(local)
    if (!pushed.ok) return { status: 'error', message: pushed.message }
    return { status: 'pushed_local' }
  }

  // Equal timestamps
  if (payloadsEqual(localPayload, remote.payload)) return { status: 'idle' }

  if (options?.preferConflictPrompt !== false) {
    return {
      status: 'conflict',
      conflict: { local, remote },
    }
  }

  // Default without UI: keep local
  const pushed = await pushSnapshot(local)
  if (!pushed.ok) return { status: 'error', message: pushed.message }
  return { status: 'pushed_local' }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function schedulePush(delayMs = 1500): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void (async () => {
      const session = await getSession()
      if (!session) return
      const local = getSyncSnapshot()
      if (!getLocalUpdatedAt()) return
      await pushSnapshot(local)
    })()
  }, delayMs)
}
