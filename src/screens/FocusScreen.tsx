import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayState, Spark, Task, TaskSize } from '../types'
import { workTasksSettled } from '../types'
import {
  anotherRound,
  afterDone,
  afterDrift,
  afterPause,
  afterStill,
  backToFocus,
  checkInPrompt,
  ctxFromDay,
  feierabend,
  lifeContinue,
  sleepReminder,
  sparkParked,
  sparkVaultLocked,
  startFocus,
  timeboxOver,
} from '../buddy'
import { SparkCapture } from '../components/SparkCapture'
import { SparkVault } from '../components/SparkVault'
import { notify, notifyIfHidden } from '../notifications'
import { lifeTemplateLabel } from '../i18n/lifeLabels'
import { deleteSparkRemote, pushSparkNow } from '../sync'
import { addInboxItem } from '../drawer/logic'
import { scheduleSaveDrawer } from '../persist'
import { loadDrawer } from '../storage'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
  regulateOpen?: boolean
  drawerEnabled?: boolean
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

export function FocusScreen({
  day,
  setDay,
  regulateOpen = false,
  drawerEnabled = false,
}: Props) {
  const { t } = useTranslation()
  const sizeLabel = (size: TaskSize) => t(`common.size.${size}`)
  const active = day.tasks.find((task) => task.status === 'active')
  const waiting = day.tasks.filter((task) => task.status === 'planned')
  const doneCount = day.tasks.filter((task) => task.status === 'done').length
  const vaultOpen = workTasksSettled(day.tasks)
  const sparkCount = day.sparks.length
  const lifeLeft = day.tasks.filter(
    (task) =>
      task.kind === 'life' &&
      (task.status === 'planned' || task.status === 'active'),
  ).length
  const inFeierabend =
    day.started &&
    vaultOpen &&
    day.tasks.some((task) => task.kind === 'work')
  const sleepPending = day.tasks.some(
    (task) =>
      task.kind === 'life' &&
      (task.status === 'planned' || task.status === 'active') &&
      /schlaf/i.test(task.title),
  )

  const [secondsLeft, setSecondsLeft] = useState(
    () => (active?.minutes ?? 25) * 60,
  )
  const [running, setRunning] = useState(true)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [vaultVisible, setVaultVisible] = useState(false)
  const [buddyMsg, setBuddyMsg] = useState(() =>
    active ? startFocus(active, ctxFromDay(day)) : '',
  )
  const activeIdRef = useRef(active?.id)
  const wasRunningRef = useRef(true)
  const sleepNotifiedRef = useRef(false)
  const feierabendShownRef = useRef(false)
  const awayNudgeCountRef = useRef(0)
  const awayNudgeTimerRef = useRef<number | null>(null)
  const regulateWasOpenRef = useRef(false)
  /** Wall-clock: läuft auch im Hintergrund weiter (andere Tabs/Apps) */
  const endsAtRef = useRef<number | null>(null)
  const nextCheckInAtRef = useRef<number | null>(null)
  const checkInRemainingMsRef = useRef<number | null>(null)
  const runningRef = useRef(running)
  runningRef.current = running
  const secondsLeftRef = useRef(secondsLeft)
  secondsLeftRef.current = secondsLeft
  const checkInEveryMs = day.checkInEveryMin * 60 * 1000

  function clearTimerDeadlines() {
    endsAtRef.current = null
    nextCheckInAtRef.current = null
  }

  function snapshotTimerDeadlines() {
    const now = Date.now()
    if (endsAtRef.current != null) {
      const left = Math.max(0, Math.round((endsAtRef.current - now) / 1000))
      secondsLeftRef.current = left
      setSecondsLeft(left)
    }
    if (nextCheckInAtRef.current != null) {
      checkInRemainingMsRef.current = Math.max(
        0,
        nextCheckInAtRef.current - now,
      )
    }
    clearTimerDeadlines()
  }

  function armTimerDeadlines(leftSec: number, checkInMs?: number) {
    const now = Date.now()
    endsAtRef.current = now + Math.max(0, leftSec) * 1000
    const untilCheckIn =
      checkInMs ?? checkInRemainingMsRef.current ?? checkInEveryMs
    nextCheckInAtRef.current = now + Math.max(0, untilCheckIn)
    checkInRemainingMsRef.current = null
  }

  // Runterregeln: Timer sanft pausieren; nach Rückkehr Hinweis, nicht auto-starten
  useEffect(() => {
    if (regulateOpen) {
      if (runningRef.current) {
        snapshotTimerDeadlines()
        setRunning(false)
      }
      setShowCheckIn(false)
      regulateWasOpenRef.current = true
      return
    }
    if (regulateWasOpenRef.current) {
      regulateWasOpenRef.current = false
      setBuddyMsg(t(`focus.afterRegulate.${day.buddyTone}`))
    }
  }, [regulateOpen, day.buddyTone, t])

  function clearAwayNudges() {
    if (awayNudgeTimerRef.current != null) {
      window.clearInterval(awayNudgeTimerRef.current)
      awayNudgeTimerRef.current = null
    }
    awayNudgeCountRef.current = 0
  }

  // Weicher Freeze: optional erinnern — Timer läuft weiter (Arbeit oft woanders)
  useEffect(() => {
    if (!day.softFreezeEnabled || !day.started) return

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const current = day.tasks.find((task) => task.status === 'active')
        if (!current) return

        clearAwayNudges()

        const canNudge =
          day.notificationsEnabled &&
          day.awayNudgeMode !== 'off' &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'

        if (canNudge) {
          const title = current.title
          const send = () =>
            notify(
              t('focus.notify.awayTitle'),
              t('focus.notify.awayBody', { title }),
              'anker-away',
            )

          awayNudgeCountRef.current = 1
          send()

          if (day.awayNudgeMode === 'repeat') {
            const everyMs = day.awayNudgeEveryMin * 60 * 1000
            const max = day.awayNudgeMax
            awayNudgeTimerRef.current = window.setInterval(() => {
              if (document.visibilityState !== 'hidden') {
                clearAwayNudges()
                return
              }
              if (awayNudgeCountRef.current >= max) {
                clearAwayNudges()
                return
              }
              awayNudgeCountRef.current += 1
              send()
            }, everyMs)
          }
        }
        return
      }

      clearAwayNudges()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearAwayNudges()
    }
  }, [
    day.softFreezeEnabled,
    day.started,
    day.notificationsEnabled,
    day.awayNudgeMode,
    day.awayNudgeEveryMin,
    day.awayNudgeMax,
    day.tasks,
    t,
  ])

  useEffect(() => {
    if (!active) return
    if (activeIdRef.current !== active.id) {
      activeIdRef.current = active.id
      const left = active.minutes * 60
      checkInRemainingMsRef.current = null
      setSecondsLeft(left)
      secondsLeftRef.current = left
      armTimerDeadlines(left, checkInEveryMs)
      setRunning(true)
      setShowCheckIn(false)
      if (inFeierabend && active.kind === 'life') {
        setBuddyMsg(feierabend(ctxFromDay(day, { lifeLeft })))
      } else if (active.kind === 'life') {
        setBuddyMsg(lifeContinue(active, ctxFromDay(day)))
      } else {
        setBuddyMsg(startFocus(active, ctxFromDay(day)))
      }
    }
  }, [active, day, inFeierabend, lifeLeft, checkInEveryMs])

  // Feierabend-Hinweis einmal, wenn Arbeit fertig wird
  useEffect(() => {
    if (!inFeierabend || feierabendShownRef.current) return
    feierabendShownRef.current = true
    setBuddyMsg(feierabend(ctxFromDay(day, { lifeLeft })))
    if (day.notificationsEnabled) {
      notifyIfHidden(
        t('focus.notify.feierabendTitle'),
        lifeLeft > 0
          ? t('focus.notify.feierabendBodyLife')
          : t('focus.notify.feierabendBody'),
        'anker-feierabend',
      )
    }
  }, [inFeierabend, day, day.notificationsEnabled, lifeLeft, t])

  // Schlaf-Erinnerung ab 21 Uhr
  useEffect(() => {
    if (!day.notificationsEnabled || !sleepPending || sleepNotifiedRef.current) {
      return
    }
    const tick = () => {
      const hour = new Date().getHours()
      if (hour >= 21 && !sleepNotifiedRef.current) {
        sleepNotifiedRef.current = true
        setBuddyMsg(sleepReminder(ctxFromDay(day)))
        notifyIfHidden(
          t('focus.notify.sleepTitle'),
          t('focus.notify.sleepBody'),
          'anker-sleep',
        )
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [day.notificationsEnabled, sleepPending, day, t])

  useEffect(() => {
    if (!running || showCheckIn || captureOpen || regulateOpen || !active) {
      if (!running) clearTimerDeadlines()
      return
    }

    if (endsAtRef.current == null) {
      armTimerDeadlines(secondsLeftRef.current)
    }

    const syncFromClock = () => {
      const now = Date.now()
      if (endsAtRef.current == null) return

      const left = Math.max(0, Math.round((endsAtRef.current - now) / 1000))
      secondsLeftRef.current = left
      setSecondsLeft(left)

      if (
        nextCheckInAtRef.current != null &&
        now >= nextCheckInAtRef.current
      ) {
        snapshotTimerDeadlines()
        setShowCheckIn(true)
        setRunning(false)
        setBuddyMsg(
          checkInPrompt(
            active,
            ctxFromDay(day, {
              minutesLeft: Math.max(0, Math.ceil(left / 60)),
            }),
          ),
        )
        if (day.notificationsEnabled) {
          notifyIfHidden(
            t('focus.notify.checkInTitle'),
            t('focus.notify.checkInBody', { title: active.title }),
            'anker-checkin',
          )
        }
        return
      }

      if (left <= 0) {
        clearTimerDeadlines()
        setRunning(false)
        setBuddyMsg(timeboxOver(ctxFromDay(day)))
      }
    }

    syncFromClock()
    const id = window.setInterval(syncFromClock, 1000)
    const onVis = () => {
      if (document.visibilityState === 'visible') syncFromClock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [
    running,
    showCheckIn,
    captureOpen,
    regulateOpen,
    active,
    day,
    day.notificationsEnabled,
    t,
  ])

  function endDay() {
    setDay((d) => ({
      ...d,
      tasks: d.tasks.map((task) =>
        task.status === 'done' ? task : { ...task, status: 'skipped' as const },
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
    setDay((d) => {
      const updated = d.tasks.map((task) =>
        task.id === active.id ? { ...task, status: 'done' as const } : task,
      )
      const next = activateNext(updated)
      const workDone = workTasksSettled(updated)
      const nextActive = next.find((task) => task.status === 'active')
      const lifeRemaining = updated.filter(
        (task) =>
          task.kind === 'life' &&
          (task.status === 'planned' || task.status === 'active'),
      ).length
      const ctx = ctxFromDay(
        { ...d, tasks: next },
        {
          lifeLeft: lifeRemaining,
          nextTitle:
            nextActive && nextActive.id !== active.id
              ? nextActive.title
              : undefined,
        },
      )
      if (workDone && active.kind === 'work') {
        setBuddyMsg(feierabend(ctx))
      } else {
        setBuddyMsg(afterDone(active, ctx))
      }
      return { ...d, tasks: next }
    })
  }

  function skipActive() {
    if (!active) return
    setDay((d) => {
      const updated = d.tasks.map((task) =>
        task.id === active.id ? { ...task, status: 'skipped' as const } : task,
      )
      return { ...d, tasks: activateNext(updated) }
    })
  }

  function chooseNext(id: string) {
    setDay((d) => ({
      ...d,
      tasks: d.tasks.map((task) => {
        if (task.id === id) return { ...task, status: 'active' }
        if (task.status === 'active') return { ...task, status: 'planned' }
        return task
      }),
    }))
  }

  function onCheckIn(choice: 'still' | 'drift' | 'pause') {
    setShowCheckIn(false)
    const ctx = ctxFromDay(day)
    if (choice === 'still') {
      checkInRemainingMsRef.current = null
      armTimerDeadlines(secondsLeftRef.current, checkInEveryMs)
      setRunning(true)
      setBuddyMsg(afterStill(active, ctx))
    } else if (choice === 'drift') {
      checkInRemainingMsRef.current = null
      armTimerDeadlines(secondsLeftRef.current, checkInEveryMs)
      setRunning(true)
      setBuddyMsg(afterDrift(ctx))
    } else {
      clearTimerDeadlines()
      setRunning(false)
      setBuddyMsg(afterPause(ctx))
    }
  }

  function openCapture() {
    wasRunningRef.current = running
    if (running) snapshotTimerDeadlines()
    setRunning(false)
    setCaptureOpen(true)
  }

  function closeCapture() {
    setCaptureOpen(false)
    if (active) {
      setBuddyMsg(backToFocus(active, ctxFromDay(day)))
    }
    if (wasRunningRef.current && !showCheckIn) {
      armTimerDeadlines(secondsLeftRef.current)
      setRunning(true)
    }
  }

  function saveSpark(partial: Omit<Spark, 'id' | 'createdAt'>) {
    const spark: Spark = {
      ...partial,
      id: uid(),
      createdAt: new Date().toISOString(),
    }
    const nextCount = day.sparks.length + 1
    setDay((d) => ({
      ...d,
      sparks: [...d.sparks, spark],
    }))
    setBuddyMsg(sparkParked(nextCount, ctxFromDay(day)))
    void pushSparkNow(spark)
  }

  function tryOpenVault() {
    if (!vaultOpen) {
      setBuddyMsg(sparkVaultLocked(sparkCount, ctxFromDay(day)))
      return
    }
    if (active?.kind === 'life') {
      setBuddyMsg(lifeContinue(active, ctxFromDay(day)))
    }
    setVaultVisible(true)
  }

  function sendSparkToDrawer(id: string) {
    const spark = day.sparks.find((s) => s.id === id)
    const title = spark?.text?.trim()
    if (!title) return
    const clipped = title.slice(0, 120)
    scheduleSaveDrawer(addInboxItem(loadDrawer(), clipped))
    void deleteSparkRemote(id)
    setDay((d) => ({
      ...d,
      sparks: d.sparks.filter((s) => s.id !== id),
    }))
    setBuddyMsg(t('sparkVault.toDrawerFlash', { title: clipped }))
  }

  const feierabendLine =
    lifeLeft > 0
      ? t('focus.feierabend.lineWithLife', { count: lifeLeft })
      : t('focus.feierabend.line')

  const sparkControls = (
    <div className="spark-bar">
      <button type="button" className="spark-btn" onClick={openCapture}>
        {t('focus.sparkBar.capture')}
      </button>
      <button
        type="button"
        className={`vault-btn ${vaultOpen ? 'open' : 'locked'}`}
        onClick={tryOpenVault}
        aria-label={
          vaultOpen
            ? t('focus.sparkBar.vaultOpenAria')
            : t('focus.sparkBar.vaultLockedAria')
        }
      >
        {vaultOpen
          ? t('focus.sparkBar.vaultOpen')
          : t('focus.sparkBar.vaultLocked')}
        {sparkCount > 0 && <span className="spark-count">{sparkCount}</span>}
      </button>
    </div>
  )

  if (!active) {
    return (
      <section className="screen focus-screen">
        {inFeierabend && (
          <div className="feierabend-banner" role="status">
            <strong>{t('focus.feierabend.title')}</strong>
            <span>{feierabendLine}</span>
            <div className="feierabend-actions">
              {sparkCount > 0 && (
                <button
                  type="button"
                  className="secondary sm"
                  onClick={() => setVaultVisible(true)}
                >
                  {t('focus.feierabend.openVault')}
                </button>
              )}
              <button type="button" className="ghost sm" onClick={endDay}>
                {t('focus.feierabend.closeDay')}
              </button>
            </div>
          </div>
        )}
        <div className="buddy-card" role="status">
          <span className="buddy-label">{t('common.buddy')}</span>
          <p>
            {inFeierabend
              ? feierabend(ctxFromDay(day, { lifeLeft }))
              : day.tasks.length === 0
                ? t('focus.noActiveEmpty')
                : t('focus.noActive')}
          </p>
        </div>
        {sparkControls}
        {waiting.length > 0 && (
          <ul className="queue">
            {waiting.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="queue-btn"
                  onClick={() => chooseNext(task.id)}
                >
                  <span className={`kind ${task.kind}`}>
                    {task.kind === 'work' ? t('common.work') : t('common.life')}
                  </span>
                  <span className="queue-task-text">
                    {task.parentTitle && (
                      <span className="task-parent-line">
                        {t('drawer.parentLine', { title: task.parentTitle })}
                      </span>
                    )}
                    {lifeTemplateLabel(task.title, t)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {day.tasks.length === 0 && (
          <button
            type="button"
            className="secondary lg"
            onClick={() => setDay((d) => ({ ...d, started: false }))}
          >
            {t('focus.backToPlan')}
          </button>
        )}
        <button type="button" className="ghost lg end-day" onClick={endDay}>
          {t('focus.endDay')}
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
            onDelete={(id) => {
              void deleteSparkRemote(id)
              setDay((d) => ({
                ...d,
                sparks: d.sparks.filter((s) => s.id !== id),
              }))
            }}
            onSendToDrawer={
              drawerEnabled ? sendSparkToDrawer : undefined
            }
          />
        )}
      </section>
    )
  }

  return (
    <section className="screen focus-screen">
      {inFeierabend && (
        <div className="feierabend-banner" role="status">
          <strong>{t('focus.feierabend.title')}</strong>
          <span>{feierabendLine}</span>
          <div className="feierabend-actions">
            {sparkCount > 0 && (
              <button
                type="button"
                className="secondary sm"
                onClick={() => setVaultVisible(true)}
              >
                {t('focus.feierabend.openVault')}
              </button>
            )}
            <button type="button" className="ghost sm" onClick={endDay}>
              {t('focus.feierabend.closeDay')}
            </button>
          </div>
        </div>
      )}

      <div className="progress-meta">
        <span>
          {t('focus.progress', { done: doneCount, waiting: waiting.length })}
        </span>
        <span className="meta-right">
          {active.kind === 'work' && (
            <span className={`size-badge ${active.size}`}>
              {sizeLabel(active.size)}
            </span>
          )}
          <span className={`kind ${active.kind}`}>
            {active.kind === 'work' ? t('common.work') : t('common.life')}
          </span>
        </span>
      </div>

      {active.parentTitle && (
        <p className="task-parent-line task-parent-line--focus">
          {t('drawer.parentLine', { title: active.parentTitle })}
        </p>
      )}
      <h2 className="focus-title">{lifeTemplateLabel(active.title, t)}</h2>

      <div className="timer-ring" style={{ ['--p' as string]: `${progress}%` }}>
        <div className="timer-inner">
          <span className="timer-digits">{formatTime(secondsLeft)}</span>
          <span className="timer-label">
            {captureOpen
              ? t('focus.timer.parked')
              : running
                ? t('focus.timer.running')
                : showCheckIn
                  ? t('focus.timer.checkIn')
                  : t('focus.timer.paused')}
          </span>
        </div>
      </div>

      <div className="buddy-card" role="status">
        <span className="buddy-label">{t('common.buddy')}</span>
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
            {t('focus.checkIn.still')}
          </button>
          <button
            type="button"
            className="secondary lg"
            onClick={() => onCheckIn('drift')}
          >
            {t('focus.checkIn.drift')}
          </button>
          <button
            type="button"
            className="ghost lg"
            onClick={() => onCheckIn('pause')}
          >
            {t('focus.checkIn.pause')}
          </button>
        </div>
      ) : (
        <div className="focus-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (running) {
                snapshotTimerDeadlines()
                setRunning(false)
                return
              }
              if (secondsLeft === 0 && active) {
                const left = active.minutes * 60
                setSecondsLeft(left)
                secondsLeftRef.current = left
                checkInRemainingMsRef.current = null
                armTimerDeadlines(left, checkInEveryMs)
                setBuddyMsg(anotherRound(ctxFromDay(day)))
                setRunning(true)
                return
              }
              armTimerDeadlines(secondsLeftRef.current)
              setRunning(true)
            }}
          >
            {running
              ? t('focus.actions.pause')
              : secondsLeft === 0
                ? t('focus.actions.anotherRound')
                : t('focus.actions.resume')}
          </button>
          <button type="button" className="primary" onClick={completeActive}>
            {t('focus.actions.done')}
          </button>
          <button type="button" className="ghost" onClick={skipActive}>
            {t('focus.actions.skip')}
          </button>
        </div>
      )}

      {waiting.length > 0 && (
        <div className="waiting-block">
          <h3>{t('focus.waiting.title')}</h3>
          <ul className="waiting-list">
            {waiting.map((task) => (
              <li key={task.id}>
                <span className={`kind tiny ${task.kind}`}>
                  {task.kind === 'work'
                    ? t('common.workAbbrev')
                    : t('common.lifeAbbrev')}
                </span>
                {task.kind === 'work' && (
                  <span className={`size-badge tiny ${task.size}`}>
                    {sizeLabel(task.size).slice(0, 1)}
                  </span>
                )}
                <span className="waiting-task-text">
                  {task.parentTitle && (
                    <span className="task-parent-line">
                      {t('drawer.parentLine', { title: task.parentTitle })}
                    </span>
                  )}
                  {lifeTemplateLabel(task.title, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="ghost lg end-day" onClick={endDay}>
        {t('focus.endDay')}
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
              setBuddyMsg(lifeContinue(active, ctxFromDay(day)))
            }
          }}
          onDelete={(id) => {
            void deleteSparkRemote(id)
            setDay((d) => ({
              ...d,
              sparks: d.sparks.filter((s) => s.id !== id),
            }))
          }}
          onSendToDrawer={drawerEnabled ? sendSparkToDrawer : undefined}
        />
      )}
    </section>
  )
}
