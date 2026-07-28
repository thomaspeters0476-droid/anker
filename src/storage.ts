import type { CapacitySettings, DayState, Spark, Task } from './types'
import {
  CHECK_IN_DEFAULT,
  LIFE_DEFAULT,
  clampLifeMax,
  normalizeTitleList,
} from './types'
import { DEFAULT_CAPACITY } from './capacity'
import { SOFT_FREEZE_DEFAULTS, type AwayNudgeMode } from './softFreeze'

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
  softFreezeEnabled: boolean
  awayNudgeMode: AwayNudgeMode
  awayNudgeEveryMin: number
  awayNudgeMax: number
  hiddenLifeTemplates: string[]
  customLifeAnchors: string[]
  sparksMailEmail: string
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
    ...SOFT_FREEZE_DEFAULTS,
    hiddenLifeTemplates: [],
    customLifeAnchors: [],
    sparksMailEmail: '',
  }
}

function clampAwayEvery(n: number): number {
  return Math.max(2, Math.min(15, Math.round(n)))
}

function clampAwayMax(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)))
}

function parseAwayMode(v: unknown): AwayNudgeMode {
  if (v === 'off' || v === 'once' || v === 'repeat') return v
  return SOFT_FREEZE_DEFAULTS.awayNudgeMode
}

function normalizeSparksMailEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().slice(0, 120)
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
      softFreezeEnabled:
        data.softFreezeEnabled ?? SOFT_FREEZE_DEFAULTS.softFreezeEnabled,
      awayNudgeMode: parseAwayMode(data.awayNudgeMode),
      awayNudgeEveryMin: clampAwayEvery(
        data.awayNudgeEveryMin ?? SOFT_FREEZE_DEFAULTS.awayNudgeEveryMin,
      ),
      awayNudgeMax: clampAwayMax(
        data.awayNudgeMax ?? SOFT_FREEZE_DEFAULTS.awayNudgeMax,
      ),
      hiddenLifeTemplates: normalizeTitleList(data.hiddenLifeTemplates),
      customLifeAnchors: normalizeTitleList(data.customLifeAnchors),
      sparksMailEmail: normalizeSparksMailEmail(data.sparksMailEmail),
    }
  } catch {
    return defaultPrefs()
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

/** Nur ungültige Einträge entfernen — Alters-Löschung über reconcileExpiredSparks */
function sanitizeSparks(sparks: Spark[]): Spark[] {
  return sparks.map(normalizeSpark).filter((s) => {
    const t = Date.parse(s.createdAt)
    return !Number.isNaN(t)
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
    return sanitizeSparks(JSON.parse(raw) as Spark[])
  } catch {
    return []
  }
}

export function saveSparksVault(sparks: Spark[]): void {
  const kept = sanitizeSparks(sparks)
  if (kept.length === 0) {
    localStorage.removeItem(SPARKS_KEY)
    return
  }
  localStorage.setItem(SPARKS_KEY, JSON.stringify(kept))
}

function mergeSparks(a: Spark[], b: Spark[]): Spark[] {
  const map = new Map<string, Spark>()
  for (const s of [...a, ...b]) map.set(s.id, normalizeSpark(s))
  return sanitizeSparks([...map.values()]).sort(
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
    softFreezeEnabled:
      data.softFreezeEnabled ?? prefs.softFreezeEnabled,
    awayNudgeMode: data.awayNudgeMode ?? prefs.awayNudgeMode,
    awayNudgeEveryMin: data.awayNudgeEveryMin ?? prefs.awayNudgeEveryMin,
    awayNudgeMax: data.awayNudgeMax ?? prefs.awayNudgeMax,
    hiddenLifeTemplates: normalizeTitleList(
      data.hiddenLifeTemplates ?? prefs.hiddenLifeTemplates,
    ),
    customLifeAnchors: normalizeTitleList(
      data.customLifeAnchors ?? prefs.customLifeAnchors,
    ),
    sparksMailEmail: normalizeSparksMailEmail(
      data.sparksMailEmail ?? prefs.sparksMailEmail,
    ),
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
        t.status === 'planned' ||
        t.status === 'active' ||
        t.status === 'skipped',
    )
    .map((t) => ({
      title: t.title,
      kind: t.kind,
      size: t.size,
      minutes: t.minutes,
    }))
}

/** Tag abschließen: Offenes merken, Geistesblitze sichern, Tag löschen */
export function rollDayForward(day: DayState): void {
  const carry = unfinishedToCarry(day.tasks ?? [])
  if (carry.length > 0) saveCarryOver(carry)
  const vault = mergeSparks(loadSparksVault(), day.sparks ?? [])
  saveSparksVault(vault)
  localStorage.removeItem(DAY_KEY)
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

    if (!raw) return null

    const data = JSON.parse(raw) as DayState

    if (data.date !== todayKey()) {
      rollDayForward(data)
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
  localStorage.setItem(DAY_KEY, JSON.stringify(state))
  saveSparksVault(state.sparks)
  savePrefs({
    capacity: { ...(state.baselineCapacity ?? state.capacity) },
    checkInEveryMin: state.checkInEveryMin,
    buddyTone: state.buddyTone,
    lifeMax: state.baselineLifeMax ?? state.lifeMax,
    introButtonOnSurface: state.introButtonOnSurface,
    notificationsEnabled: state.notificationsEnabled,
    softFreezeEnabled: state.softFreezeEnabled,
    awayNudgeMode: state.awayNudgeMode,
    awayNudgeEveryMin: state.awayNudgeEveryMin,
    awayNudgeMax: state.awayNudgeMax,
    hiddenLifeTemplates: normalizeTitleList(state.hiddenLifeTemplates),
    customLifeAnchors: normalizeTitleList(state.customLifeAnchors),
    sparksMailEmail: normalizeSparksMailEmail(state.sparksMailEmail),
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
    softFreezeEnabled: prefs.softFreezeEnabled,
    awayNudgeMode: prefs.awayNudgeMode,
    awayNudgeEveryMin: prefs.awayNudgeEveryMin,
    awayNudgeMax: prefs.awayNudgeMax,
    hiddenLifeTemplates: [...prefs.hiddenLifeTemplates],
    customLifeAnchors: [...prefs.customLifeAnchors],
    sparksMailEmail: prefs.sparksMailEmail,
    mood: null,
  }
}
