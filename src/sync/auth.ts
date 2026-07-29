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

/** 6-digit code from the Tagesanker mail — avoids relying on link clicks */
export async function verifySyncOtp(
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb || !isSyncConfigured()) {
    return { ok: false, message: 'Sync ist noch nicht konfiguriert.' }
  }
  const normalized = email.trim().toLowerCase()
  const code = token.replace(/\s/g, '')
  if (!normalized || !/^\d{6}$/.test(code)) {
    return { ok: false, message: 'Bitte den 6-stelligen Code aus der Mail eingeben.' }
  }

  const types = ['email', 'magiclink', 'signup'] as const
  let lastMessage = 'Code ungültig oder abgelaufen.'
  for (const type of types) {
    const { error } = await sb.auth.verifyOtp({
      email: normalized,
      token: code,
      type,
    })
    if (!error) return { ok: true }
    lastMessage = error.message
  }
  return { ok: false, message: lastMessage }
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
