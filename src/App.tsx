import { useEffect, useRef, useState } from 'react'
import type { DayState } from './types'
import { emptyDay, loadDay, saveDay } from './storage'
import { reconcileExpiredSparks } from './sparkExpiry'
import { PlanScreen } from './screens/PlanScreen'
import { FocusScreen } from './screens/FocusScreen'
import { DoneScreen } from './screens/DoneScreen'
import { Intro, hasSeenIntro } from './components/Intro'
import { RegulateButton, RegulateDown } from './components/RegulateDown'
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
  const [day, setDay] = useState<DayState>(() => loadDay() ?? emptyDay())
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro())
  const [introKey, setIntroKey] = useState(0)
  const [sparkMailNotice, setSparkMailNotice] = useState<string | null>(null)
  const [regulateOpen, setRegulateOpen] = useState(false)
  const [showRegulateTip, setShowRegulateTip] = useState(
    () => hasSeenIntro() && !hasSeenRegulateTip(),
  )
  const reconciledRef = useRef(false)

  useEffect(() => {
    saveDay(day)
  }, [day])

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">Tagesanker</span>
          </div>
          {!showIntro && !regulateOpen && (
            <RegulateButton onClick={openRegulate} />
          )}
        </div>
        <p className="brand-tag">Eine Sache. Realistisch. Zurückfinden.</p>
        {!showIntro && !regulateOpen && showRegulateTip && (
          <div className="regulate-tip" role="status">
            <p>
              <strong>Ruhe</strong> oben rechts — tippen, wenn es zu viel wird.
              Atmen, Sinne, Körper. Kein Timer.
            </p>
            <button
              type="button"
              className="ghost sm"
              onClick={dismissRegulateTip}
            >
              Verstanden
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
