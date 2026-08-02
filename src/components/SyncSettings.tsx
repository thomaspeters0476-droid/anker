import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSyncSnapshot, hasMeaningfulLocalData } from '../storage'
import { useOnline } from '../online'
import {
  isSyncConfigured,
  signInWithMagicLink,
  signOut,
  verifySyncOtp,
  type SyncConflict,
} from '../sync'
import { getSession } from '../sync/auth'
import { copyText, shareRecoveryCode } from '../sync/shareRecovery'
import {
  fetchRemoteRaw,
  pushSnapshot,
  writeEnvelope,
} from '../sync/sync'
import {
  changePassphrase,
  clearCachedDek,
  formatRecoveryCode,
  getCachedRecoveryCode,
  isSyncEnvelope,
  isVaultUnlocked,
  loadCachedDek,
  regenerateRecovery,
  restoreFromLocalDevice,
  setupVault,
  unlockWithPassphrase,
  unlockWithRecovery,
  type SyncEnvelopeV1,
} from '../sync/vault'
import {
  getCachedEntitlements,
  refreshEntitlements,
  startPortalSession,
} from '../billing/entitlements'

const PENDING_EMAIL_KEY = 'anker-sync-pending-email'
const MIN_PASS = 8

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

type VaultMode = 'setup' | 'unlock' | 'ready' | 'recovery' | 'restore' | 'change'

type Props = {
  email: string | null
  notice?: string | null
  conflict?: SyncConflict | null
  onKeepLocal?: () => void
  onUseCloud?: () => void
  onSignedOut?: () => void
  onNotice?: (msg: string | null) => void
  onVaultReady?: () => void
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
  onVaultReady,
  embedded = false,
}: Props) {
  const { t } = useTranslation()
  const online = useOnline()
  const configured = isSyncConfigured()
  const [draft, setDraft] = useState(() => readPendingEmail())
  const [otp, setOtp] = useState('')
  const [localBusy, setLocalBusy] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [vaultMode, setVaultMode] = useState<VaultMode>('unlock')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [envelope, setEnvelope] = useState<SyncEnvelopeV1 | null>(null)
  const [hasPortal, setHasPortal] = useState(
    () => getCachedEntitlements().hasPortal,
  )
  const [portalBusy, setPortalBusy] = useState(false)

  const emailOk = looksLikeEmail(draft)
  const otpOk = otp.length === 6
  const canSignIn = emailOk && otpOk && !localBusy

  useEffect(() => {
    if (!email) {
      setUserId(null)
      setVaultMode('unlock')
      setEnvelope(null)
      setHasPortal(false)
      return
    }
    void refreshEntitlements().then((e) => setHasPortal(e.hasPortal))
    void (async () => {
      const session = await getSession()
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (!uid) return

      const raw = await fetchRemoteRaw()
      let env: SyncEnvelopeV1 | null = null
      if (raw.ok && !('empty' in raw) && isSyncEnvelope(raw.payload)) {
        env = raw.payload
        setEnvelope(env)
      } else {
        setEnvelope(null)
      }

      const dek = await loadCachedDek(uid)
      if (dek) {
        setVaultMode('ready')
        setRecoveryCode(getCachedRecoveryCode(uid))
        return
      }
      if (!env) {
        setVaultMode('setup')
      } else {
        setVaultMode('unlock')
      }
    })()
  }, [email])

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
    const session = await getSession()
    if (session?.user.id) clearCachedDek(session.user.id)
    await signOut()
    setLocalBusy(false)
    writePendingEmail('')
    setOtp('')
    setPass('')
    setPass2('')
    setVaultMode('unlock')
    onSignedOut?.()
    onNotice?.(t('sync.noticeSignedOut'))
  }

  async function doSetup() {
    if (!userId) return
    if (pass.length < MIN_PASS) {
      onNotice?.(t('sync.errors.passphraseShort'))
      return
    }
    if (pass !== pass2) {
      onNotice?.(t('sync.errors.passphraseMismatch'))
      return
    }
    setLocalBusy(true)
    onNotice?.(null)
    try {
      const snap = getSyncSnapshot()
      const plaintext = {
        day: snap.day,
        prefs: snap.prefs,
        carry: snap.carry,
        sparks: snap.sparks.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          mode: s.mode,
          text: s.text,
          audioMimeType: s.audioMimeType,
          hasDrawing: Boolean(s.drawingDataUrl),
          hasAudio: Boolean(s.audioDataUrl),
        })),
      }
      const { envelope: env, recoveryCode: code } = await setupVault({
        userId,
        passphrase: pass,
        plaintext,
      })
      const written = await writeEnvelope(env)
      if (!written.ok) {
        onNotice?.(written.message)
        setLocalBusy(false)
        return
      }
      setEnvelope(env)
      setRecoveryCode(code)
      setShowRecovery(true)
      setPass('')
      setPass2('')
      setVaultMode('ready')
      await pushSnapshot()
      onNotice?.(t('sync.vault.noticeSetupOk'))
      onVaultReady?.()
    } catch {
      onNotice?.(t('sync.errors.generic'))
    }
    setLocalBusy(false)
  }

  async function doUnlock() {
    if (!userId || !envelope) return
    setLocalBusy(true)
    onNotice?.(null)
    try {
      await unlockWithPassphrase({
        userId,
        envelope,
        passphrase: pass,
      })
      setPass('')
      setVaultMode('ready')
      setRecoveryCode(getCachedRecoveryCode(userId))
      onNotice?.(t('sync.vault.noticeUnlocked'))
      onVaultReady?.()
    } catch {
      onNotice?.(t('sync.errors.wrongPassphrase'))
    }
    setLocalBusy(false)
  }

  async function doRecovery() {
    if (!userId || !envelope) return
    if (pass.length < MIN_PASS) {
      onNotice?.(t('sync.errors.passphraseShort'))
      return
    }
    if (pass !== pass2) {
      onNotice?.(t('sync.errors.passphraseMismatch'))
      return
    }
    setLocalBusy(true)
    try {
      const result = await unlockWithRecovery({
        userId,
        envelope,
        recoveryCode: recoveryInput,
        newPassphrase: pass,
      })
      const written = await writeEnvelope(result.envelope)
      if (!written.ok) {
        onNotice?.(written.message)
        setLocalBusy(false)
        return
      }
      setEnvelope(result.envelope)
      setRecoveryCode(result.recoveryCode)
      setShowRecovery(true)
      setPass('')
      setPass2('')
      setRecoveryInput('')
      setVaultMode('ready')
      onNotice?.(t('sync.vault.noticeUnlocked'))
      onVaultReady?.()
    } catch {
      onNotice?.(t('sync.errors.wrongRecovery'))
    }
    setLocalBusy(false)
  }

  async function doRestoreLocal() {
    if (!userId) return
    if (pass.length < MIN_PASS) {
      onNotice?.(t('sync.errors.passphraseShort'))
      return
    }
    if (pass !== pass2) {
      onNotice?.(t('sync.errors.passphraseMismatch'))
      return
    }
    if (!hasMeaningfulLocalData()) {
      onNotice?.(t('sync.errors.generic'))
      return
    }
    setLocalBusy(true)
    try {
      const snap = getSyncSnapshot()
      const plaintext = {
        day: snap.day,
        prefs: snap.prefs,
        carry: snap.carry,
        sparks: snap.sparks.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          mode: s.mode,
          text: s.text,
          audioMimeType: s.audioMimeType,
          hasDrawing: Boolean(s.drawingDataUrl),
          hasAudio: Boolean(s.audioDataUrl),
        })),
      }
      const { envelope: env, recoveryCode: code } = await restoreFromLocalDevice({
        userId,
        passphrase: pass,
        plaintext,
      })
      const written = await writeEnvelope(env)
      if (!written.ok) {
        onNotice?.(written.message)
        setLocalBusy(false)
        return
      }
      setEnvelope(env)
      setRecoveryCode(code)
      setShowRecovery(true)
      setPass('')
      setPass2('')
      setVaultMode('ready')
      await pushSnapshot()
      onNotice?.(t('sync.vault.noticeRestored'))
      onVaultReady?.()
    } catch {
      onNotice?.(t('sync.errors.generic'))
    }
    setLocalBusy(false)
  }

  async function doChangePass() {
    if (!userId || !envelope) return
    if (pass.length < MIN_PASS) {
      onNotice?.(t('sync.errors.passphraseShort'))
      return
    }
    if (pass !== pass2) {
      onNotice?.(t('sync.errors.passphraseMismatch'))
      return
    }
    setLocalBusy(true)
    try {
      const snap = getSyncSnapshot()
      const plaintext = {
        day: snap.day,
        prefs: snap.prefs,
        carry: snap.carry,
        sparks: snap.sparks.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          mode: s.mode,
          text: s.text,
          audioMimeType: s.audioMimeType,
          hasDrawing: Boolean(s.drawingDataUrl),
          hasAudio: Boolean(s.audioDataUrl),
        })),
      }
      const next = await changePassphrase({
        userId,
        envelope,
        plaintext,
        newPassphrase: pass,
      })
      const written = await writeEnvelope(next)
      if (!written.ok) {
        onNotice?.(written.message)
        setLocalBusy(false)
        return
      }
      setEnvelope(next)
      setPass('')
      setPass2('')
      setVaultMode('ready')
      onNotice?.(t('sync.vault.noticeChanged'))
    } catch {
      onNotice?.(t('sync.errors.generic'))
    }
    setLocalBusy(false)
  }

  async function doRegenRecovery() {
    if (!userId || !envelope) return
    setLocalBusy(true)
    try {
      const snap = getSyncSnapshot()
      const plaintext = {
        day: snap.day,
        prefs: snap.prefs,
        carry: snap.carry,
        sparks: snap.sparks.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          mode: s.mode,
          text: s.text,
          audioMimeType: s.audioMimeType,
          hasDrawing: Boolean(s.drawingDataUrl),
          hasAudio: Boolean(s.audioDataUrl),
        })),
      }
      const result = await regenerateRecovery({
        userId,
        envelope,
        plaintext,
      })
      const written = await writeEnvelope(result.envelope)
      if (!written.ok) {
        onNotice?.(written.message)
        setLocalBusy(false)
        return
      }
      setEnvelope(result.envelope)
      setRecoveryCode(result.recoveryCode)
      setShowRecovery(true)
      onNotice?.(t('sync.vault.noticeRegen'))
    } catch {
      onNotice?.(t('sync.errors.generic'))
    }
    setLocalBusy(false)
  }

  async function mailRecovery() {
    if (!recoveryCode || !email) return
    const result = await shareRecoveryCode({
      email,
      recoveryCode,
      subject: t('sync.vault.mailSubject'),
      body: t('sync.vault.mailBody'),
    })
    if (result === 'copied') onNotice?.(t('sync.vault.noticeCopied'))
    else if (result !== 'failed') onNotice?.(t('sync.vault.noticeMailed'))
  }

  const [showExplain, setShowExplain] = useState(false)

  let gateHint: string | null = null
  if (!emailOk && otpOk) gateHint = t('sync.gateNeedEmail')
  else if (emailOk && !otpOk) gateHint = t('sync.gateNeedOtp')

  const unlocked = Boolean(userId && isVaultUnlocked(userId))

  return (
    <div className={`sync-settings${embedded ? ' sync-settings-embedded' : ''}`}>
      {!embedded && <h3 className="sync-title">{t('sync.title')}</h3>}
      {!online && (
        <p className="block-hint" role="status">
          {t('sync.offlineHint')}
        </p>
      )}
      <p className="block-hint">{t('sync.hint')}</p>
      <p className="block-hint">{t('sync.vault.trust')}</p>
      <button
        type="button"
        className="ghost sm sync-explain-toggle"
        aria-expanded={showExplain}
        onClick={() => setShowExplain((v) => !v)}
      >
        {showExplain ? t('sync.explain.hide') : t('sync.explain.show')}
      </button>
      {showExplain && (
        <div
          className="sync-explain"
          role="region"
          aria-label={t('sync.explain.aria')}
        >
          <p>{t('sync.explain.intro')}</p>
          <ul>
            <li>
              <strong>{t('sync.explain.syncTerm')}</strong>{' '}
              {t('sync.explain.syncText')}
            </li>
            <li>
              <strong>{t('sync.explain.mailTerm')}</strong>{' '}
              {t('sync.explain.mailText')}
            </li>
            <li>
              <strong>{t('sync.explain.vaultTerm')}</strong>{' '}
              {t('sync.explain.vaultText')}
            </li>
            <li>
              <strong>{t('sync.explain.passTerm')}</strong>{' '}
              {t('sync.explain.passText')}
            </li>
            <li>
              <strong>{t('sync.explain.recoveryTerm')}</strong>{' '}
              {t('sync.explain.recoveryText')}
            </li>
          </ul>
          <p className="block-hint">{t('sync.explain.outro')}</p>
        </div>
      )}

      {email ? (
        <>
          <p className="sync-status">{t('sync.connectedAs', { email })}</p>

          {vaultMode === 'setup' && (
            <form
              className="sync-vault"
              onSubmit={(e) => {
                e.preventDefault()
                void doSetup()
              }}
            >
              <h4>{t('sync.vault.setupTitle')}</h4>
              <p className="block-hint">{t('sync.vault.setupHint')}</p>
              <label htmlFor="anker-sync-email-ro">{t('sync.emailLabel')}</label>
              <input
                id="anker-sync-email-ro"
                name="anker-sync-email"
                type="email"
                autoComplete="username"
                value={email}
                readOnly
              />
              <label htmlFor="anker-sync-pass-new">
                {t('sync.vault.passphraseLabel')}
              </label>
              <input
                id="anker-sync-pass-new"
                name="anker-sync-password"
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={localBusy}
                minLength={MIN_PASS}
              />
              <label htmlFor="anker-sync-pass-new2">
                {t('sync.vault.passphraseConfirm')}
              </label>
              <input
                id="anker-sync-pass-new2"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                disabled={localBusy}
                minLength={MIN_PASS}
              />
              <button type="submit" className="primary" disabled={localBusy}>
                {t('sync.vault.setupSubmit')}
              </button>
            </form>
          )}

          {vaultMode === 'unlock' && (
            <form
              className="sync-vault"
              onSubmit={(e) => {
                e.preventDefault()
                void doUnlock()
              }}
            >
              <h4>{t('sync.vault.unlockTitle')}</h4>
              <p className="block-hint">{t('sync.vault.unlockHint')}</p>
              <label htmlFor="anker-sync-email-unlock">
                {t('sync.emailLabel')}
              </label>
              <input
                id="anker-sync-email-unlock"
                name="anker-sync-email"
                type="email"
                autoComplete="username"
                value={email}
                readOnly
              />
              <label htmlFor="anker-sync-pass">
                {t('sync.vault.passphraseLabel')}
              </label>
              <input
                id="anker-sync-pass"
                name="anker-sync-password"
                type="password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={localBusy}
              />
              <button type="submit" className="primary" disabled={localBusy}>
                {t('sync.vault.unlockSubmit')}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={localBusy}
                onClick={() => setVaultMode('recovery')}
              >
                {t('sync.vault.forgot')}
              </button>
              {hasMeaningfulLocalData() && (
                <button
                  type="button"
                  className="ghost"
                  disabled={localBusy}
                  onClick={() => setVaultMode('restore')}
                >
                  {t('sync.vault.restoreLocalTitle')}
                </button>
              )}
            </form>
          )}

          {vaultMode === 'recovery' && (
            <form
              className="sync-vault"
              onSubmit={(e) => {
                e.preventDefault()
                void doRecovery()
              }}
            >
              <h4>{t('sync.vault.recoveryTitle')}</h4>
              <label htmlFor="anker-sync-recovery">
                {t('sync.vault.recoveryLabel')}
              </label>
              <input
                id="anker-sync-recovery"
                type="text"
                autoComplete="off"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                disabled={localBusy}
              />
              <label htmlFor="anker-sync-pass-rec">
                {t('sync.vault.recoveryNewPass')}
              </label>
              <input
                id="anker-sync-pass-rec"
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={localBusy}
              />
              <label htmlFor="anker-sync-pass-rec2">
                {t('sync.vault.passphraseConfirm')}
              </label>
              <input
                id="anker-sync-pass-rec2"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                disabled={localBusy}
              />
              <button type="submit" className="primary" disabled={localBusy}>
                {t('sync.vault.recoverySubmit')}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setVaultMode('unlock')}
              >
                {t('sync.vault.unlockTitle')}
              </button>
            </form>
          )}

          {vaultMode === 'restore' && (
            <form
              className="sync-vault"
              onSubmit={(e) => {
                e.preventDefault()
                void doRestoreLocal()
              }}
            >
              <h4>{t('sync.vault.restoreLocalTitle')}</h4>
              <p className="block-hint">{t('sync.vault.restoreLocalHint')}</p>
              <label htmlFor="anker-sync-pass-restore">
                {t('sync.vault.passphraseLabel')}
              </label>
              <input
                id="anker-sync-pass-restore"
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={localBusy}
              />
              <label htmlFor="anker-sync-pass-restore2">
                {t('sync.vault.passphraseConfirm')}
              </label>
              <input
                id="anker-sync-pass-restore2"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                disabled={localBusy}
              />
              <button type="submit" className="primary" disabled={localBusy}>
                {t('sync.vault.restoreLocalSubmit')}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setVaultMode('unlock')}
              >
                {t('sync.vault.unlockTitle')}
              </button>
            </form>
          )}

          {vaultMode === 'change' && (
            <form
              className="sync-vault"
              onSubmit={(e) => {
                e.preventDefault()
                void doChangePass()
              }}
            >
              <h4>{t('sync.vault.changeTitle')}</h4>
              <label htmlFor="anker-sync-pass-change">
                {t('sync.vault.passphraseLabel')}
              </label>
              <input
                id="anker-sync-pass-change"
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={localBusy}
              />
              <label htmlFor="anker-sync-pass-change2">
                {t('sync.vault.passphraseConfirm')}
              </label>
              <input
                id="anker-sync-pass-change2"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                disabled={localBusy}
              />
              <button type="submit" className="primary" disabled={localBusy}>
                {t('sync.vault.changeSubmit')}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setVaultMode('ready')}
              >
                {t('common.ok')}
              </button>
            </form>
          )}

          {vaultMode === 'ready' && unlocked && (
            <div className="sync-vault">
              <p className="sync-status">{t('sync.vault.unlocked')}</p>
              <button
                type="button"
                className="ghost"
                onClick={() => setVaultMode('change')}
              >
                {t('sync.vault.changeTitle')}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setRecoveryCode(
                    recoveryCode ||
                      (userId ? getCachedRecoveryCode(userId) : null),
                  )
                  setShowRecovery((v) => !v)
                }}
              >
                {showRecovery
                  ? t('sync.vault.recoveryHide')
                  : t('sync.vault.recoveryShow')}
              </button>
              {showRecovery && recoveryCode && (
                <div className="sync-recovery-box">
                  <p className="block-hint">{t('sync.vault.recoveryOnce')}</p>
                  <code className="sync-recovery-code">
                    {formatRecoveryCode(recoveryCode)}
                  </code>
                  <div className="sync-recovery-actions">
                    <button
                      type="button"
                      className="ghost sm"
                      onClick={() =>
                        void copyText(formatRecoveryCode(recoveryCode)).then(
                          (ok) =>
                            ok && onNotice?.(t('sync.vault.noticeCopied')),
                        )
                      }
                    >
                      {t('sync.vault.recoveryCopy')}
                    </button>
                    <button
                      type="button"
                      className="ghost sm"
                      onClick={() => void mailRecovery()}
                    >
                      {t('sync.vault.recoveryMail')}
                    </button>
                    <button
                      type="button"
                      className="ghost sm"
                      disabled={localBusy}
                      onClick={() => void doRegenRecovery()}
                    >
                      {t('sync.vault.recoveryRegen')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="sync-billing">
            {hasPortal ? (
              <button
                type="button"
                className="secondary"
                disabled={localBusy || portalBusy}
                onClick={() => {
                  void (async () => {
                    setPortalBusy(true)
                    const path = window.location.pathname.startsWith(
                      '/schublade',
                    )
                      ? '/schublade'
                      : '/app'
                    const result = await startPortalSession(path)
                    setPortalBusy(false)
                    if (result.ok) {
                      window.location.href = result.url
                      return
                    }
                    onNotice?.(t('billing.portal.error'))
                  })()
                }}
              >
                {portalBusy
                  ? t('billing.portal.busy')
                  : t('billing.portal.manage')}
              </button>
            ) : (
              <p className="block-hint">{t('billing.portal.none')}</p>
            )}
          </div>

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
            name="anker-sync-email"
            type="email"
            autoComplete="username"
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
