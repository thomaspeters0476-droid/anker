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
  saveDay,
  saveDrawer,
  savePrefs,
} from './storage'
import type { DrawerState } from './drawer/types'
import { DrawerWorkspace } from './components/DrawerWorkspace'
import { ProductNav } from './components/ProductNav'
import { PwaGuide } from './components/PwaGuide'
import { SyncSettings } from './components/SyncSettings'
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

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    saveDay(day)
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
    const onVis = () => {
      if (document.visibilityState === 'visible') void runSync()
    }
    const onOnline = () => void runSync()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    const unsub = subscribeUserState(() => {
      void runSync()
    })
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
      unsub()
    }
  }, [syncEmail, runSync])

  function updateDrawer(next: SetStateAction<DrawerState>) {
    setDrawer((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      saveDrawer(value)
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
          <button
            type="button"
            className="ghost sm"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {t('settings.summary')}
          </button>
        </div>
        <p className="brand-tag">{t('drawer.appTag')}</p>
        <ProductNav active="schublade" />
      </header>

      <main className="main">
        {settingsOpen && (
          <details className="settings-panel" open>
            <summary>{t('settings.summary')}</summary>
            <p className="block-hint">{t('drawer.appBridgeHint')}</p>
            <p>
              <Link to="/app" className="secondary sm">
                {t('productNav.openAnker')}
              </Link>
            </p>
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
            </details>
            {syncEmail ? (
              <p className="sync-status-bar" role="status">
                {t('settings.syncStatusBar', { email: syncEmail })}
              </p>
            ) : null}
          </details>
        )}

        <section className="block drawer-app-block">
          <DrawerWorkspace
            variant="page"
            drawer={drawer}
            setDrawer={updateDrawer}
            day={day}
            setDay={setDay}
          />
        </section>
      </main>
    </div>
  )
}

export default SchubladeApp
