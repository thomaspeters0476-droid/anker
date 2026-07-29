import { getSupabase } from './client'
import { getSession } from './auth'

export type RealtimeUnsub = () => void

/**
 * Live updates when this user's `user_state` row changes (other device push).
 * Caller should run syncNow / pull. Own pushes also fire — syncNow is idempotent.
 */
export function subscribeUserState(
  onChange: () => void,
): RealtimeUnsub {
  const sb = getSupabase()
  if (!sb) return () => {}

  let active = true
  let channel: ReturnType<typeof sb.channel> | null = null
  let debounce: ReturnType<typeof setTimeout> | null = null

  const fire = () => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      debounce = null
      if (active) onChange()
    }, 350)
  }

  void (async () => {
    const session = await getSession()
    if (!session || !active) return
    const userId = session.user.id

    channel = sb
      .channel(`user_state:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_state',
          filter: `user_id=eq.${userId}`,
        },
        () => fire(),
      )
      .subscribe()
  })()

  return () => {
    active = false
    if (debounce) clearTimeout(debounce)
    if (channel) {
      void sb.removeChannel(channel)
      channel = null
    }
  }
}
