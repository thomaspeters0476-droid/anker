import { getSession } from './auth'
import { clearCachedDek } from './vault'
import { clearLocalAppData } from '../storage'
import { clearEntitlementsCache } from '../billing/entitlements'
import { signOut } from './auth'
import { apiUrl } from '../native/platform'

export async function deleteAccountAndLocalData(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession()
  if (!session?.access_token || !session.user.id) {
    return { ok: false, error: 'not_signed_in' }
  }

  try {
    const res = await fetch(apiUrl('/api/delete-account'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: 'DELETE' }),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      error?: string
    } | null
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'delete_failed' }
    }
  } catch {
    return { ok: false, error: 'network' }
  }

  clearCachedDek(session.user.id)
  clearEntitlementsCache()
  clearLocalAppData()
  await signOut()
  return { ok: true }
}

/** Nur dieses Gerät — ohne Cloud-Konto. */
export function wipeLocalDeviceData() {
  clearEntitlementsCache()
  clearLocalAppData()
}
