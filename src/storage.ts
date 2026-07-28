import type { CapacitySettings, DayState, Spark, Task } from './types'
import { CHECK_IN_DEFAULT, LIFE_DEFAULT, clampLifeMax } from './types'
import { DEFAULT_CAPACITY } from './capacity'
import type { DayMood } from './mood'

const DAY_KEY = 'fokus-buddy-day'
const PREFS_KEY = 'anker-prefs'
const CARRY_KEY = 'anker-carry'
const SPARKS_KEY = 'anker-sparks'

/** Geistesblitze: max. so viele Tage, dann weg (entlasten, nicht archivieren) */
export const SPARK_RETENTION_DAYS = 7

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

function purgeSparks(sparks: Spark[]): Spark[] {
  const cutoff = Date.now() - SPARK_RETENTION_DAYS * 24 * 60 * 60 * 1000
  return sparks.filter((s) => {
    const t = Date.parse(s.createdAt)
    if (Number.isNaN(t)) return false
    return t >= cutoff
  })
}

function normalizeSpark(s: Spark): Spark {
  const mode = (s as { mode?: string }).mode === 'dictate' ? 'audio' : s.mode
  return { ...s, mode }
}

export function loadSparksVault(): Spark[] {
  try {
    const raw = localStorage.getItem(SPARKS_KEY)
    if (!raw) return []
    const list = (JSON.parse(raw) as Spark[]).map(normalizeSpark)
    const kept = purgeSparks(list)
    if (kept.length !== list.length) {
      localStorage.setItem(SPARKS_KEY, JSON.stringify(kept))
    }
    return kept
  } catch {
    return []
  }
}

export function saveSparksVault(sparks: Spark[]): void {
  const kept = purgeSparks(sparks.map(normalizeSpark))
  if (kept.length === 0) {
    localStorage.removeItem(SPARKS_KEY)
    return
  }
  localStorage.setItem(SPARKS_KEY, JSON.stringify(kept))
}

function mergeSparks(a: Spark[], b: Spark[]): Spark[] {
  const map = new Map<string, Spark>()
  for (const s of [...a, ...b]) map.set(s.id, normalizeSpark(s))
  return purgeSparks([...map.values()]).sort(
    (x, y) => Date.parse(x.createdAt) - Date.parse(y.createdAt),
  )
}

function normalizeDay(data: DayState, prefs: Prefs, sparks: Spark[]): DayState {
  const baselineCapacity = data.baselineCapacity ?? data.capacity ?? prefs.capacity
  const baselineLifeMax = data.baselineLifeMax ?? data.lifeMax ?? prefs.lifeMax
  return {
    ...data,
    mood: data.mood ?? null,
    baselineCapacity: { ...baselineCapacity },
    baselineLifeMax,
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
    sparks,
  }
}

function unfinishedToCarry(tasks: Task[]): CarryItem[] {
  return tasks
    .filter(
      (t) =>
        t.status === 'planned' || t.status === 'active' || t.status === 'skipped',
    )
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
    const prefs = loadPrefs()
    let vault = loadSparksVault()

    if (!raw) {
      return null
    }

    const data = JSON.parse(raw) as DayState

    if (data.date !== todayKey()) {
      const carry = unfinishedToCarry(data.tasks ?? [])
      if (carry.length > 0) saveCarryOver(carry)
      vault = mergeSparks(vault, data.sparks ?? [])
      saveSparksVault(vault)
      localStorage.removeItem(DAY_KEY)
      return null
    }

    vault = mergeSparks(vault, data.sparks ?? [])
    saveSparksVault(vault)
    return normalizeDay(data, prefs, vault)
  } catch {
    return null
  }
}

export function saveDay(state: DayState): void {
  // Stimmung nur im Tagesobjekt (verschwindet mit dem Tag) — nie in Prefs
  const toStore: DayState = {
    ...state,
    sparks: state.sparks,
  }
  localStorage.setItem(DAY_KEY, JSON.stringify(toStore))
  saveSparksVault(state.sparks)
  savePrefs({
    capacity: {
      ...(state.baselineCapacity ?? state.capacity),
    },
    checkInEveryMin: state.checkInEveryMin,
    buddyTone: state.buddyTone,
    lifeMax: state.baselineLifeMax ?? state.lifeMax,
    introButtonOnSurface: state.introButtonOnSurface,
    notificationsEnabled: state.notificationsEnabled,
  })
}

export function clearDay(): void {
  // Geistesblitze bleiben in der Vault — Tag-Daten weg
  localStorage.removeItem(DAY_KEY)
}

export function emptyDay(): DayState {
  const prefs = loadPrefs()
  return {
    date: todayKey(),
    tasks: [],
    sparks: loadSparksVault(),
    started: false,
    checkInEveryMin: prefs.checkInEveryMin,
    buddyTone: prefs.buddyTone,
    capacity: { ...prefs.capacity },
    baselineCapacity: { ...prefs.capacity },
    lifeMax: prefs.lifeMax,
    baselineLifeMax: prefs.lifeMax,
    introButtonOnSurface: prefs.introButtonOnSurface,
    notificationsEnabled: prefs.notificationsEnabled,
    mood: null,
  }
}

export type { DayMood }
