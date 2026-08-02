import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { setAppLocale } from './i18n'
import { normalizeLocale } from './i18n/locales'
import type { DayState, Spark, Task } from './types'
import { lifeTemplateLabel } from './i18n/lifeLabels'
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
import { SparkCapture } from './components/SparkCapture'
import { SyncSettings } from './components/SyncSettings'
import { RegulateButton, RegulateDown } from './components/RegulateDown'
import {
  getSession,
  isSyncConfigured,
  onAuthChange,
  pushSparkNow,
  resolveKeepLocal,
  resolveUseCloud,
  schedulePush,
  syncNow,
  flushSyncOutbox,
  outboxPendingCount,
  subscribeUserState,
  type SyncConflict,
} from './sync'
import { useOnline } from './online'
import { ChopAiPackBuy } from './components/ChopAiPackBuy'
import { refreshChopWallet } from './drawer/chopAiQuota'
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
  const [captureOpen, setCaptureOpen] = useState(false)
  const [sparkFlash, setSparkFlash] = useState<string | null>(null)
  const online = useOnline()
  const skipPersistRef = useRef(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!sparkFlash) return
    const id = window.setTimeout(() => setSparkFlash(null), 4000)
    return () => window.clearTimeout(id)
  }, [sparkFlash])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('chop_checkout')
    if (!checkout) return
    if (checkout === 'success') {
      void refreshChopWallet().then(() => {
        setSparkFlash(t('drawer.chopAiPackSuccess'))
      })
    } else if (checkout === 'cancel') {
      setSparkFlash(t('drawer.chopAiPackCancel'))
    }
    params.delete('chop_checkout')
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
    window.history.replaceState({}, '', next)
  }, [t])

  function saveSpark(partial: Omit<Spark, 'id' | 'createdAt'>) {
    const spark: Spark = {
      ...partial,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    setDay((d) => ({ ...d, sparks: [...d.sparks, spark] }))
    setSparkFlash(t('drawer.sparkParked'))
    void pushSparkNow(spark)
  }

  const nowTasks = day.tasks.filter(
    (task) => task.status === 'planned' || task.status === 'active',
  )

  function completeTodayTask(task: Task) {
    setDay((d) => ({
      ...d,
      tasks: d.tasks.map((item) =>
        item.id === task.id ? { ...item, status: 'done' as const } : item,
      ),
    }))
    setSparkFlash(t('drawer.todayDoneFlash', { title: task.title }))
  }

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
        {!online && (
          <p className="offline-banner" role="status">
            {t('app.offlineBanner')}
          </p>
        )}
        {!regulateOpen && <ProductNav active="schublade" />}
      </header>

      <main className="main">
        <section className="block drawer-app-block">
          {sparkFlash && (
            <div className="buddy-card drawer-flash" role="status">
              <span className="buddy-label">{t('common.buddy')}</span>
              <p>{sparkFlash}</p>
            </div>
          )}

          <div className="drawer-today">
            <h2 className="drawer-today-title">{t('drawer.todayTitle')}</h2>
            <p className="block-hint">{t('drawer.todayLead')}</p>
            {nowTasks.length === 0 ? (
              <p className="block-hint">{t('drawer.todayEmptyHint')}</p>
            ) : (
              <ul className="drawer-today-list">
                {nowTasks.map((task) => (
                  <li key={task.id} className="drawer-today-item">
                    <div className="drawer-today-main">
                      <strong>
                        {lifeTemplateLabel(task.title, t)}
                      </strong>
                      {task.parentTitle && (
                        <p className="task-parent-line">
                          {t('drawer.parentLine', { title: task.parentTitle })}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="primary sm"
                      onClick={() => completeTodayTask(task)}
                    >
                      {t('drawer.markDone')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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

        {!regulateOpen && (
          <button
            type="button"
            className="spark-btn drawer-spark-fab"
            onClick={() => setCaptureOpen(true)}
          >
            {t('focus.sparkBar.capture')}
          </button>
        )}

        <SparkCapture
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          onSave={saveSpark}
        />

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
            {aiChopOptIn && (
              <div className="settings-section chop-pack-settings">
                <p className="block-hint">{t('drawer.chopAiPackSettingsLead')}</p>
                <ChopAiPackBuy />
              </div>
            )}
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
