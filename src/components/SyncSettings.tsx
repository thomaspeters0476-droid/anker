import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        <h3 className="sync-title">{t('sync.title')}</h3>
        <p className="block-hint">{t('sync.notConfigured')}</p>
      </div>
    )
  }

  async function sendLink() {
    if (!emailOk) {
      onNotice?.(t('sync.noticeNeedEmailFirst'))
      return
    }
    setLocalBusy(true)
    onNotice?.(null)
    const res = await signInWithMagicLink(draft)
    setLocalBusy(false)
    if (res.ok) {
      writePendingEmail(draft.trim().toLowerCase())
      setOtp('')
      onNotice?.(t('sync.noticeCodeSent'))
    } else {
      onNotice?.(res.message)
    }
  }

  async function confirmOtp() {
    if (!emailOk) {
      onNotice?.(t('sync.noticeNeedEmailForOtp'))
      return
    }
    if (!otpOk) {
      onNotice?.(t('sync.noticeOtpLength'))
      return
    }
    setLocalBusy(true)
    onNotice?.(null)
    const res = await verifySyncOtp(draft, otp)
    setLocalBusy(false)
    if (res.ok) {
      writePendingEmail('')
      setOtp('')
      onNotice?.(t('sync.noticeSignedIn'))
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
    onNotice?.(t('sync.noticeSignedOut'))
  }

  let gateHint: string | null = null
  if (!emailOk && otpOk) {
    gateHint = t('sync.gateNeedEmail')
  } else if (emailOk && !otpOk) {
    gateHint = t('sync.gateNeedOtp')
  }

  return (
    <div className={`sync-settings${embedded ? ' sync-settings-embedded' : ''}`}>
      {!embedded && <h3 className="sync-title">{t('sync.title')}</h3>}
      <p className="block-hint">{t('sync.hint')}</p>

      {email ? (
        <>
          <p className="sync-status">
            {t('sync.connectedAs', { email })}
          </p>
          <button
            type="button"
            className="ghost"
            disabled={localBusy}
            onClick={() => void logout()}
          >
            {t('sync.signOut')}
          </button>
        </>
      ) : (
        <div className="sync-login">
          <label htmlFor="sync-email">{t('sync.emailLabel')}</label>
          <input
            id="sync-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('sync.emailPlaceholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            disabled={localBusy}
          />

          <div className="sync-otp">
            <label htmlFor="sync-otp">{t('sync.otpLabel')}</label>
            <input
              id="sync-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              placeholder={t('sync.otpPlaceholder')}
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
              {t('sync.signInWithCode')}
            </button>
            {gateHint && (
              <p className="block-hint sync-gate-hint" role="status">
                {gateHint}
              </p>
            )}
            <p className="block-hint">{t('sync.bothNeeded')}</p>
          </div>

          <button
            type="button"
            className="ghost"
            disabled={localBusy || !emailOk}
            onClick={() => void sendLink()}
          >
            {t('sync.sendNewCode')}
          </button>
        </div>
      )}

      {conflict && (
        <div
          className="sync-conflict"
          role="dialog"
          aria-label={t('sync.conflict.ariaLabel')}
        >
          <p>{t('sync.conflict.body')}</p>
          <div className="sync-conflict-actions">
            <button
              type="button"
              className="primary"
              disabled={localBusy}
              onClick={() => onKeepLocal?.()}
            >
              {t('sync.conflict.keepLocal')}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={localBusy}
              onClick={() => onUseCloud?.()}
            >
              {t('sync.conflict.useCloud')}
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
