import { useTranslation } from 'react-i18next'
import { SyncSettings } from './SyncSettings'
import type { SyncConflict } from '../sync'

/** Nur Anmeldung — kein Backup/Wipe (dafür Einstellungen). */
export function SignInSheet({
  onClose,
  syncEmail,
  syncNotice,
  syncConflict,
  onSyncNotice,
  onSyncKeepLocal,
  onSyncUseCloud,
  onSyncSignedOut,
  onSyncVaultReady,
}: {
  onClose: () => void
  syncEmail: string | null
  syncNotice: string | null
  syncConflict: SyncConflict | null
  onSyncNotice?: (msg: string | null) => void
  onSyncKeepLocal?: () => void
  onSyncUseCloud?: () => void
  onSyncSignedOut?: () => void
  onSyncVaultReady?: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="spark-overlay" role="dialog" aria-modal>
      <div className="spark-panel shell-settings-panel">
        <div className="drawer-panel-head">
          <h2>{t('billing.paywall.signInTitle')}</h2>
          <button type="button" className="ghost sm" onClick={onClose}>
            {t('common.ok')}
          </button>
        </div>
        <p className="block-hint">{t('billing.paywall.signInSheetHint')}</p>
        <SyncSettings
          email={syncEmail}
          notice={syncNotice}
          conflict={syncConflict}
          onKeepLocal={onSyncKeepLocal}
          onUseCloud={onSyncUseCloud}
          onSignedOut={onSyncSignedOut}
          onNotice={onSyncNotice}
          onVaultReady={onSyncVaultReady}
          embedded
          mode="login"
        />
      </div>
    </div>
  )
}
