import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSyncConfigured, syncRedirectTo } from './client'

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.auth.getSession()
  if (error) return null
  return data.session
}

export async function getUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

export async function signInWithMagicLink(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb || !isSyncConfigured()) {
    return { ok: false, message: 'Sync ist noch nicht konfiguriert.' }
  }
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, message: 'Bitte eine gültige E-Mail eingeben.' }
  }
  const { error } = await sb.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: syncRedirectTo(),
      shouldCreateUser: true,
    },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    cb(session)
  })
  return () => data.subscription.unsubscribe()
}
