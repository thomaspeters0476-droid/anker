import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { setAppLocale } from './i18n'
import { normalizeLocale } from './i18n/locales'
import type { DayState } from './types'
import { emptyDay, loadDay, loadPrefs } from './storage'
import { bindPersistFlush, scheduleSaveDay } from './persist'
import { ProductNav } from './components/ProductNav'
import { SettingsGear } from './components/SettingsGear'
import { reconcileExpiredSparks } from './sparkExpiry'
import { Intro, hasSeenIntro } from './components/Intro'
import { RegulateButton } from './components/RegulateDown'
import { afterPaint } from './afterPaint'
import { isSyncConfigured, loadSync, schedulePushLazy } from './sync/load'
import type { SyncConflict } from './sync/sync'
import { useOnline } from './online'
import { PaywallGate } from './components/PaywallGate'
import { SignInSheet } from './components/SignInSheet'
import { SyncConflictBanner } from './components/SyncConflictBanner'
import { BridgeTip } from './components/BridgeTip'
import { hasSeenBridgeTip } from './bridge/bridgeTip'
import {
  clearEntitlementsCache,
  getCachedEntitlements,
  type EntitlementsState,
} from './billing/entitlementsCache'
import './App.css'

const PlanScreen = lazy(() =>
  import('./screens/PlanScreen').then((m) => ({ default: m.PlanScreen })),
)
const FocusScreen = lazy(() =>
  import('./screens/FocusScreen').then((m) => ({ default: m.FocusScreen })),
)
const DoneScreen = lazy(() =>
  import('./screens/DoneScreen').then((m) => ({ default: m.DoneScreen })),
)
const ShellSettings = lazy(() =>
  import('./components/ShellSettings').then((m) => ({
    default: m.ShellSettings,
  })),
)
const RegulateDown = lazy(() =>
  import('./components/RegulateDown').then((m) => ({
    default: m.RegulateDown,
  })),
)

const REGULATE_TIP_KEY = 'anker-regulate-tip-seen'

function hasSeenRegulateTip(): boolean {
  try {
    return localStorage.getItem(REGULATE_TIP_KEY) === '1'
  } catch {
    return false
  }
}

function markRegulateTipSeen() {
  try {
    localStorage.setItem(REGULATE_TIP_KEY, '1')
  } catch {
    /* ignore */
  }
}

function App() {
  const { t } = useTranslation()
  const [day, setDay] = useState<DayState>(() => loadDay() ?? emptyDay())
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro())
  const [introKey, setIntroKey] = useState(0)
  const [sparkMailNotice, setSparkMailNotice] = useState<string | null>(null)
  const [regulateOpen, setRegulateOpen] = useState(false)
  const [showRegulateTip, setShowRegulateTip] = useState(
    () => hasSeenIntro() && !hasSeenRegulateTip(),
  )
  const [syncEmail, setSyncEmail] = useState<string | null>(null)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [syncConflict, setSyncConflict] = useState<SyncConflict | null>(null)
  const [drawerEnabled, setDrawerEnabled] = useState(
    () => loadPrefs().drawerEnabled,
  )
  const [showBridgeTip, setShowBridgeTip] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [forceOpenSync, setForceOpenSync] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [entitlements, setEntitlements] = useState<EntitlementsState>(() =>
    getCachedEntitlements(),
  )
  const online = useOnline()
  const reconciledRef = useRef(false)
  const skipPersistRef = useRef(false)
  const syncingRef = useRef(false)
  const paywallBlocked =
    entitlements.enforced && !entitlements.canUseTagesanker

  const applySyncedDay = useCallback((next: DayState) => {
    skipPersistRef.current = true
    startTransition(() => {
      setDay(next)
      setDrawerEnabled(loadPrefs().drawerEnabled)
    })
  }, [])

  const runSync = useCallback(async () => {
    if (!isSyncConfigured() || syncingRef.current) return
    syncingRef.current = true
    try {
      const sync = await loadSync()
      const pendingBefore = await sync.flushSyncOutbox()
      const result = await sync.syncNow()
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
      const pending = sync.outboxPendingCount()
      if (pending > 0 && pendingBefore > 0) {
        setSyncNotice(t('app.syncNotice.pending', { count: pending }))
      }
    } finally {
      syncingRef.current = false
    }
  }, [applySyncedDay, t])

  useEffect(() => bindPersistFlush(), [])

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    scheduleSaveDay(day)
    if (syncEmail) schedulePushLazy()
  }, [day, syncEmail])

  useEffect(() => {
    if (!isSyncConfigured()) return
    let unsubAuth = () => {}
    const cancelIdle = afterPaint(() => {
      void Promise.all([
        loadSync(),
        import('./billing/entitlements'),
      ]).then(([sync, billing]) => {
        // Immer — auch ohne Session (enforced-Flag für Unsigned-Paywall)
        void billing.refreshEntitlements().then(setEntitlements)
        void sync.getSession().then((s) => {
          setSyncEmail(s?.user?.email ?? null)
        })
        unsubAuth = sync.onAuthChange((session) => {
          setSyncEmail(session?.user?.email ?? null)
          if (session) {
            void runSync()
            void billing.refreshEntitlements().then(setEntitlements)
          } else {
            setSyncConflict(null)
            clearEntitlementsCache()
            void billing.refreshEntitlements().then(setEntitlements)
          }
        })
      })
    })
    return () => {
      cancelIdle()
      unsubAuth()
    }
  }, [runSync])

  useEffect(() => {
    if (!isSyncConfigured() || !syncEmail) return
    let unsubRt = () => {}
    const onVis = () => {
      if (document.visibilityState === 'visible') void runSync()
    }
    const onOnline = () => void runSync()
    const cancel = afterPaint(() => {
      document.addEventListener('visibilitychange', onVis)
      window.addEventListener('online', onOnline)
      void loadSync().then((sync) => {
        unsubRt = sync.subscribeUserState(() => {
          void runSync()
        })
      })
    })
    return () => {
      cancel()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
      unsubRt()
    }
  }, [syncEmail, runSync])

  useEffect(() => {
    if (reconciledRef.current) return
    reconciledRef.current = true
    const email = day.sparksMailEmail ?? ''
    const sparks = day.sparks
    return afterPaint(() => {
      void reconcileExpiredSparks(sparks, email).then((result) => {
        if (result.notice) setSparkMailNotice(result.notice)
        if (
          result.mailed > 0 ||
          result.purgedWithoutMail > 0 ||
          result.sparks.length !== sparks.length
        ) {
          startTransition(() => {
            setDay((d) => ({ ...d, sparks: result.sparks }))
          })
        }
      })
    })
    // Einmal beim Start — E-Mail/Sparks aus initialem State
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = day.tasks.find((t) => t.status === 'active')
  const allSettled =
    day.started &&
    day.tasks.length > 0 &&
    day.tasks.every((t) => t.status === 'done' || t.status === 'skipped')

  let screen: 'plan' | 'focus' | 'done' = 'plan'
  if (allSettled) screen = 'done'
  else if (day.started && active) screen = 'focus'
  else if (day.started) screen = 'focus'

  function openIntro() {
    setIntroKey((k) => k + 1)
    setShowIntro(true)
  }

  function onDrawerEnabledChange(on: boolean) {
    const was = drawerEnabled
    setDrawerEnabled(on)
    if (on && !was && !hasSeenBridgeTip('anker')) {
      setShowBridgeTip(true)
    }
  }

  function openRegulate() {
    markRegulateTipSeen()
    setShowRegulateTip(false)
    setRegulateOpen(true)
  }

  function dismissRegulateTip() {
    markRegulateTipSeen()
    setShowRegulateTip(false)
  }

  function finishIntro() {
    setShowIntro(false)
    if (!hasSeenRegulateTip()) setShowRegulateTip(true)
  }

  async function keepLocalConflict() {
    if (!syncConflict) return
    const sync = await loadSync()
    const result = await sync.resolveKeepLocal(syncConflict)
    setSyncConflict(null)
    if (result.status === 'error') setSyncNotice(result.message)
    else setSyncNotice(t('app.syncNotice.keptLocal'))
  }

  async function useCloudConflict() {
    if (!syncConflict) return
    const sync = await loadSync()
    const result = await sync.resolveUseCloud(syncConflict)
    setSyncConflict(null)
    if (result.status === 'applied_remote') {
      applySyncedDay(result.day)
      setSyncNotice(t('app.syncNotice.usedCloud'))
    } else if (result.status === 'error') {
      setSyncNotice(result.message)
    }
  }

  const tipStrong = t('app.regulateTip.bodyStrong')
  const tipBody = t('app.regulateTip.body')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">{t('app.brandName')}</span>
          </div>
          {!showIntro && !regulateOpen && (
            <div className="topbar-actions">
              <SettingsGear
                open={settingsOpen}
                onClick={() => setSettingsOpen((v) => !v)}
              />
              <RegulateButton onClick={openRegulate} />
            </div>
          )}
        </div>
        <p className="brand-tag">{t('app.brandTag')}</p>
        {!online && (
          <p className="offline-banner" role="status">
            {t('app.offlineBanner')}
          </p>
        )}
        {!showIntro && (
          <SyncConflictBanner
            conflict={syncConflict}
            notice={
              syncConflict
                ? null
                : syncNotice === t('sync.errors.vaultLocked') ||
                    syncNotice === t('sync.errors.vaultSetupRequired')
                  ? syncNotice
                  : null
            }
            onKeepLocal={() => void keepLocalConflict()}
            onUseCloud={() => void useCloudConflict()}
            onOpenSync={() => {
              setForceOpenSync(true)
              setSettingsOpen(true)
            }}
            onDismissNotice={() => setSyncNotice(null)}
          />
        )}
        {!showIntro && drawerEnabled && <ProductNav active="anker" />}
        {!showIntro &&
          !regulateOpen &&
          showBridgeTip &&
          drawerEnabled && (
            <BridgeTip
              side="anker"
              onDismiss={() => setShowBridgeTip(false)}
            />
          )}
        {!showIntro && !regulateOpen && showRegulateTip && (
          <div className="regulate-tip" role="status">
            <p>
              <strong>{tipStrong}</strong>
              {tipBody.startsWith(tipStrong)
                ? tipBody.slice(tipStrong.length)
                : ` ${tipBody}`}
            </p>
            <button
              type="button"
              className="ghost sm"
              onClick={dismissRegulateTip}
            >
              {t('app.regulateTip.dismiss')}
            </button>
          </div>
        )}
      </header>

      <main className="main">
        {showIntro ? (
          <Intro key={introKey} onDone={finishIntro} />
        ) : paywallBlocked ? (
          <PaywallGate
            product="tagesanker"
            signedIn={Boolean(syncEmail)}
            onSignIn={() => setSignInOpen(true)}
          />
        ) : (
          <Suspense fallback={<div className="app-route-fallback" aria-busy />}>
            {screen === 'plan' && (
              <PlanScreen
                day={day}
                setDay={setDay}
                onShowIntro={openIntro}
                sparkMailNotice={sparkMailNotice}
                onDismissSparkMailNotice={() => setSparkMailNotice(null)}
                syncEmail={syncEmail}
                syncNotice={syncNotice}
                syncConflict={syncConflict}
                onSyncNotice={setSyncNotice}
                onSyncKeepLocal={() => void keepLocalConflict()}
                onSyncUseCloud={() => void useCloudConflict()}
                onSyncSignedOut={() => {
                  setSyncEmail(null)
                  setSyncConflict(null)
                }}
                onSyncVaultReady={() => void runSync()}
                drawerEnabled={drawerEnabled}
                onDrawerEnabledChange={onDrawerEnabledChange}
                settingsOpen={settingsOpen}
                onSettingsOpenChange={setSettingsOpen}
                forceOpenSync={forceOpenSync}
                onForceOpenSyncConsumed={() => setForceOpenSync(false)}
              />
            )}
            {screen === 'focus' && (
              <FocusScreen
                day={day}
                setDay={setDay}
                regulateOpen={regulateOpen}
                drawerEnabled={drawerEnabled}
              />
            )}
            {screen === 'done' && (
              <DoneScreen
                day={day}
                setDay={setDay}
                drawerEnabled={drawerEnabled}
              />
            )}
          </Suspense>
        )}
      </main>

      {regulateOpen && (
        <Suspense fallback={null}>
          <RegulateDown onClose={() => setRegulateOpen(false)} />
        </Suspense>
      )}
      {signInOpen && !showIntro && (
        <Suspense fallback={null}>
          <SignInSheet
            onClose={() => setSignInOpen(false)}
            syncEmail={syncEmail}
            syncNotice={syncNotice}
            syncConflict={syncConflict}
            onSyncNotice={setSyncNotice}
            onSyncKeepLocal={() => void keepLocalConflict()}
            onSyncUseCloud={() => void useCloudConflict()}
            onSyncSignedOut={() => {
              setSyncEmail(null)
              setSyncConflict(null)
            }}
            onSyncVaultReady={() => void runSync()}
          />
        </Suspense>
      )}
      {settingsOpen &&
        !showIntro &&
        (paywallBlocked || screen !== 'plan') && (
        <Suspense fallback={null}>
          <ShellSettings
            onClose={() => {
              setSettingsOpen(false)
              setForceOpenSync(false)
            }}
            syncEmail={syncEmail}
            syncNotice={syncNotice}
            syncConflict={syncConflict}
            onSyncNotice={setSyncNotice}
            onSyncKeepLocal={() => void keepLocalConflict()}
            onSyncUseCloud={() => void useCloudConflict()}
            onSyncSignedOut={() => {
              setSyncEmail(null)
              setSyncConflict(null)
            }}
            onSyncVaultReady={() => void runSync()}
            drawerEnabled={drawerEnabled}
            onDrawerEnabledChange={onDrawerEnabledChange}
            forceOpenSync={forceOpenSync}
            onForceOpenSyncConsumed={() => setForceOpenSync(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
