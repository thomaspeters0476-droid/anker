import type { Spark } from '../types'
import { getSyncSnapshot, setLocalUpdatedAt } from '../storage'
import { getSession } from './auth'
import { deleteSparkBlobs, pushSparkBlobs } from './blobStore'
import { pushSnapshot } from './sync'
import { getUnlockedDek, isVaultUnlocked } from './vault'

const OUTBOX_KEY = 'anker-sync-outbox'

export type OutboxJob =
  | { id: string; type: 'spark_push'; sparkId: string; at: string }
  | { id: string; type: 'spark_delete'; sparkId: string; at: string }
  | { id: string; type: 'snapshot'; at: string }

function readOutbox(): OutboxJob[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    return Array.isArray(data) ? (data as OutboxJob[]) : []
  } catch {
    return []
  }
}

function writeOutbox(jobs: OutboxJob[]): void {
  try {
    if (jobs.length === 0) localStorage.removeItem(OUTBOX_KEY)
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify(jobs))
  } catch {
    /* ignore */
  }
}

function jobId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function outboxPendingCount(): number {
  return readOutbox().length
}

export function isProbablyOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Dedupe: one snapshot job; spark jobs keep latest per sparkId+type. */
export function enqueueOutbox(
  job:
    | { type: 'snapshot'; at?: string }
    | { type: 'spark_push'; sparkId: string; at?: string }
    | { type: 'spark_delete'; sparkId: string; at?: string },
): void {
  const at = job.at ?? new Date().toISOString()
  let jobs = readOutbox()

  if (job.type === 'snapshot') {
    jobs = jobs.filter((j) => j.type !== 'snapshot')
    jobs.push({ id: jobId(), type: 'snapshot', at })
  } else if (job.type === 'spark_push') {
    jobs = jobs.filter(
      (j) => !(j.type === 'spark_push' && j.sparkId === job.sparkId),
    )
    jobs = jobs.filter(
      (j) => !(j.type === 'spark_delete' && j.sparkId === job.sparkId),
    )
    jobs.push({
      id: jobId(),
      type: 'spark_push',
      sparkId: job.sparkId,
      at,
    })
  } else {
    jobs = jobs.filter(
      (j) =>
        !(
          (j.type === 'spark_delete' || j.type === 'spark_push') &&
          j.sparkId === job.sparkId
        ),
    )
    jobs.push({
      id: jobId(),
      type: 'spark_delete',
      sparkId: job.sparkId,
      at,
    })
  }

  writeOutbox(jobs)
}

let flushing = false

/**
 * Process queued sync work. Safe to call often (online, visibility, realtime).
 * Returns number of jobs still pending after the run.
 */
export async function flushSyncOutbox(): Promise<number> {
  if (flushing) return outboxPendingCount()
  if (isProbablyOffline()) return outboxPendingCount()

  const session = await getSession()
  if (!session) return outboxPendingCount()
  const userId = session.user.id
  if (!isVaultUnlocked(userId)) return outboxPendingCount()
  const dek = await getUnlockedDek(userId)
  if (!dek) return outboxPendingCount()

  flushing = true
  try {
    let jobs = readOutbox()
    if (jobs.length === 0) return 0

    const remaining: OutboxJob[] = []
    let needSnapshot = false
    const snap = getSyncSnapshot()
    const byId = new Map(snap.sparks.map((s) => [s.id, s]))

    for (const job of jobs) {
      try {
        if (job.type === 'spark_push') {
          const spark = byId.get(job.sparkId)
          if (!spark) continue // gone locally — drop
          await pushSparkBlobs(dek, spark)
          needSnapshot = true
        } else if (job.type === 'spark_delete') {
          await deleteSparkBlobs(userId, job.sparkId)
          needSnapshot = true
        } else {
          needSnapshot = true
        }
      } catch {
        remaining.push(job)
      }
    }

    if (needSnapshot && remaining.length === 0) {
      setLocalUpdatedAt(new Date().toISOString())
      const pushed = await pushSnapshot(getSyncSnapshot())
      if (!pushed.ok) {
        remaining.push({
          id: jobId(),
          type: 'snapshot',
          at: new Date().toISOString(),
        })
      }
    } else if (needSnapshot && remaining.some((j) => j.type === 'snapshot')) {
      /* already queued */
    } else if (needSnapshot && remaining.length > 0) {
      remaining.push({
        id: jobId(),
        type: 'snapshot',
        at: new Date().toISOString(),
      })
    }

    writeOutbox(remaining)
    return remaining.length
  } finally {
    flushing = false
  }
}

export function enqueueSparkPush(spark: Spark): void {
  enqueueOutbox({ type: 'spark_push', sparkId: spark.id })
}

export function enqueueSparkDelete(sparkId: string): void {
  enqueueOutbox({ type: 'spark_delete', sparkId })
}

export function enqueueSnapshotPush(): void {
  enqueueOutbox({ type: 'snapshot' })
}
