import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSyncConfigured, syncEnv } from './config'

export { isSyncConfigured } from './config'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSyncConfigured()) return null
  if (!client) {
    const { url, anonKey } = syncEnv()
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  }
  return client
}

export function syncRedirectTo(): string {
  if (typeof window === 'undefined') return 'https://tagesanker.de/app'
  return `${window.location.origin}/app`
}
