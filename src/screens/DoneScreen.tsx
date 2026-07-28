import { useState } from 'react'
import type { DayState } from '../types'
import { workTasksSettled } from '../types'
import { ctxFromDay, dayDone } from '../buddy'
import { emptyDay, rollDayForward } from '../storage'
import { SparkVault } from '../components/SparkVault'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
}

export function DoneScreen({ day, setDay }: Props) {
  const done = day.tasks.filter((t) => t.status === 'done')
  const skipped = day.tasks.filter((t) => t.status === 'skipped')
  const msg = dayDone(done.length, day.tasks.length, ctxFromDay(day))
  const unlocked = workTasksSettled(day.tasks)
  const [vaultVisible, setVaultVisible] = useState(false)

  function reset() {
    rollDayForward(day)
    setDay(emptyDay())
  }

  return (
    <section className="screen done-screen">
      <div className="buddy-card" role="status">
        <span className="buddy-label">Buddy</span>
        <p>{msg}</p>
      </div>

      <div className="block">
        <h2>Geschafft</h2>
        {done.length === 0 ? (
          <p className="empty">Noch nichts abgehakt — okay für heute.</p>
        ) : (
          <ul className="task-list done">
            {done.map((t) => (
              <li key={t.id}>
                <span className={`kind tiny ${t.kind}`}>
                  {t.kind === 'work' ? 'A' : 'T'}
                </span>
                {t.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      {skipped.length > 0 && (
        <div className="block muted">
          <h2>Offen gelassen</h2>
          <ul className="task-list">
            {skipped.map((t) => (
              <li key={t.id}>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day.sparks.length > 0 && (
        <button
          type="button"
          className={`secondary lg ${unlocked ? '' : 'locked-cta'}`}
          onClick={() => setVaultVisible(true)}
        >
          {unlocked
            ? `Geistesblitze ansehen (${day.sparks.length})`
            : `Geistesblitze noch verschlossen (${day.sparks.length})`}
        </button>
      )}

      <button type="button" className="primary lg" onClick={reset}>
        Neuen Tag planen
      </button>

      {vaultVisible && (
        <SparkVault
          sparks={day.sparks}
          unlocked={unlocked}
          onClose={() => setVaultVisible(false)}
        />
      )}
    </section>
  )
}
