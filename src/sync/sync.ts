import {
  applySyncSnapshot,
  getLastSyncedAt,
  getLocalUpdatedAt,
  getSyncSnapshot,
  hasMeaningfulLocalData,
  markSynced,
  type SyncSnapshot,
  type CarryItem,
  type Prefs,
} from '../storage'
import type { DayState, Spark } from '../types'
import type { DrawerState } from '../drawer/types'
import { emptyDrawer } from '../drawer/logic'
import i18n, { ensureI18n } from '../i18n'
import { getSupabase } from './client'
import { getSession } from './auth'
import {
  hydrateAllSparks,
  pushAllSparkBlobs,
  type CloudSpark,
} from './blobStore'
import { decryptJson, encryptJson, isSyncEnvelope, type SyncEnvelopeV1 } from './crypto'
import {
  getUnlockedDek,
  isVaultUnlocked,
} from './vault'
import {
  enqueueSnapshotPush,
  flushSyncOutbox,
  isProbablyOffline,
} from './outbox'

function syncMsg(key: string): string {
  ensureI18n()
  return i18n.t(`sync.errors.${key}`)
}

type UserStateRow = {
  user_id: string
  payload: unknown
  updated_at: string
}

/** Plaintext shape inside the envelope (sparks without heavy data URLs). */
export type SyncSnapshotPayload = {
  day: DayState | null
  prefs: Prefs
  carry: CarryItem[]
  sparks: CloudSpark[]
  drawer?: DrawerState
}

export type RemoteState = {
  updatedAt: string
  payload: SyncSnapshotPayload
  envelope: SyncEnvelopeV1 | null
  legacyPlain: boolean
}

export type SyncConflict = {
  local: SyncSnapshot
  remote: RemoteState
}

export type SyncResult =
  | { status: 'idle' }
  | { status: 'skipped' }
  | { status: 'vault_locked' }
  | { status: 'vault_setup_required' }
  | { status: 'applied_remote'; day: DayState }
  | { status: 'pushed_local' }
  | { status: 'conflict'; conflict: SyncConflict }
  | { status: 'error'; message: string }

function asPlainPayload(raw: unknown): SyncSnapshotPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!o.prefs) return null
  const sparksRaw = Array.isArray(o.sparks) ? o.sparks : []
  const sparks: CloudSpark[] = sparksRaw.map((s) => {
    const x = s as Spark & CloudSpark
    return {
      id: x.id,
      createdAt: x.createdAt,
      mode: x.mode,
      text: x.text,
      audioMimeType: x.audioMimeType,
      hasDrawing: x.hasDrawing ?? Boolean(x.drawingDataUrl),
      hasAudio: x.hasAudio ?? Boolean(x.audioDataUrl),
    }
  })
  return {
    day: (o.day as DayState | null) ?? null,
    prefs: o.prefs as Prefs,
    carry: Array.isArray(o.carry) ? (o.carry as CarryItem[]) : [],
    sparks,
    drawer:
      o.drawer && typeof o.drawer === 'object'
        ? {
            items: Array.isArray((o.drawer as DrawerState).items)
              ? (o.drawer as DrawerState).items
              : [],
            readyCapLatched: Boolean(
              (o.drawer as DrawerState).readyCapLatched,
            ),
          }
        : emptyDrawer(),
  }
}

function stripDaySparksMedia(day: DayState | null): DayState | null {
  if (!day) return null
  return {
    ...day,
    sparks: (day.sparks ?? []).map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      mode: s.mode,
      text: s.text,
      audioMimeType: s.audioMimeType,
    })),
  }
}

export async function fetchRemoteRaw(): Promise<
  | { ok: true; updatedAt: string; payload: unknown }
  | { ok: true; empty: true }
  | { ok: false; message: string }
> {
  const sb = getSupabase()
  const session = await getSession()
  if (!sb || !session) return { ok: true, empty: true }

  const { data, error } = await sb
    .from('user_state')
    .select('user_id, payload, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) return { ok: false, message: syncMsg('generic') }
  if (!data) return { ok: true, empty: true }
  const row = data as UserStateRow
  return { ok: true, updatedAt: row.updated_at, payload: row.payload }
}

export async function writeEnvelope(
  envelope: SyncEnvelopeV1,
  updatedAt = new Date().toISOString(),
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase()
  const session = await getSession()
  if (!sb || !session) return { ok: false, message: syncMsg('notSignedIn') }

  const { error } = await sb.from('user_state').upsert(
    {
      user_id: session.user.id,
      payload: envelope,
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
  markSynced(updatedAt)
  return { ok: true }
}

async function buildCloudPlaintext(
  snap: SyncSnapshot,
  dek: CryptoKey,
): Promise<SyncSnapshotPayload> {
  const cloudSparks = await pushAllSparkBlobs(dek, snap.sparks)
  return {
    day: stripDaySparksMedia(snap.day),
    prefs: snap.prefs,
    carry: snap.carry,
    sparks: cloudSparks,
    drawer: snap.drawer ?? emptyDrawer(),
  }
}

export async function pushSnapshot(
  snap: SyncSnapshot = getSyncSnapshot(),
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getSession()
  if (!session) return { ok: false, message: syncMsg('notSignedIn') }
  const userId = session.user.id
  const dek = await getUnlockedDek(userId)
  if (!dek) return { ok: false, message: syncMsg('vaultLocked') }

  try {
    const plain = await buildCloudPlaintext(snap, dek)
    const raw = await fetchRemoteRaw()
    if (!raw.ok) return { ok: false, message: raw.message }

    let wraps: SyncEnvelopeV1['wraps'] | null = null
    if (!('empty' in raw) && isSyncEnvelope(raw.payload)) {
      wraps = raw.payload.wraps
    }
    if (!wraps) {
      return { ok: false, message: syncMsg('vaultSetupRequired') }
    }

    const body = await encryptJson(dek, plain)
    const envelope: SyncEnvelopeV1 = {
      v: 1,
      alg: 'AES-GCM',
      iv: body.iv,
      ciphertext: body.ciphertext,
      wraps,
    }
    const updatedAt = snap.updatedAt || new Date().toISOString()
    return writeEnvelope(envelope, updatedAt)
  } catch {
    return { ok: false, message: syncMsg('generic') }
  }
}

async function decryptRemote(
  userId: string,
  updatedAt: string,
  payload: unknown,
): Promise<
  | { ok: true; remote: RemoteState }
  | { ok: false; message: string; kind?: 'locked' | 'setup' }
> {
  const dek = await getUnlockedDek(userId)

  if (isSyncEnvelope(payload)) {
    if (!dek) return { ok: false, message: syncMsg('vaultLocked'), kind: 'locked' }
    try {
      const plain = await decryptJson<SyncSnapshotPayload>(dek, {
        iv: payload.iv,
        ciphertext: payload.ciphertext,
      })
      return {
        ok: true,
        remote: {
          updatedAt,
          payload: plain,
          envelope: payload,
          legacyPlain: false,
        },
      }
    } catch {
      return { ok: false, message: syncMsg('decryptFailed') }
    }
  }

  // Legacy plaintext — readable without vault; migration needed
  const plain = asPlainPayload(payload)
  if (!plain) return { ok: false, message: syncMsg('invalidCloudData') }
  return {
    ok: true,
    remote: {
      updatedAt,
      payload: plain,
      envelope: null,
      legacyPlain: true,
    },
  }
}

export async function fetchRemoteState(): Promise<
  | { ok: true; remote: RemoteState | null }
  | { ok: false; message: string; kind?: 'locked' | 'setup' }
> {
  const session = await getSession()
  if (!session) return { ok: true, remote: null }
  const raw = await fetchRemoteRaw()
  if (!raw.ok) return { ok: false, message: raw.message }
  if ('empty' in raw) return { ok: true, remote: null }
  return decryptRemote(session.user.id, raw.updatedAt, raw.payload)
}

export async function applyRemote(remote: RemoteState): Promise<DayState> {
  const session = await getSession()
  const userId = session?.user.id
  let sparks: Spark[] = []
  if (userId) {
    const dek = await getUnlockedDek(userId)
    if (dek && !remote.legacyPlain) {
      sparks = await hydrateAllSparks(dek, userId, remote.payload.sparks)
    } else {
      // Legacy: sparks may still contain data URLs in old payloads
      sparks = remote.payload.sparks as unknown as Spark[]
    }
  }

  const dayPatch = remote.payload.day
    ? { ...remote.payload.day, sparks }
    : null

  const day = applySyncSnapshot({
    updatedAt: remote.updatedAt,
    day: dayPatch,
    prefs: remote.payload.prefs,
    carry: remote.payload.carry,
    sparks,
    drawer: remote.payload.drawer ?? emptyDrawer(),
  })
  markSynced(remote.updatedAt)
  return day
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
  const day = await applyRemote(conflict.remote)
  return { status: 'applied_remote', day }
}

function payloadsEqual(a: SyncSnapshotPayload, b: SyncSnapshotPayload): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export async function syncNow(options?: {
  preferConflictPrompt?: boolean
}): Promise<SyncResult> {
  if (isProbablyOffline()) return { status: 'skipped' }
  const sb = getSupabase()
  const session = await getSession()
  if (!sb || !session) return { status: 'skipped' }

  const userId = session.user.id
  const raw = await fetchRemoteRaw()
  if (!raw.ok) return { status: 'error', message: raw.message }

  if (!('empty' in raw) && isSyncEnvelope(raw.payload) && !isVaultUnlocked(userId)) {
    const dek = await getUnlockedDek(userId)
    if (!dek) return { status: 'vault_locked' }
  }

  if (
    (('empty' in raw) || (!isSyncEnvelope(raw.payload) && raw.payload)) &&
    !isVaultUnlocked(userId)
  ) {
    // Empty cloud or legacy: need setup before we can push encrypted
    if ('empty' in raw || (raw.ok && !isSyncEnvelope(raw.payload))) {
      const dek = await getUnlockedDek(userId)
      if (!dek) return { status: 'vault_setup_required' }
    }
  }

  const remoteRes = await fetchRemoteState()
  if (!remoteRes.ok) {
    if (remoteRes.kind === 'locked') return { status: 'vault_locked' }
    return { status: 'error', message: remoteRes.message }
  }

  const local = getSyncSnapshot()
  const remote = remoteRes.remote
  const localMeaningful = hasMeaningfulLocalData()

  if (!remote) {
    if (!localMeaningful) return { status: 'idle' }
    if (!isVaultUnlocked(userId)) return { status: 'vault_setup_required' }
    const pushed = await pushSnapshot(local)
    if (!pushed.ok) {
      if (pushed.message === syncMsg('vaultSetupRequired')) {
        return { status: 'vault_setup_required' }
      }
      return { status: 'error', message: pushed.message }
    }
    return { status: 'pushed_local' }
  }

  if (remote.legacyPlain && !isVaultUnlocked(userId)) {
    return { status: 'vault_setup_required' }
  }

  if (!localMeaningful) {
    const day = await applyRemote(remote)
    return { status: 'applied_remote', day }
  }

  const localMs = Date.parse(local.updatedAt) || 0
  const remoteMs = Date.parse(remote.updatedAt) || 0
  const baselineMs = Date.parse(getLastSyncedAt()) || 0

  // Compare without hydrating full media for equality check
  const localCloudish: SyncSnapshotPayload = {
    day: stripDaySparksMedia(local.day),
    prefs: local.prefs,
    carry: local.carry,
    sparks: local.sparks.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      mode: s.mode,
      text: s.text,
      audioMimeType: s.audioMimeType,
      hasDrawing: Boolean(s.drawingDataUrl),
      hasAudio: Boolean(s.audioDataUrl),
    })),
    drawer: local.drawer ?? emptyDrawer(),
  }

  if (payloadsEqual(localCloudish, remote.payload)) {
    markSynced(remote.updatedAt)
    return { status: 'idle' }
  }

  // Variante 1: beide Seiten seit letztem Sync geändert → nachfragen
  const localDiverged = baselineMs > 0 ? localMs > baselineMs : true
  const remoteDiverged = baselineMs > 0 ? remoteMs > baselineMs : true

  if (
    localDiverged &&
    remoteDiverged &&
    options?.preferConflictPrompt !== false
  ) {
    return {
      status: 'conflict',
      conflict: { local, remote },
    }
  }

  if (remoteDiverged && !localDiverged) {
    const day = await applyRemote(remote)
    return { status: 'applied_remote', day }
  }
  if (localDiverged && !remoteDiverged) {
    const pushed = await pushSnapshot(local)
    if (!pushed.ok) return { status: 'error', message: pushed.message }
    return { status: 'pushed_local' }
  }

  // Keine Baseline / unklar — lieber fragen als still überschreiben
  if (options?.preferConflictPrompt !== false) {
    return {
      status: 'conflict',
      conflict: { local, remote },
    }
  }

  if (remoteMs > localMs) {
    const day = await applyRemote(remote)
    return { status: 'applied_remote', day }
  }
  const pushed = await pushSnapshot(local)
  if (!pushed.ok) return { status: 'error', message: pushed.message }
  return { status: 'pushed_local' }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

/** Plan/drawer/prefs: längerer Debounce. Sparks nutzen weiter kurze Delays. */
export function schedulePush(delayMs = 1600): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void (async () => {
      const session = await getSession()
      if (!session) return
      if (!isVaultUnlocked(session.user.id)) return
      if (isProbablyOffline()) {
        enqueueSnapshotPush()
        return
      }
      const pending = await flushSyncOutbox()
      if (pending > 0) return
      const local = getSyncSnapshot()
      if (!getLocalUpdatedAt()) return
      const pushed = await pushSnapshot(local)
      if (!pushed.ok) enqueueSnapshotPush()
    })()
  }, delayMs)
}
