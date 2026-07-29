import { useState } from 'react'
import {
  isSyncConfigured,
  signInWithMagicLink,
  signOut,
  verifySyncOtp,
  type SyncConflict,
} from '../sync'

const PENDING_EMAIL_KEY = 'anker-sync-pending-email'

function readPendingEmail(): string {
  try {
    return localStorage.getItem(PENDING_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function writePendingEmail(email: string) {
  try {
    if (email) localStorage.setItem(PENDING_EMAIL_KEY, email)
    else localStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    /* ignore */
  }
}

type Props = {
  email: string | null
  busy?: boolean
  notice?: string | null
  conflict?: SyncConflict | null
  onKeepLocal?: () => void
  onUseCloud?: () => void
  onSignedOut?: () => void
  onNotice?: (msg: string | null) => void
}

export function SyncSettings({
  email,
  busy = false,
  notice = null,
  conflict = null,
  onKeepLocal,
  onUseCloud,
  onSignedOut,
  onNotice,
}: Props) {
  const configured = isSyncConfigured()
  const [draft, setDraft] = useState(() => readPendingEmail())
  const [otp, setOtp] = useState('')
  const [localBusy, setLocalBusy] = useState(false)
  const waiting = busy || localBusy

  if (!configured) {
    return (
      <div className="sync-settings">
        <h3 className="sync-title">Geräte-Sync</h3>
        <p className="block-hint">
          Sync ist auf diesem Build noch nicht konfiguriert (Supabase-Env fehlt).
        </p>
      </div>
    )
  }

  async function sendLink() {
    setLocalBusy(true)
    onNotice?.(null)
    const res = await signInWithMagicLink(draft)
    setLocalBusy(false)
    if (res.ok) {
      writePendingEmail(draft.trim().toLowerCase())
      setOtp('')
      onNotice?.(
        'Mail von Tagesanker unterwegs (Betreff mit „Tagesanker“ und Code). Code unten eintippen.',
      )
    } else {
      onNotice?.(res.message)
    }
  }

  async function confirmOtp() {
    setLocalBusy(true)
    onNotice?.(null)
    const res = await verifySyncOtp(draft, otp)
    setLocalBusy(false)
    if (res.ok) {
      writePendingEmail('')
      setOtp('')
      onNotice?.('Angemeldet — Geräte werden abgeglichen.')
    } else {
      onNotice?.(res.message)
    }
  }

  async function logout() {
    setLocalBusy(true)
    await signOut()
    setLocalBusy(false)
    writePendingEmail('')
    setOtp('')
    onSignedOut?.()
    onNotice?.('Abgemeldet. Daten bleiben auf diesem Gerät; Sync pausiert.')
  }

  return (
    <div className="sync-settings">
      <h3 className="sync-title">Geräte-Sync</h3>
      <p className="block-hint">
        Optional. Ohne Anmeldung bleibt alles nur auf diesem Gerät. Mit E-Mail-Code
        teilst du Tagesstand und Einstellungen zwischen Geräten.
      </p>

      {email ? (
        <>
          <p className="sync-status">
            Verbunden als <strong>{email}</strong>
          </p>
          <button
            type="button"
            className="ghost"
            disabled={waiting}
            onClick={() => void logout()}
          >
            Abmelden
          </button>
        </>
      ) : (
        <div className="sync-login">
          <label htmlFor="sync-email">Deine E-Mail (wie in der Sync-Mail)</label>
          <input
            id="sync-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="z. B. name@beispiel.de"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            disabled={waiting}
          />

          <div className="sync-otp">
            <label htmlFor="sync-otp">6-stelliger Code aus der Mail</label>
            <input
              id="sync-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              placeholder="123456"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              maxLength={6}
              disabled={waiting}
            />
            <button
              type="button"
              className="primary"
              disabled={waiting || !draft.trim() || otp.length !== 6}
              onClick={() => void confirmOtp()}
            >
              Mit Code anmelden
            </button>
            <p className="block-hint">
              Code schon in der Mail? Nur E-Mail + Code eintragen und anmelden —
              kein erneutes Senden nötig.
            </p>
          </div>

          <button
            type="button"
            className="ghost"
            disabled={waiting || !draft.trim()}
            onClick={() => void sendLink()}
          >
            Neuen Code per Mail senden
          </button>
        </div>
      )}

      {conflict && (
        <div className="sync-conflict" role="dialog" aria-label="Sync-Konflikt">
          <p>
            Cloud und dieses Gerät haben unterschiedliche Stände mit gleichem
            Zeitstempel. Was behalten?
          </p>
          <div className="sync-conflict-actions">
            <button
              type="button"
              className="primary"
              disabled={waiting}
              onClick={() => onKeepLocal?.()}
            >
              Dieses Gerät
            </button>
            <button
              type="button"
              className="ghost"
              disabled={waiting}
              onClick={() => onUseCloud?.()}
            >
              Cloud
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className="block-hint sync-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
