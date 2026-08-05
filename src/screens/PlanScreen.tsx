import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type SetStateAction,
} from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DayState, Task, TaskKind, TaskSize } from '../types'
import {
  LIFE_MAX_HARD,
  clampLifeMax,
  isDefaultLifeTemplate,
  normalizeTitleList,
  visibleLifeAnchors,
} from '../types'
import { capacityHint, ctxFromDay, planBuddy } from '../buddy'
import {
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
  loadDrawer,
  loadPrefs,
  savePrefs,
  SPARK_RETENTION_DAYS,
  type CarryItem,
} from '../storage'
import { scheduleSaveDrawer } from '../persist'
import {
  notificationPermission,
  notificationsReadyToEnable,
  notifyTestPing,
  refreshNativePermCache,
  requestNotificationPermission,
} from '../notifications'
import { PwaGuide } from '../components/PwaGuide'
import { isLikelyIos, isStandaloneApp } from '../pwa'

const Handbook = lazy(() =>
  import('../components/Handbook').then((m) => ({ default: m.Handbook })),
)
const SyncSettings = lazy(() =>
  import('../components/SyncSettings').then((m) => ({
    default: m.SyncSettings,
  })),
)
const DrawerPanel = lazy(() =>
  import('../components/DrawerPanel').then((m) => ({ default: m.DrawerPanel })),
)
import {
  MOOD_OPTIONS,
  capacityForMood,
  lifeMaxForMood,
  minutesForSize,
  type DayMood,
} from '../mood'
import {
  isValidSparksEmail,
  normalizeSparksEmail,
} from '../sparkExpiry'
import type { SyncConflict } from '../sync'
import { setAppLocale } from '../i18n'
import type { DrawerState } from '../drawer/types'
import {
  APP_LOCALES,
  LOCALE_LABELS,
  normalizeLocale,
  type AppLocale,
} from '../i18n/locales'
import { lifeTemplateLabel } from '../i18n/lifeLabels'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
  onShowIntro?: () => void
  sparkMailNotice?: string | null
  onDismissSparkMailNotice?: () => void
  syncEmail?: string | null
  syncNotice?: string | null
  syncConflict?: SyncConflict | null
  onSyncNotice?: (msg: string | null) => void
  onSyncKeepLocal?: () => void
  onSyncUseCloud?: () => void
  onSyncSignedOut?: () => void
  onSyncVaultReady?: () => void
  drawerEnabled?: boolean
  onDrawerEnabledChange?: (on: boolean) => void
  settingsOpen?: boolean
  onSettingsOpenChange?: (open: boolean) => void
  forceOpenSync?: boolean
  onForceOpenSyncConsumed?: () => void
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function PlanScreen({
  day,
  setDay,
  onShowIntro,
  sparkMailNotice,
  onDismissSparkMailNotice,
  syncEmail = null,
  syncNotice = null,
  syncConflict = null,
  onSyncNotice,
  onSyncKeepLocal,
  onSyncUseCloud,
  onSyncSignedOut,
  onSyncVaultReady,
  drawerEnabled = false,
  onDrawerEnabledChange,
  settingsOpen: settingsOpenProp,
  onSettingsOpenChange,
  forceOpenSync = false,
  onForceOpenSyncConsumed,
}: Props) {
  const { t, i18n } = useTranslation()
  const [locale, setLocale] = useState<AppLocale>(() => loadPrefs().locale)
  const sizeLabel = (size: TaskSize) => t(`common.size.${size}`)
  const [workDraft, setWorkDraft] = useState('')
  const [lifeDraft, setLifeDraft] = useState('')
  const [workSize, setWorkSize] = useState<TaskSize>('medium')
  const [settingsLocal, setSettingsLocal] = useState(false)
  const settingsOpen = settingsOpenProp ?? settingsLocal
  const setSettingsOpen = onSettingsOpenChange ?? setSettingsLocal
  const [syncSectionOpen, setSyncSectionOpen] = useState(Boolean(syncEmail))
  const [drawerAdvanced, setDrawerAdvanced] = useState(
    () => loadPrefs().drawerAdvanced,
  )
  const [handbookOpen, setHandbookOpen] = useState(false)
  const [carry, setCarry] = useState<CarryItem[]>(() => loadCarryOver())
  const [selectedCarry, setSelectedCarry] = useState<Set<number>>(
    () => new Set(loadCarryOver().map((_, i) => i)),
  )
  const [notifMsg, setNotifMsg] = useState<string | null>(null)
  const [moodNudge, setMoodNudge] = useState(false)
  const [adoptTip, setAdoptTip] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'drop' | 'pull' | null>(null)
  const [drawer, setDrawer] = useState<DrawerState>(() => loadDrawer())
  const [shortMorning, setShortMorning] = useState(
    () => loadPrefs().shortMorning,
  )
  const [aiChopOptIn, setAiChopOptIn] = useState(
    () => loadPrefs().drawerAiChopOptIn,
  )
  const [readyCap, setReadyCap] = useState(() => loadPrefs().drawerReadyCap)
  const [planMoreOpen, setPlanMoreOpen] = useState(false)

  function updateDrawer(next: SetStateAction<DrawerState>) {
    setDrawer((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      scheduleSaveDrawer(value)
      return value
    })
  }

  const work = day.tasks.filter((t) => t.kind === 'work')
  const life = day.tasks.filter((t) => t.kind === 'life')
  const used = usedCapacity(day.tasks)
  const remain = remainingCapacity(day.capacity, day.tasks)
  const usedPts = usedPoints(day.tasks)
  const maxPts = capacityPoints(day.capacity)

  useEffect(() => {
    const pref = loadPrefs().locale
    setLocale(pref)
    if (normalizeLocale(i18n.language) !== pref) {
      void setAppLocale(pref)
    }
  }, [i18n.language])

  useEffect(() => {
    if (!forceOpenSync) return
    setSyncSectionOpen(true)
    onForceOpenSyncConsumed?.()
  }, [forceOpenSync, onForceOpenSyncConsumed])

  useEffect(() => {
    const items = loadCarryOver()
    setCarry(items)
    setSelectedCarry(new Set(items.map((_, i) => i)))
  }, [])

  // Kapazität an aktuelle Mood-Formel anpassen (z. B. nach Fix „nur Mittel“)
  useEffect(() => {
    if (day.started || !day.mood) return
    setDay((d) => {
      if (!d.mood) return d
      const baseline = d.baselineCapacity ?? d.capacity
      const capacity = capacityForMood(baseline, d.mood)
      if (
        capacity.large === d.capacity.large &&
        capacity.medium === d.capacity.medium &&
        capacity.small === d.capacity.small
      ) {
        return d
      }
      const lifeMax = clampLifeMax(
        lifeMaxForMood(d.baselineLifeMax ?? d.lifeMax, d.mood),
        d.tasks.filter((t) => t.kind === 'life').length,
      )
      return {
        ...d,
        capacity,
        lifeMax,
        tasks: d.tasks.map((t) =>
          t.kind === 'work'
            ? { ...t, minutes: minutesForSize(t.size, d.mood) }
            : t,
        ),
      }
    })
    // absichtlich nur beim ersten Mount / Mood-Start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.mood, day.started])

  const hint = useMemo(
    () =>
      capacityHint(
        usedPts,
        maxPts,
        life.length,
        day.lifeMax,
        day.buddyTone,
        day.mood,
      ),
    [usedPts, maxPts, life.length, day.lifeMax, day.buddyTone, day.mood],
  )

  const lifeAnchors = useMemo(
    () =>
      visibleLifeAnchors(
        day.hiddenLifeTemplates ?? [],
        day.customLifeAnchors ?? [],
      ),
    [day.hiddenLifeTemplates, day.customLifeAnchors],
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
      setDay((d) => {
        const hidden = [...(d.hiddenLifeTemplates ?? [])]
        let custom = [...(d.customLifeAnchors ?? [])]
        if (isDefaultLifeTemplate(trimmed)) {
          const nextHidden = hidden.filter((h) => h !== trimmed)
          return {
            ...d,
            tasks: [...d.tasks, task],
            hiddenLifeTemplates: nextHidden,
          }
        }
        if (!custom.includes(trimmed)) custom = [...custom, trimmed]
        return {
          ...d,
          tasks: [...d.tasks, task],
          customLifeAnchors: custom,
          hiddenLifeTemplates: hidden,
        }
      })
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
      minutes: minutesForSize(size, day.mood),
    }
    setDay((d) => ({ ...d, tasks: [...d.tasks, task] }))
    setWorkDraft('')
  }

  function removeTask(id: string) {
    setDay((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
  }

  /** Vorschlag dauerhaft ausblenden (eigene löschen, Standards verstecken) */
  function forgetLifeAnchor(title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    setDay((d) => {
      if (isDefaultLifeTemplate(trimmed)) {
        return {
          ...d,
          hiddenLifeTemplates: normalizeTitleList([
            ...(d.hiddenLifeTemplates ?? []),
            trimmed,
          ]),
        }
      }
      return {
        ...d,
        customLifeAnchors: (d.customLifeAnchors ?? []).filter(
          (t) => t !== trimmed,
        ),
      }
    })
  }

  function changeCapacity(size: TaskSize, value: number) {
    setDay((d) => {
      const baseline = setCapacitySize(
        d.baselineCapacity ?? d.capacity,
        size,
        value,
        usedCapacity(d.tasks),
      )
      const mood = d.mood
      const capacity = mood ? capacityForMood(baseline, mood) : baseline
      return {
        ...d,
        baselineCapacity: baseline,
        capacity,
      }
    })
  }

  function changeLifeMax(value: number) {
    setDay((d) => {
      const baselineLifeMax = clampLifeMax(
        value,
        life.length,
      )
      const mood = d.mood
      const lifeMax = mood
        ? lifeMaxForMood(baselineLifeMax, mood)
        : baselineLifeMax
      // Floor: nicht unter bereits geplante Alltagsaufgaben
      const floored = clampLifeMax(lifeMax, life.length)
      return {
        ...d,
        baselineLifeMax,
        lifeMax: floored,
      }
    })
  }

  function dayWithMood(d: DayState, mood: DayMood): DayState {
    const baseline = d.baselineCapacity ?? d.capacity
    const baselineLife = d.baselineLifeMax ?? d.lifeMax
    const capacity = capacityForMood(baseline, mood)
    const lifeMax = clampLifeMax(
      lifeMaxForMood(baselineLife, mood),
      d.tasks.filter((t) => t.kind === 'life').length,
    )
    const tasks = d.tasks.map((t) =>
      t.kind === 'work'
        ? { ...t, minutes: minutesForSize(t.size, mood) }
        : t,
    )
    return {
      ...d,
      mood,
      baselineCapacity: baseline,
      baselineLifeMax: baselineLife,
      capacity,
      lifeMax,
      tasks,
    }
  }

  /** Ohne Angabe: „ziemlich gut“ — keine Pflichtfrage */
  function dayWithMoodOrGood(d: DayState): DayState {
    if (d.mood) return d
    return dayWithMood(d, 'good')
  }

  function applyMood(mood: DayMood) {
    setMoodNudge(false)
    setDay((d) => dayWithMood(d, mood))
  }

  function toggleCarry(index: number) {
    setSelectedCarry((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function adoptCarryItems(base: DayState, selected: Set<number>): Task[] {
    const tasks = [...base.tasks]
    let lifeCount = tasks.filter((t) => t.kind === 'life').length
    let points = capacityPoints(usedCapacity(tasks))

    for (const i of [...selected].sort((a, b) => a - b)) {
      const item = carry[i]
      if (!item) continue
      if (item.kind === 'life') {
        if (lifeCount >= base.lifeMax) continue
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
        const cap = capacityPoints(base.capacity)
        const fakeUsed = usedCapacity(tasks)
        if (points + need > cap) continue
        if (fakeUsed[item.size] >= base.capacity[item.size]) continue
        tasks.push({
          id: uid(),
          title: item.title,
          kind: 'work',
          status: 'planned',
          size: item.size,
          minutes: item.minutes || SIZE_MINUTES[item.size],
          ...(item.parentTitle?.trim()
            ? { parentTitle: item.parentTitle.trim() }
            : {}),
        })
        points += need
      }
    }
    return tasks
  }

  function adoptCarry() {
    setDay((d) => ({ ...d, tasks: adoptCarryItems(d, selectedCarry) }))
    clearCarryOver()
    setCarry([])
    setSelectedCarry(new Set())
    if (shortMorning) {
      setPlanMoreOpen(true)
      setAdoptTip(true)
    }
  }

  function adoptCarryAndStart() {
    setMoodNudge(false)
    setAdoptTip(false)
    setDay((d) => {
      const withMood = dayWithMoodOrGood(d)
      const tasks = adoptCarryItems(withMood, selectedCarry)
      if (tasks.length === 0) {
        return { ...withMood, tasks, started: true }
      }
      const firstWork = tasks.findIndex((t) => t.kind === 'work')
      const startIdx = firstWork !== -1 ? firstWork : 0
      return {
        ...withMood,
        tasks: tasks.map((t, i) =>
          i === startIdx
            ? { ...t, status: 'active' }
            : { ...t, status: 'planned' },
        ),
        started: true,
      }
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

  function setWorkTaskSize(id: string, size: TaskSize) {
    setDay((d) => {
      const others = d.tasks.filter((t) => t.id !== id)
      const current = d.tasks.find((t) => t.id === id)
      if (!current || current.kind !== 'work') return d
      if (current.size === size) return d
      if (!canAddSize(d.capacity, others, size)) return d
      return {
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                size,
                minutes: minutesForSize(size, d.mood),
              }
            : t,
        ),
      }
    })
  }

  function suggestTypicalLife() {
    const room = day.lifeMax - life.length
    if (room <= 0) return
    const picks = lifeAnchors
      .filter((tpl) => !life.some((task) => task.title === tpl))
      .slice(0, Math.min(2, room))
    if (picks.length === 0) return

    setDay((d) => {
      let nextLife = d.tasks.filter((t) => t.kind === 'life').length
      const tasks = [...d.tasks]
      let hidden = [...(d.hiddenLifeTemplates ?? [])]
      let custom = [...(d.customLifeAnchors ?? [])]
      for (const trimmed of picks) {
        if (nextLife >= d.lifeMax) break
        if (tasks.some((t) => t.kind === 'life' && t.title === trimmed)) continue
        tasks.push({
          id: uid(),
          title: trimmed,
          kind: 'life',
          status: 'planned',
          size: 'small',
          minutes: SIZE_MINUTES.small,
        })
        nextLife += 1
        if (isDefaultLifeTemplate(trimmed)) {
          hidden = hidden.filter((h) => h !== trimmed)
        } else if (!custom.includes(trimmed)) {
          custom = [...custom, trimmed]
        }
      }
      return {
        ...d,
        tasks,
        hiddenLifeTemplates: hidden,
        customLifeAnchors: custom,
      }
    })
  }

  function persistShortMorning(value: boolean) {
    setShortMorning(value)
    savePrefs({ ...loadPrefs(), shortMorning: value })
    if (!value) setPlanMoreOpen(true)
  }

  function setDrawerEnabledPref(value: boolean) {
    savePrefs({ ...loadPrefs(), drawerEnabled: value })
    onDrawerEnabledChange?.(value)
    if (!value) setDrawerMode(null)
  }

  function setAiChopOptInPref(value: boolean) {
    setAiChopOptIn(value)
    savePrefs({ ...loadPrefs(), drawerAiChopOptIn: value })
  }

  async function enableNotifications() {
    if (!notificationsReadyToEnable()) {
      setNotifMsg(
        isLikelyIos()
          ? t('settings.reminders.iosInstallFirst')
          : t('settings.reminders.saveFirstHint'),
      )
      return
    }
    const result = await requestNotificationPermission()
    if (result === 'granted') {
      setDay((d) => ({ ...d, notificationsEnabled: true }))
      setNotifMsg(t('settings.reminders.notifGranted'))
      notifyTestPing(
        t('settings.reminders.testTitle'),
        t('settings.reminders.testBody'),
      )
    } else if (result === 'denied') {
      setDay((d) => ({ ...d, notificationsEnabled: false }))
      setNotifMsg(t('settings.reminders.notifDenied'))
    } else {
      setNotifMsg(t('settings.reminders.notifUnsupported'))
    }
  }

  function startDay() {
    setMoodNudge(false)
    setAdoptTip(false)
    setDay((d) => {
      const withMood = dayWithMoodOrGood(d)
      if (withMood.tasks.length === 0) {
        return { ...withMood, started: true }
      }
      const firstWork = withMood.tasks.findIndex((t) => t.kind === 'work')
      const startIdx = firstWork !== -1 ? firstWork : 0
      return {
        ...withMood,
        started: true,
        tasks: withMood.tasks.map((t, i) =>
          i === startIdx
            ? { ...t, status: 'active' }
            : { ...t, status: 'planned' },
        ),
      }
    })
  }

  const sizes: TaskSize[] = ['small', 'medium', 'large']
  const [perm, setPerm] = useState(notificationPermission)
  useEffect(() => {
    const refresh = () => {
      void refreshNativePermCache().then(() => setPerm(notificationPermission()))
      setPerm(notificationPermission())
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const compactMorning = shortMorning && !day.started
  const canSuggestLife =
    life.length < day.lifeMax &&
    lifeAnchors.some((tpl) => !life.some((task) => task.title === tpl))

  const workBlock = (
      <div className="block block--work">
        <div className="block-head">
          <div className="block-head-title">
            <span className="kind work" aria-hidden>
              {t('plan.work.kindShort')}
            </span>
            <h2 id="plan-work-heading">{t('plan.work.title')}</h2>
          </div>
          <span className="count">
            {t('plan.work.count', { used: usedPts, max: maxPts })}
          </span>
        </div>
        <p className="block-hint">
          {compactMorning ? t('plan.work.hintShort') : t('plan.work.hint')}
        </p>
        <ul className="task-list" aria-labelledby="plan-work-heading">
          {work.map((task) => (
            <li key={task.id} className={compactMorning ? 'task-row--sized' : undefined}>
              <span className="task-main">
                {task.parentTitle && (
                  <span className="task-parent-line">
                    {t('drawer.parentLine', { title: task.parentTitle })}
                  </span>
                )}
                {!compactMorning && (
                  <span className={`size-badge ${task.size}`}>
                    {sizeLabel(task.size)}
                  </span>
                )}
                {task.title}
              </span>
              {compactMorning && (
                <div
                  className="task-size-switch"
                  role="group"
                  aria-label={t('plan.work.sizeAria')}
                >
                  {sizes.map((size) => {
                    const others = day.tasks.filter((t) => t.id !== task.id)
                    const blocked =
                      size !== task.size &&
                      !canAddSize(day.capacity, others, size)
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`task-size-opt ${task.size === size ? 'active' : ''}`}
                        disabled={blocked}
                        onClick={() => setWorkTaskSize(task.id, size)}
                      >
                        {sizeLabel(size).slice(0, 1)}
                      </button>
                    )
                  })}
                </div>
              )}
              <button
                type="button"
                className="ghost"
                onClick={() => removeTask(task.id)}
                aria-label={t('common.remove')}
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
            <div
              className="size-picker"
              role="group"
              aria-label={t('plan.work.sizeAria')}
            >
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
                  {sizeLabel(size)}
                  <small>
                    {t('plan.work.minutes', {
                      n: minutesForSize(size, day.mood),
                    })}
                  </small>
                </button>
              ))}
            </div>
            <div className="add-row">
              <input
                value={workDraft}
                onChange={(e) => setWorkDraft(e.target.value)}
                placeholder={t('plan.work.placeholder')}
                maxLength={80}
              />
              <button
                type="submit"
                className="primary sm"
                disabled={remain[workSize] <= 0}
              >
                {t('common.add')}
              </button>
            </div>
          </form>
        )}
      </div>
  )

  const lifeBlock = (
      <div className="block block--life">
        <div className="block-head">
          <div className="block-head-title">
            <span className="kind life" aria-hidden>
              {t('plan.life.kindShort')}
            </span>
            <h2 id="plan-life-heading">{t('plan.life.title')}</h2>
          </div>
          <span className="count">
            {t('plan.life.count', { used: life.length, max: day.lifeMax })}
          </span>
        </div>
        <p className="block-hint">
          {compactMorning ? t('plan.life.hintShort') : t('plan.life.hint')}
        </p>
        {compactMorning && canSuggestLife && (
          <button
            type="button"
            className="secondary sm life-suggest"
            onClick={suggestTypicalLife}
          >
            {t('plan.life.suggestTypical')}
          </button>
        )}
        <ul className="task-list" aria-labelledby="plan-life-heading">
          {life.map((task) => (
            <li key={task.id}>
              <span>{lifeTemplateLabel(task.title, t)}</span>
              <button
                type="button"
                className="ghost"
                onClick={() => removeTask(task.id)}
                aria-label={t('common.remove')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {lifeAnchors.length > 0 && (
          <div className="chips">
            {lifeAnchors.map((tpl) => {
              const onPlan = life.some((task) => task.title === tpl)
              const canAdd = !onPlan && life.length < day.lifeMax
              const label = lifeTemplateLabel(tpl, t)
              return (
                <span key={tpl} className="chip-group">
                  <button
                    type="button"
                    className={`chip${onPlan ? ' chip--on' : ''}`}
                    disabled={!canAdd}
                    onClick={() => addTask('life', tpl)}
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    className="chip-forget"
                    onClick={() => forgetLifeAnchor(tpl)}
                    aria-label={t('plan.life.forgetAria', { title: label })}
                    title={t('plan.life.forgetTitle')}
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        )}
        {life.length < day.lifeMax && (
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
              placeholder={t('plan.life.placeholder')}
              maxLength={80}
            />
            <button type="submit" className="primary sm">
              {t('common.add')}
            </button>
          </form>
        )}
      </div>
  )

  return (
    <section
      className={`screen plan-screen${compactMorning ? ' plan-screen--short' : ''}`}
    >
      <div className="buddy-card" role="status">
        <span className="buddy-label">{t('common.buddy')}</span>
        <p>
          {planBuddy(ctxFromDay(day, { carryCount: carry.length }))}
        </p>
        {drawerEnabled && (
          <p className="block-hint plan-round-line">
            {t('plan.roundLabel', { round: Math.max(1, day.round ?? 1) })}
          </p>
        )}
      </div>

      {!day.started && (
        <div className="morning-quick-links">
          {drawerEnabled && (
            <>
              <button
                type="button"
                className="ghost sm morning-drawer-link"
                onClick={() => setDrawerMode('drop')}
              >
                {t('drawer.quickDrop')}
              </button>
              <button
                type="button"
                className="ghost sm morning-drawer-link"
                onClick={() => setDrawerMode('pull')}
              >
                {t('drawer.quickPull')}
              </button>
            </>
          )}
          <details className="morning-overflow">
            <summary>{t('plan.morningMenu')}</summary>
            <div className="morning-overflow-body">
              {compactMorning ? (
                <button
                  type="button"
                  className="ghost sm"
                  onClick={() => persistShortMorning(false)}
                >
                  {t('plan.switchToFull')}
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost sm"
                  onClick={() => persistShortMorning(true)}
                >
                  {t('plan.switchToShort')}
                </button>
              )}
              {onShowIntro && (
                <button
                  type="button"
                  className="ghost sm"
                  onClick={onShowIntro}
                >
                  {t('plan.introSurface.show')}
                </button>
              )}
              <button
                type="button"
                className="ghost sm"
                onClick={() => setSettingsOpen(true)}
              >
                {t('settings.summary')}
              </button>
            </div>
          </details>
        </div>
      )}

      {sparkMailNotice && (
        <div className="buddy-card warn spark-mail-notice" role="status">
          <span className="buddy-label">{t('plan.sparkMailNoticeLabel')}</span>
          <p>{sparkMailNotice}</p>
          {onDismissSparkMailNotice && (
            <button
              type="button"
              className="ghost sm"
              onClick={onDismissSparkMailNotice}
            >
              {t('common.ok')}
            </button>
          )}
        </div>
      )}

      {!day.started && (
        <div
          className={`block block--mood${moodNudge ? ' block--nudge' : ''}`}
        >
          <div className="block-head">
            <h2>{t('plan.mood.title')}</h2>
          </div>
          <p className="block-hint">{t('plan.mood.hint')}</p>
          {moodNudge && (
            <p className="plan-nudge" role="status">
              {t('plan.mood.nudge')}
            </p>
          )}
          <div
            className="mood-picker"
            role="group"
            aria-label={t('plan.mood.ariaLabel')}
          >
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`mood-opt ${day.mood === opt.id ? 'active' : ''}`}
                onClick={() => applyMood(opt.id)}
              >
                <span className="mood-label">
                  {t(`plan.mood.${opt.id}.label`)}
                </span>
                <small>{t(`plan.mood.${opt.id}.hint`)}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {carry.length > 0 && !day.started && (
        <div className="block block--carry">
          <div className="block-head">
            <h2>{t('plan.carry.title')}</h2>
            <span className="count">{carry.length}</span>
          </div>
          <p className="block-hint">
            {compactMorning ? t('plan.carry.hintShort') : t('plan.carry.hint')}
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
                    {item.kind === 'work'
                      ? t('common.workAbbrev')
                      : t('common.lifeAbbrev')}
                  </span>
                  <span className="carry-title">
                    {item.parentTitle && (
                      <span className="task-parent-line">
                        {t('drawer.parentLine', { title: item.parentTitle })}
                      </span>
                    )}
                    {lifeTemplateLabel(item.title, t)}
                  </span>
                  {item.kind === 'work' && (
                    <span className={`size-badge tiny ${item.size}`}>
                      {sizeLabel(item.size).slice(0, 1)}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
          <div className="carry-actions">
            {compactMorning ? (
              <>
                <button
                  type="button"
                  className="primary"
                  disabled={selectedCarry.size === 0}
                  onClick={adoptCarryAndStart}
                >
                  {t('plan.carry.adoptAndStart')}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={selectedCarry.size === 0}
                  onClick={adoptCarry}
                >
                  {t('plan.carry.adopt')}
                </button>
                <button type="button" className="ghost" onClick={dismissCarry}>
                  {t('plan.carry.dismiss')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="primary"
                  disabled={selectedCarry.size === 0}
                  onClick={adoptCarry}
                >
                  {t('plan.carry.adopt')}
                </button>
                <button type="button" className="ghost" onClick={dismissCarry}>
                  {t('plan.carry.dismiss')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {adoptTip && compactMorning && day.tasks.length > 0 && !day.started && (
        <p className="plan-nudge plan-nudge--ok" role="status">
          {t('plan.carry.adoptTip')}
        </p>
      )}

      {compactMorning ? (
        <details
          className="morning-more"
          open={planMoreOpen}
          onToggle={(e) => {
            if (e.target !== e.currentTarget) return
            setPlanMoreOpen(e.currentTarget.open)
          }}
        >
          <summary>
            {t('plan.morningMore')}
            {day.tasks.length > 0
              ? ` · ${t('plan.planned.count', { count: day.tasks.length })}`
              : ''}
          </summary>
          {workBlock}
          {lifeBlock}
        </details>
      ) : (
        <>
          {workBlock}
          {lifeBlock}
        </>
      )}

      {hint && !compactMorning && (
        <div className="buddy-card warn" role="status">
          <span className="buddy-label">{t('common.buddy')}</span>
          <p>{hint}</p>
        </div>
      )}

      {!day.started && (
        <div className="start-day-wrap">
          <button
            type="button"
            className="primary lg start-btn"
            onClick={startDay}
          >
            {day.tasks.length === 0
              ? t('plan.startDayEmpty')
              : t('plan.startDay')}
          </button>
          {day.tasks.length === 0 && (
            <p className="block-hint start-day-hint">
              {t('plan.startDayEmptyHint')}
            </p>
          )}
        </div>
      )}

      {onShowIntro && day.introButtonOnSurface && !compactMorning && (
        <div className="intro-surface">
          <button
            type="button"
            className="secondary lg"
            onClick={onShowIntro}
          >
            {t('plan.introSurface.show')}
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
            {t('plan.introSurface.hideButton')}
          </label>
        </div>
      )}

      <div className="plan-footer">
        {!compactMorning && (
          <div className="cap-summary muted">
            <div>
              <span className="cap-label">{t('plan.capSummary.label')}</span>
              <strong>
                {t('plan.capSummary.points', { used: usedPts, max: maxPts })}
              </strong>
            </div>
            <div className="cap-pills">
              <span>
                {t('plan.capSummary.large', {
                  used: used.large,
                  max: day.capacity.large,
                })}
              </span>
              <span>
                {t('plan.capSummary.medium', {
                  used: used.medium,
                  max: day.capacity.medium,
                })}
              </span>
              <span>
                {t('plan.capSummary.small', {
                  used: used.small,
                  max: day.capacity.small,
                })}
              </span>
            </div>
          </div>
        )}

        <details
          className={`settings-panel${compactMorning ? ' settings-panel--quiet' : ''}${settingsOpenProp !== undefined ? ' settings-panel--from-gear' : ''}`}
          open={settingsOpen}
          onToggle={(e) => {
            // Nested <details> bubble toggle — only this panel.
            if (e.target !== e.currentTarget) return
            setSettingsOpen(e.currentTarget.open)
          }}
          onClick={(e) => {
            if (
              settingsOpenProp !== undefined &&
              e.target === e.currentTarget
            ) {
              setSettingsOpen(false)
            }
          }}
        >
          <summary className="settings-panel-summary">
            {t('settings.summary')}
          </summary>

          <div
            className={
              settingsOpenProp !== undefined ? 'settings-panel-sheet' : undefined
            }
          >
            {settingsOpenProp !== undefined && (
              <div className="drawer-panel-head settings-panel-head">
                <h2>{t('settings.summary')}</h2>
                <button
                  type="button"
                  className="ghost sm"
                  onClick={() => setSettingsOpen(false)}
                >
                  {t('common.ok')}
                </button>
              </div>
            )}

          <label className="intro-hide-check settings-check">
            <input
              type="checkbox"
              checked={shortMorning}
              onChange={(e) => persistShortMorning(e.target.checked)}
            />
            {t('settings.shortMorning')}
          </label>
          <p className="block-hint">{t('settings.shortMorningHint')}</p>

          <label className="intro-hide-check settings-check">
            <input
              type="checkbox"
              checked={drawerEnabled}
              onChange={(e) => setDrawerEnabledPref(e.target.checked)}
            />
            {t('settings.drawerEnabled')}
          </label>
          <p className="block-hint">{t('settings.drawerEnabledHint')}</p>
          {drawerEnabled && (
            <>
              <p>
                <Link to="/schublade" className="secondary sm">
                  {t('productNav.openSchublade')}
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
                  onChange={(e) => setAiChopOptInPref(e.target.checked)}
                />
                {t('settings.drawerAiChop')}
              </label>
              <p className="block-hint">{t('settings.drawerAiChopHint')}</p>
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
            </>
          )}

          <details className="settings-section">
            <summary>
              {t('settings.capacity.summary')}
              <span className="settings-section-meta">
                {t('settings.capacity.meta')}
              </span>
            </summary>
            <p className="block-hint settings-intro">
              {t('settings.capacity.intro')}
            </p>
            <div className="cap-controls">
              {sizes.map((size) => (
                <label key={size} className="cap-step">
                  <span>{sizeLabel(size)}</span>
                  <div className="stepper">
                    <button
                      type="button"
                      className="ghost"
                      aria-label={t('common.sizeLess', {
                        size: sizeLabel(size),
                      })}
                      disabled={
                        (day.baselineCapacity ?? day.capacity)[size] <=
                        used[size]
                      }
                      onClick={() =>
                        changeCapacity(
                          size,
                          (day.baselineCapacity ?? day.capacity)[size] - 1,
                        )
                      }
                    >
                      −
                    </button>
                    <strong>
                      {(day.baselineCapacity ?? day.capacity)[size]}
                    </strong>
                    <button
                      type="button"
                      className="ghost"
                      aria-label={t('common.sizeMore', {
                        size: sizeLabel(size),
                      })}
                      disabled={
                        (day.baselineCapacity ?? day.capacity)[size] >=
                          HARD_CAPS[size] ||
                        setCapacitySize(
                          day.baselineCapacity ?? day.capacity,
                          size,
                          (day.baselineCapacity ?? day.capacity)[size] + 1,
                          used,
                        )[size] ===
                          (day.baselineCapacity ?? day.capacity)[size]
                      }
                      onClick={() =>
                        changeCapacity(
                          size,
                          (day.baselineCapacity ?? day.capacity)[size] + 1,
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </label>
              ))}
            </div>

            <p className="cap-points">
              {t('settings.capacity.dayBudget', {
                used: maxPts,
                max: MAX_DAY_POINTS,
              })}
            </p>

            <label className="cap-step">
              <span>{t('settings.capacity.lifeMaxLabel')}</span>
              <div className="stepper">
                <button
                  type="button"
                  className="ghost"
                  aria-label={t('settings.capacity.lifeMaxLess')}
                  disabled={
                    (day.baselineLifeMax ?? day.lifeMax) <=
                    Math.max(1, life.length)
                  }
                  onClick={() =>
                    changeLifeMax((day.baselineLifeMax ?? day.lifeMax) - 1)
                  }
                >
                  −
                </button>
                <strong>{day.baselineLifeMax ?? day.lifeMax}</strong>
                <button
                  type="button"
                  className="ghost"
                  aria-label={t('settings.capacity.lifeMaxMore')}
                  disabled={
                    (day.baselineLifeMax ?? day.lifeMax) >= LIFE_MAX_HARD
                  }
                  onClick={() =>
                    changeLifeMax((day.baselineLifeMax ?? day.lifeMax) + 1)
                  }
                >
                  +
                </button>
              </div>
            </label>
            <p className="block-hint" style={{ marginTop: '0.35rem' }}>
              {t('settings.capacity.lifeMaxHint', { max: LIFE_MAX_HARD })}
            </p>
          </details>

          <details className="settings-section">
            <summary>
              {t('settings.reminders.summary')}
              <span className="settings-section-meta">
                {t('settings.reminders.meta')}
              </span>
            </summary>
            <div className="tone-row">
              <label htmlFor="tone">{t('settings.reminders.buddyTone')}</label>
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
                <option value="warm">{t('settings.reminders.toneWarm')}</option>
                <option value="kurz">{t('settings.reminders.toneKurz')}</option>
                <option value="klar">{t('settings.reminders.toneKlar')}</option>
              </select>
            </div>

            <div className="settings-row">
              <label htmlFor="checkin">
                {t('settings.reminders.checkInEvery', {
                  n: day.checkInEveryMin,
                })}
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
                  disabled={
                    perm === 'denied' ||
                    perm === 'unsupported' ||
                    !notificationsReadyToEnable()
                  }
                  onChange={(e) => {
                    if (e.target.checked) void enableNotifications()
                    else
                      setDay((d) => ({ ...d, notificationsEnabled: false }))
                  }}
                />
                {t('settings.reminders.enableNotifications')}
              </label>
              {isLikelyIos() && !isStandaloneApp() && (
                <p className="block-hint">
                  {t('settings.reminders.iosInstallFirst')}
                </p>
              )}
              {!isLikelyIos() && !isStandaloneApp() && (
                <p className="block-hint">
                  {t('settings.reminders.saveFirstHint')}
                </p>
              )}
              {isStandaloneApp() && perm === 'granted' && (
                <p className="block-hint">
                  {t('settings.reminders.bestEffortHint')}
                </p>
              )}
              {perm === 'denied' && (
                <p className="block-hint">
                  {t('settings.reminders.blockedHint')}
                </p>
              )}
              {notifMsg && <p className="export-msg">{notifMsg}</p>}

              <div className="freeze-settings">
                <p className="export-label">
                  {t('settings.reminders.softFreeze.label')}
                </p>
                <label className="intro-hide-check">
                  <input
                    type="checkbox"
                    checked={day.softFreezeEnabled}
                    onChange={(e) =>
                      setDay((d) => ({
                        ...d,
                        softFreezeEnabled: e.target.checked,
                      }))
                    }
                  />
                  {t('settings.reminders.softFreeze.pauseOnLeave')}
                </label>
                <p className="block-hint">
                  {t('settings.reminders.softFreeze.hint')}
                </p>

                <label
                  className="tone-row freeze-nudge-row"
                  htmlFor="away-nudge"
                >
                  {t('settings.reminders.softFreeze.awayNudges')}
                  <select
                    id="away-nudge"
                    value={day.awayNudgeMode}
                    disabled={!day.softFreezeEnabled}
                    onChange={(e) =>
                      setDay((d) => ({
                        ...d,
                        awayNudgeMode: e.target.value as
                          | 'off'
                          | 'once'
                          | 'repeat',
                      }))
                    }
                  >
                    <option value="off">
                      {t('settings.reminders.softFreeze.nudgeOff')}
                    </option>
                    <option value="once">
                      {t('settings.reminders.softFreeze.nudgeOnce')}
                    </option>
                    <option value="repeat">
                      {t('settings.reminders.softFreeze.nudgeRepeat')}
                    </option>
                  </select>
                </label>

                {day.softFreezeEnabled && day.awayNudgeMode === 'repeat' && (
                  <>
                    <div className="settings-row">
                      <label htmlFor="away-every">
                        {t('settings.reminders.softFreeze.everyMin', {
                          n: day.awayNudgeEveryMin,
                        })}
                      </label>
                      <input
                        id="away-every"
                        type="range"
                        min={2}
                        max={10}
                        step={1}
                        value={day.awayNudgeEveryMin}
                        onChange={(e) =>
                          setDay((d) => ({
                            ...d,
                            awayNudgeEveryMin: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="settings-row">
                      <label htmlFor="away-max">
                        {t('settings.reminders.softFreeze.maxNudges', {
                          n: day.awayNudgeMax,
                        })}
                      </label>
                      <input
                        id="away-max"
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={day.awayNudgeMax}
                        onChange={(e) =>
                          setDay((d) => ({
                            ...d,
                            awayNudgeMax: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </details>

          <details className="settings-section">
            <summary>
              {t('settings.sparks.summary')}
              <span className="settings-section-meta">
                {t('settings.sparks.meta', { days: SPARK_RETENTION_DAYS })}
              </span>
            </summary>
            <div className="sparks-mail-settings">
              <label htmlFor="sparks-mail">
                {t('settings.sparks.mailLabel')}
              </label>
              <input
                id="sparks-mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t('settings.sparks.mailPlaceholder')}
                value={day.sparksMailEmail ?? ''}
                onChange={(e) =>
                  setDay((d) => ({
                    ...d,
                    sparksMailEmail: normalizeSparksEmail(e.target.value),
                  }))
                }
                maxLength={120}
              />
              <p className="block-hint">
                {day.sparksMailEmail && !isValidSparksEmail(day.sparksMailEmail)
                  ? t('settings.sparks.mailInvalid')
                  : day.sparksMailEmail
                    ? t('settings.sparks.mailSet')
                    : t('settings.sparks.mailEmpty')}
              </p>
            </div>
          </details>

          <details className="settings-section">
            <summary>
              {t('settings.help.summary')}
              <span className="settings-section-meta">
                {t('settings.help.meta')}
              </span>
            </summary>
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
              {t('settings.help.introButton')}
            </label>

            {onShowIntro && (
              <button
                type="button"
                className="secondary lg intro-again"
                onClick={onShowIntro}
              >
                {t('settings.help.showIntroAgain')}
              </button>
            )}

            <div className="handbook-settings">
              <button
                type="button"
                className="secondary lg"
                onClick={() => setHandbookOpen(true)}
              >
                {t('settings.help.openHandbook')}
              </button>
            </div>
          </details>

          <details className="settings-section">
            <summary>
              {t('language.summary')}
              <span className="settings-section-meta">{t('language.meta')}</span>
            </summary>
            <label className="tone-row" htmlFor="app-locale">
              {t('language.label')}
              <select
                id="app-locale"
                value={locale}
                onChange={async (e) => {
                  const loc = normalizeLocale(e.target.value)
                  setLocale(loc)
                  savePrefs({ ...loadPrefs(), locale: loc })
                  await setAppLocale(loc)
                }}
              >
                {APP_LOCALES.map((loc) => (
                  <option key={loc} value={loc}>
                    {LOCALE_LABELS[loc]}
                  </option>
                ))}
              </select>
            </label>
            <p className="block-hint">{t('language.hint')}</p>
          </details>

          <details
            className="settings-section"
            open={syncSectionOpen || Boolean(syncEmail) || forceOpenSync}
            onToggle={(e) => {
              if (e.target !== e.currentTarget) return
              setSyncSectionOpen(e.currentTarget.open)
            }}
          >
            <summary>
              {t('settings.sync.summary')}
              <span className="settings-section-meta">
                {syncEmail
                  ? t('settings.sync.metaConnected')
                  : t('settings.sync.metaLocalOnly')}
              </span>
            </summary>
            {settingsOpen && (
              <Suspense fallback={null}>
                <SyncSettings
                  email={syncEmail}
                  notice={syncNotice}
                  conflict={syncConflict}
                  onKeepLocal={onSyncKeepLocal}
                  onUseCloud={onSyncUseCloud}
                  onSignedOut={onSyncSignedOut}
                  onNotice={onSyncNotice}
                  onVaultReady={onSyncVaultReady}
                  embedded
                />
              </Suspense>
            )}
          </details>
            </div>
          </details>

        {syncEmail ? (
          <p className="sync-status-bar" role="status">
            {t('settings.syncStatusBar', { email: syncEmail })}
          </p>
        ) : null}
      </div>

      {handbookOpen && (
        <Suspense fallback={null}>
          <Handbook onClose={() => setHandbookOpen(false)} />
        </Suspense>
      )}
      {drawerEnabled && drawerMode && (
        <Suspense fallback={null}>
          <DrawerPanel
            open
            mode={drawerMode}
            onClose={() => setDrawerMode(null)}
            drawer={drawer}
            setDrawer={updateDrawer}
            day={day}
            setDay={setDay}
            aiChopOptIn={aiChopOptIn}
            readyCap={readyCap}
          />
        </Suspense>
      )}
    </section>
  )
}
