import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setAppLocale } from './i18n'
import { normalizeLocale } from './i18n/locales'
import type { DayState } from './types'
import { emptyDay, loadDay, loadPrefs, saveDay } from './storage'
import { reconcileExpiredSparks } from './sparkExpiry'
import { PlanScreen } from './screens/PlanScreen'
import { FocusScreen } from './screens/FocusScreen'
import { DoneScreen } from './screens/DoneScreen'
import { Intro, hasSeenIntro } from './components/Intro'
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
  const reconciledRef = useRef(false)
  const skipPersistRef = useRef(false)
  const syncingRef = useRef(false)

  const applySyncedDay = useCallback((next: DayState) => {
    skipPersistRef.current = true
    setDay(next)
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

  useEffect(() => {
    if (reconciledRef.current) return
    reconciledRef.current = true
    const email = day.sparksMailEmail ?? ''
    const sparks = day.sparks
    void reconcileExpiredSparks(sparks, email).then((result) => {
      if (result.notice) setSparkMailNotice(result.notice)
      if (
        result.mailed > 0 ||
        result.purgedWithoutMail > 0 ||
        result.sparks.length !== sparks.length
      ) {
        setDay((d) => ({ ...d, sparks: result.sparks }))
      }
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
            <RegulateButton onClick={openRegulate} />
          )}
        </div>
        <p className="brand-tag">{t('app.brandTag')}</p>
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
        ) : (
          <>
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
              />
            )}
            {screen === 'focus' && (
              <FocusScreen
                day={day}
                setDay={setDay}
                regulateOpen={regulateOpen}
              />
            )}
            {screen === 'done' && <DoneScreen day={day} setDay={setDay} />}
          </>
        )}
      </main>

      {regulateOpen && (
        <RegulateDown onClose={() => setRegulateOpen(false)} />
      )}
    </div>
  )
}

export default App
