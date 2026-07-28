import type { CapacitySettings, DayState } from './types'
import { CHECK_IN_DEFAULT } from './types'
import { DEFAULT_CAPACITY } from './capacity'

const DAY_KEY = 'fokus-buddy-day'
const PREFS_KEY = 'anker-prefs'

export type Prefs = {
  capacity: CapacitySettings
  checkInEveryMin: number
  buddyTone: DayState['buddyTone']
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) {
      return {
        capacity: { ...DEFAULT_CAPACITY },
        checkInEveryMin: CHECK_IN_DEFAULT,
        buddyTone: 'warm',
      }
    }
    const data = JSON.parse(raw) as Partial<Prefs>
    return {
      capacity: { ...DEFAULT_CAPACITY, ...data.capacity },
      checkInEveryMin: data.checkInEveryMin ?? CHECK_IN_DEFAULT,
      buddyTone: data.buddyTone ?? 'warm',
    }
  } catch {
    return {
      capacity: { ...DEFAULT_CAPACITY },
      checkInEveryMin: CHECK_IN_DEFAULT,
      buddyTone: 'warm',
    }
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function loadDay(): DayState | null {
  try {
    const raw = localStorage.getItem(DAY_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as DayState
    if (data.date !== todayKey()) return null
    const prefs = loadPrefs()
    return {
      ...data,
      capacity: data.capacity ?? prefs.capacity,
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
  }
}
