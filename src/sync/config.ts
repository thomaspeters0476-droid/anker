/** Sync-Env ohne Supabase-Import — für Early-Checks im App-Shell. */
export function isSyncConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  return Boolean(url && anonKey)
}

export function syncEnv() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  }
}
