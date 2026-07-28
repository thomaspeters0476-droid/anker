import { useMemo, useState } from 'react'
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
  canAddSize,
  capacityPoints,
  remainingCapacity,
  setCapacitySize,
  usedCapacity,
  usedPoints,
  HARD_CAPS,
  MAX_DAY_POINTS,
} from '../capacity'

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

  const work = day.tasks.filter((t) => t.kind === 'work')
  const life = day.tasks.filter((t) => t.kind === 'life')
  const used = usedCapacity(day.tasks)
  const remain = remainingCapacity(day.capacity, day.tasks)
  const usedPts = usedPoints(day.tasks)
  const maxPts = capacityPoints(day.capacity)

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

  function startDay() {
    if (day.tasks.length === 0) return
    const firstWork = day.tasks.findIndex((t) => t.kind === 'work')
    const startIdx = firstWork !== -1 ? firstWork : 0
    setDay((d) => ({
      ...d,
      started: true,
      tasks: d.tasks.map((t, i) =>
        i === startIdx ? { ...t, status: 'active' } : { ...t, status: 'planned' },
      ),
    }))
  }

  const sizes: TaskSize[] = ['small', 'medium', 'large']

  return (
    <section className="screen plan-screen">
      <div className="buddy-card" role="status">
        <span className="buddy-label">Buddy</span>
        <p>{greeting(day.buddyTone)}</p>
      </div>

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

          {onShowIntro && (
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
