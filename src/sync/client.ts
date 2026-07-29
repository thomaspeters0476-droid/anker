import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

let client: SupabaseClient | null = null

export function isSyncConfigured(): boolean {
  return Boolean(url && anonKey)
}

export function getSupabase(): SupabaseClient | null {
  if (!isSyncConfigured()) return null
  if (!client) {
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
