import type { CapacitySettings, DayState, Task } from './types'
import { CHECK_IN_DEFAULT, LIFE_DEFAULT, clampLifeMax } from './types'
import { DEFAULT_CAPACITY } from './capacity'

const DAY_KEY = 'fokus-buddy-day'
const PREFS_KEY = 'anker-prefs'
const CARRY_KEY = 'anker-carry'

export type Prefs = {
  capacity: CapacitySettings
  checkInEveryMin: number
  buddyTone: DayState['buddyTone']
  lifeMax: number
  introButtonOnSurface: boolean
  notificationsEnabled: boolean
}

export type CarryItem = Pick<Task, 'title' | 'kind' | 'size' | 'minutes'>

function defaultPrefs(): Prefs {
  return {
    capacity: { ...DEFAULT_CAPACITY },
    checkInEveryMin: CHECK_IN_DEFAULT,
    buddyTone: 'warm',
    lifeMax: LIFE_DEFAULT,
    introButtonOnSurface: true,
    notificationsEnabled: false,
  }
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return defaultPrefs()
    const data = JSON.parse(raw) as Partial<Prefs>
    return {
      capacity: { ...DEFAULT_CAPACITY, ...data.capacity },
      checkInEveryMin: data.checkInEveryMin ?? CHECK_IN_DEFAULT,
      buddyTone: data.buddyTone ?? 'warm',
      lifeMax: clampLifeMax(data.lifeMax ?? LIFE_DEFAULT),
      introButtonOnSurface: data.introButtonOnSurface ?? true,
      notificationsEnabled: data.notificationsEnabled ?? false,
    }
  } catch {
    return defaultPrefs()
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

function normalizeDay(data: DayState, prefs: Prefs): DayState {
  return {
    ...data,
    capacity: data.capacity ?? prefs.capacity,
    lifeMax: clampLifeMax(data.lifeMax ?? prefs.lifeMax),
    introButtonOnSurface:
      data.introButtonOnSurface ?? prefs.introButtonOnSurface,
    notificationsEnabled:
      data.notificationsEnabled ?? prefs.notificationsEnabled,
    tasks: (data.tasks ?? []).map((t) => ({
      ...t,
      size: t.size ?? 'medium',
      minutes: t.minutes ?? 25,
    })),
    sparks: (data.sparks ?? []).map((s) => {
      const mode =
        (s as { mode?: string }).mode === 'dictate' ? 'audio' : s.mode
      return { ...s, mode }
    }),
  }
}

function unfinishedToCarry(tasks: Task[]): CarryItem[] {
  return tasks
    .filter((t) => t.status === 'planned' || t.status === 'active' || t.status === 'skipped')
    .map((t) => ({
      title: t.title,
      kind: t.kind,
      size: t.size,
      minutes: t.minutes,
    }))
}

export function loadCarryOver(): CarryItem[] {
  try {
    const raw = localStorage.getItem(CARRY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CarryItem[]
  } catch {
    return []
  }
}

export function saveCarryOver(items: CarryItem[]): void {
  if (items.length === 0) {
    localStorage.removeItem(CARRY_KEY)
    return
  }
  localStorage.setItem(CARRY_KEY, JSON.stringify(items))
}

export function clearCarryOver(): void {
  localStorage.removeItem(CARRY_KEY)
}

export function loadDay(): DayState | null {
  try {
    const raw = localStorage.getItem(DAY_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as DayState
    const prefs = loadPrefs()

    if (data.date !== todayKey()) {
      const carry = unfinishedToCarry(data.tasks ?? [])
      if (carry.length > 0) saveCarryOver(carry)
      // Alter Tag bleibt nicht als „heute“ — neuer leerer Tag
      localStorage.removeItem(DAY_KEY)
      return null
    }

    return normalizeDay(data, prefs)
  } catch {
    return null
  }
}

export function saveDay(state: DayState): void {
  localStorage.setItem(DAY_KEY, JSON.stringify(state))
  savePrefs({
    capacity: state.capacity,
    checkInEveryMin: state.checkInEveryMin,
    buddyTone: state.buddyTone,
    lifeMax: state.lifeMax,
    introButtonOnSurface: state.introButtonOnSurface,
    notificationsEnabled: state.notificationsEnabled,
  })
}

export function clearDay(): void {
  localStorage.removeItem(DAY_KEY)
}

export function emptyDay(): DayState {
  const prefs = loadPrefs()
  return {
    date: todayKey(),
    tasks: [],
    sparks: [],
    started: false,
    checkInEveryMin: prefs.checkInEveryMin,
    buddyTone: prefs.buddyTone,
    capacity: { ...prefs.capacity },
    lifeMax: prefs.lifeMax,
    introButtonOnSurface: prefs.introButtonOnSurface,
    notificationsEnabled: prefs.notificationsEnabled,
  }
}
