import { useEffect, useMemo, useState } from 'react'
import type { DayState, Task, TaskKind, TaskSize } from '../types'
import {
  LIFE_MAX_HARD,
  LIFE_TEMPLATES,
  clampLifeMax,
} from '../types'
import { capacityHint, greeting } from '../buddy'
import {
  SIZE_LABEL,
  SIZE_MINUTES,
  SIZE_POINTS,
  canAddSize,
  capacityPoints,
  remainingCapacity,
  setCapacitySize,
  usedCapacity,
  usedPoints,
  HARD_CAPS,
  MAX_DAY_POINTS,
} from '../capacity'
import {
  clearCarryOver,
  loadCarryOver,
  type CarryItem,
} from '../storage'
import {
  notificationPermission,
  requestNotificationPermission,
} from '../notifications'
import { PwaGuide } from '../components/PwaGuide'
import { isStandaloneApp } from '../pwa'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
  onShowIntro?: () => void
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function PlanScreen({ day, setDay, onShowIntro }: Props) {
  const [workDraft, setWorkDraft] = useState('')
  const [lifeDraft, setLifeDraft] = useState('')
  const [workSize, setWorkSize] = useState<TaskSize>('medium')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [carry, setCarry] = useState<CarryItem[]>(() => loadCarryOver())
  const [selectedCarry, setSelectedCarry] = useState<Set<number>>(
    () => new Set(loadCarryOver().map((_, i) => i)),
  )
  const [notifMsg, setNotifMsg] = useState<string | null>(null)

  const work = day.tasks.filter((t) => t.kind === 'work')
  const life = day.tasks.filter((t) => t.kind === 'life')
  const used = usedCapacity(day.tasks)
  const remain = remainingCapacity(day.capacity, day.tasks)
  const usedPts = usedPoints(day.tasks)
  const maxPts = capacityPoints(day.capacity)

  useEffect(() => {
    const items = loadCarryOver()
    setCarry(items)
    setSelectedCarry(new Set(items.map((_, i) => i)))
  }, [])

  const hint = useMemo(
    () =>
      capacityHint(usedPts, maxPts, life.length, day.lifeMax, day.buddyTone),
    [usedPts, maxPts, life.length, day.lifeMax, day.buddyTone],
  )

  function addTask(kind: TaskKind, title: string, size: TaskSize = 'small') {
    const trimmed = title.trim()
    if (!trimmed) return

    if (kind === 'life') {
      if (life.length >= day.lifeMax) return
      const task: Task = {
        id: uid(),
        title: trimmed,
        kind: 'life',
        status: 'planned',
        size: 'small',
        minutes: SIZE_MINUTES.small,
      }
      setDay((d) => ({ ...d, tasks: [...d.tasks, task] }))
      setLifeDraft('')
      return
    }

    if (!canAddSize(day.capacity, day.tasks, size)) return

    const task: Task = {
      id: uid(),
      title: trimmed,
      kind: 'work',
      status: 'planned',
      size,
      minutes: SIZE_MINUTES[size],
    }
    setDay((d) => ({ ...d, tasks: [...d.tasks, task] }))
    setWorkDraft('')
  }

  function removeTask(id: string) {
    setDay((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
  }

  function changeCapacity(size: TaskSize, value: number) {
    setDay((d) => ({
      ...d,
      capacity: setCapacitySize(d.capacity, size, value, usedCapacity(d.tasks)),
    }))
  }

  function changeLifeMax(value: number) {
    setDay((d) => ({
      ...d,
      lifeMax: clampLifeMax(value, life.length),
    }))
  }

  function toggleCarry(index: number) {
    setSelectedCarry((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function adoptCarry() {
    setDay((d) => {
      const tasks = [...d.tasks]
      let lifeCount = tasks.filter((t) => t.kind === 'life').length
      let points = capacityPoints(usedCapacity(tasks))

      for (const i of [...selectedCarry].sort((a, b) => a - b)) {
        const item = carry[i]
        if (!item) continue
        if (item.kind === 'life') {
          if (lifeCount >= d.lifeMax) continue
          tasks.push({
            id: uid(),
            title: item.title,
            kind: 'life',
            status: 'planned',
            size: 'small',
            minutes: SIZE_MINUTES.small,
          })
          lifeCount += 1
        } else {
          const need = SIZE_POINTS[item.size]
          const cap = capacityPoints(d.capacity)
          const fakeUsed = usedCapacity(tasks)
          if (points + need > cap) continue
          if (fakeUsed[item.size] >= d.capacity[item.size]) continue
          tasks.push({
            id: uid(),
            title: item.title,
            kind: 'work',
            status: 'planned',
            size: item.size,
            minutes: item.minutes || SIZE_MINUTES[item.size],
          })
          points += need
        }
      }
      return { ...d, tasks }
    })
    clearCarryOver()
    setCarry([])
    setSelectedCarry(new Set())
  }

  function dismissCarry() {
    clearCarryOver()
    setCarry([])
    setSelectedCarry(new Set())
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    if (result === 'granted') {
      setDay((d) => ({ ...d, notificationsEnabled: true }))
      setNotifMsg(
        'Erinnerungen an. Check-ins melden sich, wenn der Tab im Hintergrund ist.',
      )
    } else if (result === 'denied') {
      setDay((d) => ({ ...d, notificationsEnabled: false }))
      setNotifMsg('Blockiert — in den Browser-Einstellungen erlauben.')
    } else {
      setNotifMsg('In diesem Browser nicht verfügbar.')
    }
  }

  function startDay() {
    if (day.tasks.length === 0) return
    const firstWork = day.tasks.findIndex((t) => t.kind === 'work')
    const startIdx = firstWork !== -1 ? firstWork : 0
    setDay((d) => ({
      ...d,
      started: true,
      tasks: d.tasks.map((t, i) =>
        i === startIdx
          ? { ...t, status: 'active' }
          : { ...t, status: 'planned' },
      ),
    }))
  }

  const sizes: TaskSize[] = ['small', 'medium', 'large']
  const perm = notificationPermission()

  return (
    <section className="screen plan-screen">
      <div className="buddy-card" role="status">
        <span className="buddy-label">Buddy</span>
        <p>{greeting(day.buddyTone)}</p>
      </div>

      {carry.length > 0 && !day.started && (
        <div className="block block--carry">
          <div className="block-head">
            <h2>Von gestern</h2>
            <span className="count">{carry.length}</span>
          </div>
          <p className="block-hint">
            Offen geblieben — auswählen und mitnehmen (soweit Kapazität reicht).
          </p>
          <ul className="carry-list">
            {carry.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                <label className="carry-item">
                  <input
                    type="checkbox"
                    checked={selectedCarry.has(i)}
                    onChange={() => toggleCarry(i)}
                  />
                  <span className={`kind tiny ${item.kind}`}>
                    {item.kind === 'work' ? 'A' : 'T'}
                  </span>
                  <span className="carry-title">{item.title}</span>
                  {item.kind === 'work' && (
                    <span className={`size-badge tiny ${item.size}`}>
                      {SIZE_LABEL[item.size].slice(0, 1)}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
          <div className="carry-actions">
            <button
              type="button"
              className="primary"
              disabled={selectedCarry.size === 0}
              onClick={adoptCarry}
            >
              Übernehmen
            </button>
            <button type="button" className="ghost" onClick={dismissCarry}>
              Verwerfen
            </button>
          </div>
        </div>
      )}

      <div className="block block--work">
        <div className="block-head">
          <h2>Arbeit</h2>
          <span className="count">
            {usedPts}/{maxPts} Pkt
          </span>
        </div>
        <p className="block-hint">Größe wählen — Timer richtet sich danach.</p>
        <ul className="task-list">
          {work.map((t) => (
            <li key={t.id}>
              <span className="task-main">
                <span className={`size-badge ${t.size}`}>{SIZE_LABEL[t.size]}</span>
                {t.title}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => removeTask(t.id)}
                aria-label="Entfernen"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {(remain.small > 0 || remain.medium > 0 || remain.large > 0) && (
          <form
            className="add-stack"
            onSubmit={(e) => {
              e.preventDefault()
              addTask('work', workDraft, workSize)
            }}
          >
            <div className="size-picker" role="group" aria-label="Umfang">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-opt ${workSize === size ? 'active' : ''} ${
                    remain[size] <= 0 ? 'disabled' : ''
                  }`}
                  disabled={remain[size] <= 0}
                  onClick={() => setWorkSize(size)}
                >
                  {SIZE_LABEL[size]}
                  <small>{SIZE_MINUTES[size]} Min</small>
                </button>
              ))}
            </div>
            <div className="add-row">
              <input
                value={workDraft}
                onChange={(e) => setWorkDraft(e.target.value)}
                placeholder="z. B. Bericht fertigstellen"
                maxLength={80}
              />
              <button
                type="submit"
                className="primary sm"
                disabled={remain[workSize] <= 0}
              >
                Hinzufügen
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="block block--life">
        <div className="block-head">
          <h2>Alltag</h2>
          <span className="count">
            {life.length}/{day.lifeMax}
          </span>
        </div>
        <p className="block-hint">Zählt nicht in die Arbeitspunkte — nur Erinnern.</p>
        <ul className="task-list">
          {life.map((t) => (
            <li key={t.id}>
              <span>{t.title}</span>
              <button
                type="button"
                className="ghost"
                onClick={() => removeTask(t.id)}
                aria-label="Entfernen"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {life.length < day.lifeMax && (
          <>
            <div className="chips">
              {LIFE_TEMPLATES.filter(
                (tpl) => !life.some((t) => t.title === tpl),
              ).map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  className="chip"
                  onClick={() => addTask('life', tpl)}
                >
                  {tpl}
                </button>
              ))}
            </div>
            <form
              className="add-row"
              onSubmit={(e) => {
                e.preventDefault()
                addTask('life', lifeDraft)
              }}
            >
              <input
                value={lifeDraft}
                onChange={(e) => setLifeDraft(e.target.value)}
                placeholder="Eigener Alltagsanker…"
                maxLength={80}
              />
              <button type="submit" className="primary sm">
                Hinzufügen
              </button>
            </form>
          </>
        )}
      </div>

      {hint && (
        <div className="buddy-card warn" role="status">
          <span className="buddy-label">Buddy</span>
          <p>{hint}</p>
        </div>
      )}

      <button
        type="button"
        className="primary lg start-btn"
        disabled={day.tasks.length === 0}
        onClick={startDay}
      >
        Tag starten
      </button>

      {onShowIntro && day.introButtonOnSurface && (
        <div className="intro-surface">
          <button
            type="button"
            className="secondary lg"
            onClick={onShowIntro}
          >
            Einführung anzeigen
          </button>
          <label className="intro-hide-check">
            <input
              type="checkbox"
              checked={false}
              onChange={(e) => {
                if (e.target.checked) {
                  setDay((d) => ({ ...d, introButtonOnSurface: false }))
                }
              }}
            />
            Button ausblenden
          </label>
        </div>
      )}

      <div className="plan-footer">
        <div className="cap-summary muted">
          <div>
            <span className="cap-label">Arbeit heute</span>
            <strong>
              {usedPts}/{maxPts} Punkte
            </strong>
          </div>
          <div className="cap-pills">
            <span>G {used.large}/{day.capacity.large}</span>
            <span>M {used.medium}/{day.capacity.medium}</span>
            <span>K {used.small}/{day.capacity.small}</span>
          </div>
        </div>

        <details
          className="settings-panel"
          open={settingsOpen}
          onToggle={(e) =>
            setSettingsOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary>Einstellungen · Kapazität</summary>

          <p className="block-hint settings-intro">
            Wie viel Arbeit schaffst du realistisch? Höchstgrenzen:{' '}
            {HARD_CAPS.large} groß / {HARD_CAPS.medium} mittel /{' '}
            {HARD_CAPS.small} klein — zusammen max. {MAX_DAY_POINTS} Punkte
            (groß=3, mittel=2, klein=1). Setzt du eine Größe hoch, rutschen die
            anderen automatisch runter.
          </p>

          <div className="cap-controls">
            {sizes.map((size) => (
              <label key={size} className="cap-step">
                <span>{SIZE_LABEL[size]}</span>
                <div className="stepper">
                  <button
                    type="button"
                    className="ghost"
                    aria-label={`${SIZE_LABEL[size]} weniger`}
                    disabled={day.capacity[size] <= used[size]}
                    onClick={() =>
                      changeCapacity(size, day.capacity[size] - 1)
                    }
                  >
                    −
                  </button>
                  <strong>{day.capacity[size]}</strong>
                  <button
                    type="button"
                    className="ghost"
                    aria-label={`${SIZE_LABEL[size]} mehr`}
                    disabled={
                      day.capacity[size] >= HARD_CAPS[size] ||
                      setCapacitySize(
                        day.capacity,
                        size,
                        day.capacity[size] + 1,
                        used,
                      )[size] === day.capacity[size]
                    }
                    onClick={() =>
                      changeCapacity(size, day.capacity[size] + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </label>
            ))}
          </div>

          <p className="cap-points">
            Tagesbudget Arbeit: <strong>{maxPts}</strong> / {MAX_DAY_POINTS}{' '}
            Punkte
          </p>

          <label className="cap-step">
            <span>Alltagsanker max.</span>
            <div className="stepper">
              <button
                type="button"
                className="ghost"
                aria-label="Weniger Alltagsanker"
                disabled={day.lifeMax <= Math.max(1, life.length)}
                onClick={() => changeLifeMax(day.lifeMax - 1)}
              >
                −
              </button>
              <strong>{day.lifeMax}</strong>
              <button
                type="button"
                className="ghost"
                aria-label="Mehr Alltagsanker"
                disabled={day.lifeMax >= LIFE_MAX_HARD}
                onClick={() => changeLifeMax(day.lifeMax + 1)}
              >
                +
              </button>
            </div>
          </label>
          <p className="block-hint" style={{ marginTop: '0.35rem' }}>
            Höchstens {LIFE_MAX_HARD}. Weniger ist oft besser.
          </p>

          <div className="tone-row">
            <label htmlFor="tone">Buddy-Ton</label>
            <select
              id="tone"
              value={day.buddyTone}
              onChange={(e) =>
                setDay((d) => ({
                  ...d,
                  buddyTone: e.target.value as DayState['buddyTone'],
                }))
              }
            >
              <option value="warm">Warm</option>
              <option value="kurz">Kurz</option>
              <option value="klar">Klar</option>
            </select>
          </div>

          <div className="settings-row">
            <label htmlFor="checkin">
              Check-in alle <strong>{day.checkInEveryMin}</strong> Min.
            </label>
            <input
              id="checkin"
              type="range"
              min={10}
              max={40}
              step={5}
              value={day.checkInEveryMin}
              onChange={(e) =>
                setDay((d) => ({
                  ...d,
                  checkInEveryMin: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="notif-settings">
            <PwaGuide />

            <label className="intro-hide-check settings-check">
              <input
                type="checkbox"
                checked={day.notificationsEnabled && perm === 'granted'}
                onChange={(e) => {
                  if (e.target.checked) void enableNotifications()
                  else setDay((d) => ({ ...d, notificationsEnabled: false }))
                }}
              />
              Erinnerungen einschalten (Check-in / Schlaf)
            </label>
            {!isStandaloneApp() && (
              <p className="block-hint">
                Am Handy zuerst oben speichern — sonst kommen Mitteilungen oft
                nicht zuverlässig an.
              </p>
            )}
            {perm === 'denied' && (
              <p className="block-hint">
                Mitteilungen sind blockiert. In den Handy-Einstellungen bei
                Anker erlauben.
              </p>
            )}
            {notifMsg && <p className="export-msg">{notifMsg}</p>}
          </div>

          <label className="intro-hide-check settings-check">
            <input
              type="checkbox"
              checked={day.introButtonOnSurface}
              onChange={(e) =>
                setDay((d) => ({
                  ...d,
                  introButtonOnSurface: e.target.checked,
                }))
              }
            />
            Einführungs-Button auf der Startseite
          </label>

          {onShowIntro && !day.introButtonOnSurface && (
            <button
              type="button"
              className="secondary lg intro-again"
              onClick={onShowIntro}
            >
              Einführung nochmal anzeigen
            </button>
          )}
        </details>
      </div>
    </section>
  )
}
