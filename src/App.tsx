import { useEffect, useState } from 'react'
import type { DayState } from './types'
import { emptyDay, loadDay, saveDay } from './storage'
import { PlanScreen } from './screens/PlanScreen'
import { FocusScreen } from './screens/FocusScreen'
import { DoneScreen } from './screens/DoneScreen'
import { Intro, hasSeenIntro } from './components/Intro'
import './App.css'

function App() {
  const [day, setDay] = useState<DayState>(() => loadDay() ?? emptyDay())
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro())

  useEffect(() => {
    saveDay(day)
  }, [day])

  const active = day.tasks.find((t) => t.status === 'active')
  const allSettled =
    day.started &&
    day.tasks.length > 0 &&
    day.tasks.every((t) => t.status === 'done' || t.status === 'skipped')

  let screen: 'plan' | 'focus' | 'done' = 'plan'
  if (allSettled) screen = 'done'
  else if (day.started && active) screen = 'focus'
  else if (day.started) screen = 'focus'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">Anker</span>
        </div>
        <p className="brand-tag">Eine Sache. Realistisch. Zurückfinden.</p>
      </header>

      <main className="main">
        {showIntro ? (
          <Intro onDone={() => setShowIntro(false)} />
        ) : (
          <>
            {screen === 'plan' && <PlanScreen day={day} setDay={setDay} />}
            {screen === 'focus' && <FocusScreen day={day} setDay={setDay} />}
            {screen === 'done' && <DoneScreen day={day} setDay={setDay} />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
