import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { setAppLocale } from './i18n'
import { normalizeLocale } from './i18n/locales'
import type { DayState } from './types'
import {
  emptyDay,
  loadDay,
  loadDrawer,
  loadPrefs,
  savePrefs,
} from './storage'
import {
  bindPersistFlush,
  scheduleSaveDay,
  scheduleSaveDrawer,
} from './persist'
import type { DrawerState } from './drawer/types'
import { DrawerWorkspace } from './components/DrawerWorkspace'
import { ProductNav } from './components/ProductNav'
import { PwaGuide } from './components/PwaGuide'
import { SettingsGear } from './components/SettingsGear'
import { SyncSettings } from './components/SyncSettings'
import { RegulateButton, RegulateDown } from './components/RegulateDown'
import {
  getSession,
  isSyncConfigured,
  onAuthChange,
  resolveKeepLocal,
  resolveUseCloud,
  schedulePush,
  syncNow,
  flushSyncOutbox,
  outboxPendingCount,
  subscribeUserState,
  type SyncConflict,
} from './sync'
import './App.css'

/**
 * Eigenständige Schublade-App (/schublade).
 * Gleicher Deploy/Code wie Tagesanker, eigener Einstieg — fühlt sich wie App 2 an.
 */
export function SchubladeApp() {
  const { t } = useTranslation()
  const [day, setDay] = useState<DayState>(() => loadDay() ?? emptyDay())
  const [drawer, setDrawer] = useState<DrawerState>(() => loadDrawer())
  const [syncEmail, setSyncEmail] = useState<string | null>(null)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [syncConflict, setSyncConflict] = useState<SyncConflict | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [regulateOpen, setRegulateOpen] = useState(false)
  const [aiChopOptIn, setAiChopOptIn] = useState(
    () => loadPrefs().drawerAiChopOptIn,
  )
  const [readyCap, setReadyCap] = useState(
    () => loadPrefs().drawerReadyCap,
  )
  const [drawerAdvanced, setDrawerAdvanced] = useState(
    () => loadPrefs().drawerAdvanced,
  )
  const skipPersistRef = useRef(false)
  const syncingRef = useRef(false)

  const applySyncedDay = useCallback((next: DayState) => {
    skipPersistRef.current = true
    setDay(next)
    setDrawer(loadDrawer())
  }, [])

  const runSync = useCallback(async () => {
    if (!isSyncConfigured() || syncingRef.current) return
    syncingRef.current = true
    try {
      const pendingBefore = await flushSyncOutbox()
      const result = await syncNow()
      if (result.status === 'applied_remote') {
        applySyncedDay(result.day)
        setSyncConflict(null)
        void setAppLocale(normalizeLocale(loadPrefs().locale))
        setSyncNotice(t('app.syncNotice.appliedRemote'))
      } else if (result.status === 'pushed_local') {
        setSyncConflict(null)
      } else if (result.status === 'conflict') {
        setSyncConflict(result.conflict)
      } else if (result.status === 'vault_locked') {
        setSyncNotice(t('sync.errors.vaultLocked'))
      } else if (result.status === 'vault_setup_required') {
        setSyncNotice(t('sync.errors.vaultSetupRequired'))
      } else if (result.status === 'error') {
        setSyncNotice(result.message)
      }
      const pending = outboxPendingCount()
      if (pending > 0 && pendingBefore > 0) {
        setSyncNotice(t('app.syncNotice.pending', { count: pending }))
      }
    } finally {
      syncingRef.current = false
    }
  }, [applySyncedDay, t])

  useEffect(() => {
    // Besuch der Schublade-App = Modul aktiv → Brücke im Tagesanker zeigen
    const prefs = loadPrefs()
    if (!prefs.drawerEnabled) {
      savePrefs({ ...prefs, drawerEnabled: true })
    }
  }, [])

  useEffect(() => bindPersistFlush(), [])

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    scheduleSaveDay(day)
    if (isSyncConfigured() && syncEmail) schedulePush()
  }, [day, syncEmail])

  useEffect(() => {
    if (!isSyncConfigured()) return
    void getSession().then((s) => setSyncEmail(s?.user?.email ?? null))
    return onAuthChange((session) => {
      setSyncEmail(session?.user?.email ?? null)
      if (session) void runSync()
      else setSyncConflict(null)
    })
  }, [runSync])

  useEffect(() => {
    if (!isSyncConfigured() || !syncEmail) return
    return subscribeUserState(() => {
      void runSync()
    })
  }, [syncEmail, runSync])

  function updateDrawer(next: SetStateAction<DrawerState>) {
    setDrawer((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      scheduleSaveDrawer(value)
      if (isSyncConfigured() && syncEmail) schedulePush()
      return value
    })
  }

  async function keepLocalConflict() {
    if (!syncConflict) return
    const result = await resolveKeepLocal(syncConflict)
    setSyncConflict(null)
    if (result.status === 'error') setSyncNotice(result.message)
    else setSyncNotice(t('app.syncNotice.keptLocal'))
  }

  async function useCloudConflict() {
    if (!syncConflict) return
    const result = await resolveUseCloud(syncConflict)
    setSyncConflict(null)
    if (result.status === 'applied_remote') {
      applySyncedDay(result.day)
      setSyncNotice(t('app.syncNotice.usedCloud'))
    } else if (result.status === 'error') {
      setSyncNotice(result.message)
    }
  }

  return (
    <div className="app-shell schublade-shell">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">{t('drawer.title')}</span>
          </div>
          {!regulateOpen && (
            <div className="topbar-actions">
              <SettingsGear
                open={settingsOpen}
                onClick={() => setSettingsOpen((v) => !v)}
              />
              <RegulateButton onClick={() => setRegulateOpen(true)} />
            </div>
          )}
        </div>
        <p className="brand-tag">{t('drawer.appTag')}</p>
        {!regulateOpen && <ProductNav active="schublade" />}
      </header>

      <main className="main">
        <section className="block drawer-app-block">
          <DrawerWorkspace
            variant="page"
            advanced={drawerAdvanced}
            drawer={drawer}
            setDrawer={updateDrawer}
            day={day}
            setDay={setDay}
            aiChopOptIn={aiChopOptIn}
            readyCap={readyCap}
          />
        </section>

        <div className="plan-footer">
          <details
            className="settings-panel settings-panel--from-gear"
            open={settingsOpen}
            onToggle={(e) =>
              setSettingsOpen((e.target as HTMLDetailsElement).open)
            }
          >
            <summary className="settings-panel-summary">
              {t('settings.summary')}
            </summary>
            <p className="block-hint">{t('drawer.appBridgeHint')}</p>
            <p>
              <Link to="/app" className="secondary sm">
                {t('productNav.openAnker')}
              </Link>
            </p>
            <label className="intro-hide-check settings-check">
              <input
                type="checkbox"
                checked={drawerAdvanced}
                onChange={(e) => {
                  const on = e.target.checked
                  setDrawerAdvanced(on)
                  savePrefs({ ...loadPrefs(), drawerAdvanced: on })
                }}
              />
              {t('settings.drawerAdvanced')}
            </label>
            <p className="block-hint">{t('settings.drawerAdvancedHint')}</p>
            <label className="intro-hide-check settings-check">
              <input
                type="checkbox"
                checked={aiChopOptIn}
                onChange={(e) => {
                  const on = e.target.checked
                  setAiChopOptIn(on)
                  savePrefs({ ...loadPrefs(), drawerAiChopOptIn: on })
                }}
              />
              {t('settings.drawerAiChop')}
            </label>
            <p className="block-hint">{t('settings.drawerAiChopHint')}</p>
            <div className="settings-row">
              <span>{t('settings.drawerReadyCap', { n: readyCap })}</span>
              <button
                type="button"
                className="ghost sm"
                disabled={readyCap <= 15}
                onClick={() => {
                  const n = Math.max(15, readyCap - 1)
                  setReadyCap(n)
                  savePrefs({ ...loadPrefs(), drawerReadyCap: n })
                }}
              >
                −
              </button>
              <button
                type="button"
                className="ghost sm"
                disabled={readyCap >= 40}
                onClick={() => {
                  const n = Math.min(40, readyCap + 1)
                  setReadyCap(n)
                  savePrefs({ ...loadPrefs(), drawerReadyCap: n })
                }}
              >
                +
              </button>
            </div>
            <p className="block-hint">{t('settings.drawerReadyCapHint')}</p>
            <details className="settings-section">
              <summary>{t('drawer.installSummary')}</summary>
              <PwaGuide product="schublade" compact />
            </details>
            <details className="settings-section" open={Boolean(syncEmail)}>
              <summary>
                {t('settings.sync.summary')}
                <span className="settings-section-meta">
                  {syncEmail
                    ? t('settings.sync.metaConnected')
                    : t('settings.sync.metaLocalOnly')}
                </span>
              </summary>
              {settingsOpen && (
                <SyncSettings
                  email={syncEmail}
                  notice={syncNotice}
                  conflict={syncConflict}
                  onNotice={setSyncNotice}
                  onKeepLocal={() => void keepLocalConflict()}
                  onUseCloud={() => void useCloudConflict()}
                  onSignedOut={() => {
                    setSyncEmail(null)
                    setSyncConflict(null)
                  }}
                  onVaultReady={() => void runSync()}
                  embedded
                />
              )}
            </details>
            {syncEmail ? (
              <p className="sync-status-bar" role="status">
                {t('settings.syncStatusBar', { email: syncEmail })}
              </p>
            ) : null}
          </details>
        </div>
      </main>

      {regulateOpen && (
        <RegulateDown onClose={() => setRegulateOpen(false)} />
      )}
    </div>
  )
}

export default SchubladeApp
