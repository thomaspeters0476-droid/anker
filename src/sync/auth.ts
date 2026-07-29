import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSyncConfigured } from './client'

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

export async function signInWithMagicLink(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSyncConfigured()) {
    return { ok: false, message: 'Sync ist noch nicht konfiguriert.' }
  }
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, message: 'Bitte eine gültige E-Mail eingeben.' }
  }

  try {
    const res = await fetch('/api/sync-request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      message?: string
      error?: string
    }
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message:
          data.message ||
          data.error ||
          'Code konnte nicht gesendet werden.',
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Netzwerkfehler beim Senden.' }
  }
}

/** 6-digit code from Tagesanker Resend mail */
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
    return {
      ok: false,
      message: 'Bitte den 6-stelligen Code aus der Mail eingeben.',
    }
  }

  try {
    const res = await fetch('/api/sync-verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, code }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      message?: string
      error?: string
      session?: { access_token: string; refresh_token: string }
    }
    if (!res.ok || !data.ok || !data.session) {
      return {
        ok: false,
        message: data.message || data.error || 'Code ungültig.',
      }
    }
    const { error } = await sb.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Netzwerkfehler beim Anmelden.' }
  }
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
