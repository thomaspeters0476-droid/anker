import type { Spark } from '../types'
import { getSyncSnapshot, setLocalUpdatedAt } from '../storage'
import { getSession } from './auth'
import { deleteSparkBlobs, pushSparkBlobs } from './blobStore'
import { pushSnapshot, schedulePush } from './sync'
import { getUnlockedDek, isVaultUnlocked } from './vault'

/** Immediate encrypted upload for one spark, then snapshot push. */
export async function pushSparkNow(spark: Spark): Promise<void> {
  const session = await getSession()
  if (!session) return
  const userId = session.user.id
  if (!isVaultUnlocked(userId)) return
  const dek = await getUnlockedDek(userId)
  if (!dek) return

  try {
    await pushSparkBlobs(dek, spark)
    setLocalUpdatedAt(new Date().toISOString())
    await pushSnapshot(getSyncSnapshot())
  } catch {
    schedulePush(800)
  }
}

export async function deleteSparkRemote(sparkId: string): Promise<void> {
  const session = await getSession()
  if (!session) return
  const userId = session.user.id
  if (!isVaultUnlocked(userId)) return
  try {
    await deleteSparkBlobs(userId, sparkId)
    setLocalUpdatedAt(new Date().toISOString())
    schedulePush(200)
  } catch {
    schedulePush(800)
  }
}
