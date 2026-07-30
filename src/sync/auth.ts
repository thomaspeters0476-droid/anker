import type { Session, User } from '@supabase/supabase-js'
import i18n, { ensureI18n } from '../i18n'
import { getSupabase, isSyncConfigured } from './client'

function syncMsg(key: string): string {
  ensureI18n()
  return i18n.t(`sync.errors.${key}`)
}

/** Map API error codes → locale string (never show server DE copy). */
function messageFromApiError(error?: string): string {
  switch (error) {
    case 'no_code':
      return syncMsg('noCode')
    case 'expired':
      return syncMsg('codeExpired')
    case 'too_many_attempts':
      return syncMsg('tooManyAttempts')
    case 'bad_code':
      return syncMsg('badCode')
    case 'session_failed':
    case 'session_link_failed':
      return syncMsg('sessionFailed')
    case 'sync_otp_not_configured':
    case 'mail_not_configured':
      return syncMsg('notConfigured')
    case 'mail_domain':
      return syncMsg('mailDomain')
    case 'mail_failed':
    case 'mail_rejected':
      return syncMsg('sendFailed')
    case 'invalid_email':
    case 'invalid_input':
      return syncMsg('invalidEmail')
    default:
      return syncMsg('generic')
  }
}

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
    return { ok: false, message: syncMsg('notConfigured') }
  }
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, message: syncMsg('invalidEmail') }
  }

  const locale = i18n.language === 'en' ? 'en' : 'de'

  try {
    const res = await fetch('/api/sync-request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, locale }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
    }
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message: data.error
          ? messageFromApiError(data.error)
          : syncMsg('sendFailed'),
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: syncMsg('networkSend') }
  }
}

/** 6-digit code from Tagesanker Resend mail */
export async function verifySyncOtp(
  email: string,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb || !isSyncConfigured()) {
    return { ok: false, message: syncMsg('notConfigured') }
  }
  const normalized = email.trim().toLowerCase()
  const code = token.replace(/\s/g, '')
  if (!normalized || !/^\d{6}$/.test(code)) {
    return { ok: false, message: syncMsg('needSixDigit') }
  }

  try {
    const res = await fetch('/api/sync-verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, code }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
      session?: { access_token: string; refresh_token: string }
    }
    if (!res.ok || !data.ok || !data.session) {
      return {
        ok: false,
        message: data.error
          ? messageFromApiError(data.error)
          : syncMsg('invalidCode'),
      }
    }
    const { error } = await sb.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (error) return { ok: false, message: syncMsg('sessionFailed') }
    return { ok: true }
  } catch {
    return { ok: false, message: syncMsg('networkSignIn') }
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
