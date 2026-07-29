import { useState } from 'react'
import {
  isSyncConfigured,
  signInWithMagicLink,
  signOut,
  type SyncConflict,
} from '../sync'

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
  const [draft, setDraft] = useState('')
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
      onNotice?.(
        'Link unterwegs — E-Mail prüfen und öffnen. Dann bist du hier angemeldet.',
      )
    } else {
      onNotice?.(res.message)
    }
  }

  async function logout() {
    setLocalBusy(true)
    await signOut()
    setLocalBusy(false)
    onSignedOut?.()
    onNotice?.('Abgemeldet. Daten bleiben auf diesem Gerät; Sync pausiert.')
  }

  return (
    <div className="sync-settings">
      <h3 className="sync-title">Geräte-Sync</h3>
      <p className="block-hint">
        Optional. Ohne Anmeldung bleibt alles nur auf diesem Gerät. Mit Magic
        Link teilst du Tagesstand und Einstellungen zwischen Geräten.
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
          <label htmlFor="sync-email">E-Mail für Magic Link</label>
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
          <button
            type="button"
            className="primary"
            disabled={waiting || !draft.trim()}
            onClick={() => void sendLink()}
          >
            Link senden
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
