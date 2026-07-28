import { useEffect, useMemo, useRef, useState } from 'react'
import type { DayState, Spark, Task } from '../types'
import { workTasksSettled } from '../types'
import {
  afterDone,
  afterDrift,
  checkInPrompt,
  lifeContinue,
  sparkParked,
  sparkVaultLocked,
  startFocus,
} from '../buddy'
import { SIZE_LABEL } from '../capacity'
import { SparkCapture } from '../components/SparkCapture'
import { SparkVault } from '../components/SparkVault'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Nächste Aufgabe: zuerst offene Arbeit, dann Alltag */
function activateNext(fromTasks: Task[]): Task[] {
  const nextWork = fromTasks.findIndex(
    (t) => t.status === 'planned' && t.kind === 'work',
  )
  const nextAny = fromTasks.findIndex((t) => t.status === 'planned')
  const nextIdx = nextWork !== -1 ? nextWork : nextAny
  if (nextIdx === -1) return fromTasks
  return fromTasks.map((t, i) =>
    i === nextIdx ? { ...t, status: 'active' } : t,
  )
}

export function FocusScreen({ day, setDay }: Props) {
  const active = day.tasks.find((t) => t.status === 'active')
  const waiting = day.tasks.filter((t) => t.status === 'planned')
  const doneCount = day.tasks.filter((t) => t.status === 'done').length
  const vaultOpen = workTasksSettled(day.tasks)
  const sparkCount = day.sparks.length

  const [secondsLeft, setSecondsLeft] = useState(
    () => (active?.minutes ?? 25) * 60,
  )
  const [running, setRunning] = useState(true)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [vaultVisible, setVaultVisible] = useState(false)
  const [buddyMsg, setBuddyMsg] = useState(() =>
    active ? startFocus(active, day.buddyTone) : '',
  )
  const elapsedRef = useRef(0)
  const activeIdRef = useRef(active?.id)
  const wasRunningRef = useRef(true)

  useEffect(() => {
    if (!active) return
    if (activeIdRef.current !== active.id) {
      activeIdRef.current = active.id
      setSecondsLeft(active.minutes * 60)
      setRunning(true)
      setShowCheckIn(false)
      elapsedRef.current = 0
      if (active.kind === 'life') {
        setBuddyMsg(lifeContinue(active, day.buddyTone))
      } else {
        setBuddyMsg(startFocus(active, day.buddyTone))
      }
    }
  }, [active, day.buddyTone])

  useEffect(() => {
    if (!running || showCheckIn || captureOpen || !active) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false)
          setBuddyMsg(
            day.buddyTone === 'kurz'
              ? 'Zeitbox vorbei. Fertig oder weiter?'
              : 'Zeitbox vorbei. Als fertig markieren — oder Timer nochmal starten.',
          )
          return 0
        }
        return s - 1
      })
      elapsedRef.current += 1
      if (elapsedRef.current >= day.checkInEveryMin * 60) {
        elapsedRef.current = 0
        setShowCheckIn(true)
        setRunning(false)
        setBuddyMsg(checkInPrompt(active, day.buddyTone))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [
    running,
    showCheckIn,
    captureOpen,
    active,
    day.checkInEveryMin,
    day.buddyTone,
  ])

  function endDay() {
    setDay((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.status === 'done' ? t : { ...t, status: 'skipped' as const },
      ),
    }))
  }

  const progress = useMemo(() => {
    if (!active) return 0
    const total = active.minutes * 60
    return Math.min(100, ((total - secondsLeft) / total) * 100)
  }, [active, secondsLeft])

  function completeActive() {
    if (!active) return
    setBuddyMsg(afterDone(active, day.buddyTone))
    setDay((d) => {
      const updated = d.tasks.map((t) =>
        t.id === active.id ? { ...t, status: 'done' as const } : t,
      )
      return { ...d, tasks: activateNext(updated) }
    })
  }

  function skipActive() {
    if (!active) return
    setDay((d) => {
      const updated = d.tasks.map((t) =>
        t.id === active.id ? { ...t, status: 'skipped' as const } : t,
      )
      return { ...d, tasks: activateNext(updated) }
    })
  }

  function chooseNext(id: string) {
    setDay((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id === id) return { ...t, status: 'active' }
        if (t.status === 'active') return { ...t, status: 'planned' }
        return t
      }),
    }))
  }

  function onCheckIn(choice: 'still' | 'drift' | 'pause') {
    setShowCheckIn(false)
    if (choice === 'still') {
      setRunning(true)
      setBuddyMsg(
        active?.kind === 'life'
          ? lifeContinue(active, day.buddyTone)
          : day.buddyTone === 'kurz'
            ? 'Weiter.'
            : 'Gut. Weiter bei der einen Sache.',
      )
    } else if (choice === 'drift') {
      setRunning(true)
      setBuddyMsg(afterDrift(day.buddyTone))
    } else {
      setRunning(false)
      setBuddyMsg(
        day.buddyTone === 'klar'
          ? 'Pause. Timer gestoppt.'
          : 'Pause ist okay. Wenn du bereit bist: Timer wieder starten.',
      )
    }
  }

  function openCapture() {
    wasRunningRef.current = running
    setRunning(false)
    setCaptureOpen(true)
  }

  function closeCapture() {
    setCaptureOpen(false)
    if (active) {
      setBuddyMsg(
        active.kind === 'life'
          ? lifeContinue(active, day.buddyTone)
          : day.buddyTone === 'kurz'
            ? 'Zurück zur Aufgabe.'
            : `Zurück zu „${active.title}“.`,
      )
    }
    if (wasRunningRef.current && !showCheckIn) setRunning(true)
  }

  function saveSpark(partial: Omit<Spark, 'id' | 'createdAt'>) {
    const nextCount = day.sparks.length + 1
    setDay((d) => ({
      ...d,
      sparks: [
        ...d.sparks,
        {
          ...partial,
          id: uid(),
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    setBuddyMsg(sparkParked(nextCount, day.buddyTone))
  }

  function tryOpenVault() {
    if (!vaultOpen) {
      setBuddyMsg(sparkVaultLocked(sparkCount, day.buddyTone))
      return
    }
    if (active?.kind === 'life') {
      setBuddyMsg(lifeContinue(active, day.buddyTone))
    }
    setVaultVisible(true)
  }

  const sparkControls = (
    <div className="spark-bar">
      <button type="button" className="spark-btn" onClick={openCapture}>
        ✦ Geistesblitz
      </button>
      <button
        type="button"
        className={`vault-btn ${vaultOpen ? 'open' : 'locked'}`}
        onClick={tryOpenVault}
        aria-label={
          vaultOpen
            ? 'Geistesblitzspeicher öffnen'
            : 'Geistesblitzspeicher noch verschlossen'
        }
      >
        {vaultOpen ? 'Speicher' : 'Speicher 🔒'}
        {sparkCount > 0 && <span className="spark-count">{sparkCount}</span>}
      </button>
    </div>
  )

  if (!active) {
    return (
      <section className="screen focus-screen">
        <div className="buddy-card" role="status">
          <span className="buddy-label">Buddy</span>
          <p>
            Keine aktive Aufgabe mehr. Du kannst den Tag beenden oder etwas
            Offenes anwählen.
          </p>
        </div>
        {sparkControls}
        {waiting.length > 0 && (
          <ul className="queue">
            {waiting.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="queue-btn"
                  onClick={() => chooseNext(t.id)}
                >
                  <span className={`kind ${t.kind}`}>
                    {t.kind === 'work' ? 'Arbeit' : 'Alltag'}
                  </span>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="ghost lg end-day" onClick={endDay}>
          Tag beenden
        </button>
        <SparkCapture
          open={captureOpen}
          onClose={closeCapture}
          onSave={saveSpark}
        />
        {vaultVisible && (
          <SparkVault
            sparks={day.sparks}
            unlocked={vaultOpen}
            onClose={() => setVaultVisible(false)}
          />
        )}
      </section>
    )
  }

  return (
    <section className="screen focus-screen">
      <div className="progress-meta">
        <span>
          {doneCount} erledigt · {waiting.length} wartend
        </span>
        <span className="meta-right">
          {active.kind === 'work' && (
            <span className={`size-badge ${active.size}`}>{SIZE_LABEL[active.size]}</span>
          )}
          <span className={`kind ${active.kind}`}>
            {active.kind === 'work' ? 'Arbeit' : 'Alltag'}
          </span>
        </span>
      </div>

      <h2 className="focus-title">{active.title}</h2>

      <div className="timer-ring" style={{ ['--p' as string]: `${progress}%` }}>
        <div className="timer-inner">
          <span className="timer-digits">{formatTime(secondsLeft)}</span>
          <span className="timer-label">
            {captureOpen
              ? 'geparkt'
              : running
                ? 'läuft'
                : showCheckIn
                  ? 'Check-in'
                  : 'pausiert'}
          </span>
        </div>
      </div>

      <div className="buddy-card" role="status">
        <span className="buddy-label">Buddy</span>
        <p>{buddyMsg}</p>
      </div>

      {sparkControls}

      {showCheckIn ? (
        <div className="checkin-actions">
          <button
            type="button"
            className="primary lg"
            onClick={() => onCheckIn('still')}
          >
            Ja, noch dabei
          </button>
          <button
            type="button"
            className="secondary lg"
            onClick={() => onCheckIn('drift')}
          >
            Abgeschweift — zurück
          </button>
          <button
            type="button"
            className="ghost lg"
            onClick={() => onCheckIn('pause')}
          >
            Pause
          </button>
        </div>
      ) : (
        <div className="focus-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (!running && secondsLeft === 0 && active) {
                setSecondsLeft(active.minutes * 60)
                elapsedRef.current = 0
                setBuddyMsg(
                  day.buddyTone === 'kurz'
                    ? 'Noch eine Runde.'
                    : 'Noch eine Zeitbox — nur diese eine Sache.',
                )
              }
              setRunning((r) => !r)
            }}
          >
            {running ? 'Pause' : secondsLeft === 0 ? 'Noch eine Runde' : 'Weiter'}
          </button>
          <button type="button" className="primary" onClick={completeActive}>
            Fertig
          </button>
          <button type="button" className="ghost" onClick={skipActive}>
            Später / überspringen
          </button>
        </div>
      )}

      {waiting.length > 0 && (
        <div className="waiting-block">
          <h3>Wartet (nicht jetzt)</h3>
          <ul className="waiting-list">
            {waiting.map((t) => (
              <li key={t.id}>
                <span className={`kind tiny ${t.kind}`}>
                  {t.kind === 'work' ? 'A' : 'T'}
                </span>
                {t.kind === 'work' && (
                  <span className={`size-badge tiny ${t.size}`}>
                    {SIZE_LABEL[t.size].slice(0, 1)}
                  </span>
                )}
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="ghost lg end-day" onClick={endDay}>
        Tag beenden
      </button>

      <SparkCapture
        open={captureOpen}
        onClose={closeCapture}
        onSave={saveSpark}
      />
      {vaultVisible && (
        <SparkVault
          sparks={day.sparks}
          unlocked={vaultOpen}
          onClose={() => {
            setVaultVisible(false)
            if (active.kind === 'life') {
              setBuddyMsg(lifeContinue(active, day.buddyTone))
            }
          }}
        />
      )}
    </section>
  )
}
