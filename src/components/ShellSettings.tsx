import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loadPrefs, savePrefs } from '../storage'
import { SyncSettings } from './SyncSettings'
import type { SyncConflict } from '../sync'
import { setAppLocale } from '../i18n'
import {
  APP_LOCALES,
  LOCALE_LABELS,
  normalizeLocale,
  type AppLocale,
} from '../i18n/locales'

/** Kompakte Einstellungen aus Focus/Done (voller Satz sitzt im Plan) */
export function ShellSettings({
  onClose,
  syncEmail,
  syncNotice,
  syncConflict,
  onSyncNotice,
  onSyncKeepLocal,
  onSyncUseCloud,
  onSyncSignedOut,
  onSyncVaultReady,
  drawerEnabled,
  onDrawerEnabledChange,
  forceOpenSync = false,
  onForceOpenSyncConsumed,
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
  drawerEnabled: boolean
  onDrawerEnabledChange?: (on: boolean) => void
  forceOpenSync?: boolean
  onForceOpenSyncConsumed?: () => void
}) {
  const { t } = useTranslation()
  const [locale, setLocale] = useState<AppLocale>(() => loadPrefs().locale)
  const [shortMorning, setShortMorning] = useState(
    () => loadPrefs().shortMorning,
  )
  const [drawerAdvanced, setDrawerAdvanced] = useState(
    () => loadPrefs().drawerAdvanced,
  )
  const [syncOpen, setSyncOpen] = useState(
    () => Boolean(syncEmail) || forceOpenSync,
  )

  useEffect(() => {
    if (!forceOpenSync) return
    setSyncOpen(true)
    onForceOpenSyncConsumed?.()
  }, [forceOpenSync, onForceOpenSyncConsumed])

  return (
    <div className="spark-overlay" role="dialog" aria-modal>
      <div className="spark-panel shell-settings-panel">
        <div className="drawer-panel-head">
          <h2>{t('settings.summary')}</h2>
          <button type="button" className="ghost sm" onClick={onClose}>
            {t('common.ok')}
          </button>
        </div>
        <p className="block-hint">{t('settings.shellHint')}</p>

        <label className="intro-hide-check settings-check">
          <input
            type="checkbox"
            checked={shortMorning}
            onChange={(e) => {
              const v = e.target.checked
              setShortMorning(v)
              savePrefs({ ...loadPrefs(), shortMorning: v })
            }}
          />
          {t('settings.shortMorning')}
        </label>

        <label className="intro-hide-check settings-check">
          <input
            type="checkbox"
            checked={drawerEnabled}
            onChange={(e) => {
              const v = e.target.checked
              savePrefs({ ...loadPrefs(), drawerEnabled: v })
              onDrawerEnabledChange?.(v)
            }}
          />
          {t('settings.drawerEnabled')}
        </label>

        {drawerEnabled && (
          <>
            <label className="intro-hide-check settings-check">
              <input
                type="checkbox"
                checked={drawerAdvanced}
                onChange={(e) => {
                  const v = e.target.checked
                  setDrawerAdvanced(v)
                  savePrefs({ ...loadPrefs(), drawerAdvanced: v })
                }}
              />
              {t('settings.drawerAdvanced')}
            </label>
            <p className="block-hint">{t('settings.drawerAdvancedHint')}</p>
            <p>
              <Link to="/schublade" className="secondary sm" onClick={onClose}>
                {t('productNav.openSchublade')}
              </Link>
            </p>
          </>
        )}

        <label className="settings-select">
          <span>{t('language.label')}</span>
          <select
            value={locale}
            onChange={async (e) => {
              const loc = normalizeLocale(e.target.value)
              setLocale(loc)
              savePrefs({ ...loadPrefs(), locale: loc })
              await setAppLocale(loc)
            }}
          >
            {APP_LOCALES.map((loc) => (
              <option key={loc} value={loc}>
                {LOCALE_LABELS[loc]}
              </option>
            ))}
          </select>
        </label>

        <details
          className="settings-section"
          open={syncOpen || forceOpenSync}
          onToggle={(e) =>
            setSyncOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary>{t('settings.sync.summary')}</summary>
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
          />
        </details>
      </div>
    </div>
  )
}
