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

function looksLikeEmail(value: string): boolean {
  const v = value.trim()
  return v.includes('@') && v.includes('.') && v.length >= 5
}

type Props = {
  email: string | null
  notice?: string | null
  conflict?: SyncConflict | null
  onKeepLocal?: () => void
  onUseCloud?: () => void
  onSignedOut?: () => void
  onNotice?: (msg: string | null) => void
  /** Nested under settings section — skip duplicate heading */
  embedded?: boolean
}

export function SyncSettings({
  email,
  notice = null,
  conflict = null,
  onKeepLocal,
  onUseCloud,
  onSignedOut,
  onNotice,
  embedded = false,
}: Props) {
  const configured = isSyncConfigured()
  const [draft, setDraft] = useState(() => readPendingEmail())
  const [otp, setOtp] = useState('')
  const [localBusy, setLocalBusy] = useState(false)

  const emailOk = looksLikeEmail(draft)
  const otpOk = otp.length === 6
  const canSignIn = emailOk && otpOk && !localBusy

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
    if (!emailOk) {
      onNotice?.('Bitte zuerst deine E-Mail-Adresse eintragen (nicht den Code).')
      return
    }
    setLocalBusy(true)
    onNotice?.(null)
    const res = await signInWithMagicLink(draft)
    setLocalBusy(false)
    if (res.ok) {
      writePendingEmail(draft.trim().toLowerCase())
      setOtp('')
      onNotice?.(
        'Mail von Tagesanker unterwegs. Code unten eintippen, dann „Mit Code anmelden“.',
      )
    } else {
      onNotice?.(res.message)
    }
  }

  async function confirmOtp() {
    if (!emailOk) {
      onNotice?.(
        'Oben noch die E-Mail eintragen (dieselbe Adresse wie in der Mail) — der Code allein reicht nicht.',
      )
      return
    }
    if (!otpOk) {
      onNotice?.('Der Code braucht genau 6 Ziffern.')
      return
    }
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

  let gateHint: string | null = null
  if (!emailOk && otpOk) {
    gateHint =
      'Noch die E-Mail oben eintragen — dann wird „Mit Code anmelden“ aktiv.'
  } else if (emailOk && !otpOk) {
    gateHint = 'Code: noch 6 Ziffern aus der Mail eintragen.'
  }

  return (
    <div className={`sync-settings${embedded ? ' sync-settings-embedded' : ''}`}>
      {!embedded && <h3 className="sync-title">Geräte-Sync</h3>}
      <p className="block-hint">
        Optional. Ohne Anmeldung bleibt alles nur auf diesem Gerät.
      </p>

      {email ? (
        <>
          <p className="sync-status">
            Verbunden als <strong>{email}</strong>
          </p>
          <button
            type="button"
            className="ghost"
            disabled={localBusy}
            onClick={() => void logout()}
          >
            Abmelden
          </button>
        </>
      ) : (
        <div className="sync-login">
          <label htmlFor="sync-email">1. Deine E-Mail (nicht der Code)</label>
          <input
            id="sync-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="z. B. name@beispiel.de"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            disabled={localBusy}
          />

          <div className="sync-otp">
            <label htmlFor="sync-otp">2. Sechs Ziffern aus der Mail</label>
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
              disabled={localBusy}
            />
            <button
              type="button"
              className="primary"
              disabled={!canSignIn}
              onClick={() => void confirmOtp()}
            >
              Mit Code anmelden
            </button>
            {gateHint && (
              <p className="block-hint sync-gate-hint" role="status">
                {gateHint}
              </p>
            )}
            <p className="block-hint">
              Beides nötig: E-Mail-Adresse + Code. Kein neues Senden, wenn die
              Mail schon da ist.
            </p>
          </div>

          <button
            type="button"
            className="ghost"
            disabled={localBusy || !emailOk}
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
              disabled={localBusy}
              onClick={() => onKeepLocal?.()}
            >
              Dieses Gerät
            </button>
            <button
              type="button"
              className="ghost"
              disabled={localBusy}
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
