import type { CapacitySettings, DayState, Spark, Task } from './types'
import {
  CHECK_IN_DEFAULT,
  LIFE_DEFAULT,
  clampLifeMax,
  normalizeTitleList,
} from './types'
import { DEFAULT_CAPACITY } from './capacity'
import type { Capacity } from './capacity'
import { capacityForMood } from './mood'
import { SOFT_FREEZE_DEFAULTS, type AwayNudgeMode } from './softFreeze'
import { normalizeLocale, type AppLocale } from './i18n/locales'
import { clampReadyCap, emptyDrawer } from './drawer/logic'
import { DRAWER_READY_CAP_DEFAULT, type DrawerState } from './drawer/types'

const DAY_KEY = 'fokus-buddy-day'
const PREFS_KEY = 'anker-prefs'
const CARRY_KEY = 'anker-carry'
const SPARKS_KEY = 'anker-sparks'
const DRAWER_KEY = 'anker-drawer'
const SYNC_META_KEY = 'anker-sync-meta'

let suppressSyncTouch = false

function touchLocalUpdatedAt(): void {
  if (suppressSyncTouch) return
  try {
    localStorage.setItem(
      SYNC_META_KEY,
      JSON.stringify({ updatedAt: new Date().toISOString() }),
    )
  } catch {
    /* ignore */
  }
}

export function getLocalUpdatedAt(): string {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) return ''
    const data = JSON.parse(raw) as { updatedAt?: string }
    return typeof data.updatedAt === 'string' ? data.updatedAt : ''
  } catch {
    return ''
  }
}

export function setLocalUpdatedAt(iso: string): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({ updatedAt: iso }))
  } catch {
    /* ignore */
  }
}

export type SyncSnapshot = {
  updatedAt: string
  day: DayState | null
  prefs: Prefs
  carry: CarryItem[]
  sparks: Spark[]
  drawer: DrawerState
}

function readDayRaw(): DayState | null {
  try {
    const raw = localStorage.getItem(DAY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DayState
  } catch {
    return null
  }
}

export function loadDrawer(): DrawerState {
  try {
    const raw = localStorage.getItem(DRAWER_KEY)
    if (!raw) return emptyDrawer()
    const data = JSON.parse(raw) as Partial<DrawerState>
    return {
      items: Array.isArray(data.items) ? data.items : [],
      readyCapLatched: Boolean(data.readyCapLatched),
    }
  } catch {
    return emptyDrawer()
  }
}

export function saveDrawer(state: DrawerState): void {
  localStorage.setItem(DRAWER_KEY, JSON.stringify(state))
  touchLocalUpdatedAt()
}

export function getSyncSnapshot(): SyncSnapshot {
  return {
    updatedAt: getLocalUpdatedAt() || new Date(0).toISOString(),
    day: readDayRaw(),
    prefs: loadPrefs(),
    carry: loadCarryOver(),
    sparks: loadSparksVault(),
    drawer: loadDrawer(),
  }
}

export function applySyncSnapshot(snap: SyncSnapshot): DayState {
  suppressSyncTouch = true
  try {
    if (snap.day) {
      localStorage.setItem(DAY_KEY, JSON.stringify(snap.day))
    } else {
      localStorage.removeItem(DAY_KEY)
    }
    savePrefs(snap.prefs)
    saveCarryOver(snap.carry)
    saveSparksVault(snap.sparks)
    if (snap.drawer) {
      localStorage.setItem(DRAWER_KEY, JSON.stringify(snap.drawer))
    }
    setLocalUpdatedAt(snap.updatedAt)
  } finally {
    suppressSyncTouch = false
  }
  return loadDay() ?? emptyDay()
}

export function hasMeaningfulLocalData(): boolean {
  const day = readDayRaw()
  if (day && ((day.tasks?.length ?? 0) > 0 || day.started)) return true
  if (loadCarryOver().length > 0) return true
  if (loadSparksVault().length > 0) return true
  if (loadDrawer().items.length > 0) return true
  const prefs = loadPrefs()
  if (prefs.sparksMailEmail) return true
  if (prefs.customLifeAnchors.length > 0) return true
  return false
}

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
  locale: AppLocale
  /** Morgens dünner Plan (Stimmung → Carry → Start). false = bisherige volle Ansicht */
  shortMorning: boolean
  /**
   * Schublade im Tagesanker aktiv (Nav + Overlay).
   * Default aus — reine Anker-Nutzer sehen nichts davon.
   * Besuch von /schublade schaltet an (Brücke).
   */
  drawerEnabled: boolean
  /** KI-Vorschläge beim Zerlegen — Opt-in (Titel geht an Azure) */
  drawerAiChopOptIn: boolean
  /** Soft-Cap Bereit-Häppchen (15–40, Default 25) */
  drawerReadyCap: number
  /**
   * Erweiterte Schublade (Aufschub/Eingefroren/Radar-Fläche, Alle-Tab).
   * Default aus — einfache Ansicht: Ablegen, Eingang, Bereit, Holen.
   */
  drawerAdvanced: boolean
}

export type CarryItem = Pick<
  Task,
  'title' | 'kind' | 'size' | 'minutes' | 'parentTitle'
>

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
    locale: 'de',
    shortMorning: true,
    drawerEnabled: false,
    drawerAiChopOptIn: false,
    drawerReadyCap: DRAWER_READY_CAP_DEFAULT,
    drawerAdvanced: false,
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
    const mergedCap = { ...DEFAULT_CAPACITY, ...data.capacity }
    // Alte Shipping-Defaults → aktuelles Standard (K4 M3 G1)
    const capacity =
      data.capacity && isShippedDefaultCap(data.capacity)
        ? { ...DEFAULT_CAPACITY }
        : mergedCap
    return {
      capacity,
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
      locale: data.locale ? normalizeLocale(data.locale) : 'de',
      shortMorning: data.shortMorning ?? true,
      drawerEnabled: data.drawerEnabled ?? false,
      drawerAiChopOptIn: data.drawerAiChopOptIn ?? false,
      drawerReadyCap: clampReadyCap(
        data.drawerReadyCap ?? DRAWER_READY_CAP_DEFAULT,
      ),
      drawerAdvanced: data.drawerAdvanced ?? false,
    }
  } catch {
    return defaultPrefs()
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  touchLocalUpdatedAt()
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
  } else {
    localStorage.setItem(SPARKS_KEY, JSON.stringify(kept))
  }
  touchLocalUpdatedAt()
}

function mergeSparks(a: Spark[], b: Spark[]): Spark[] {
  const map = new Map<string, Spark>()
  for (const s of [...a, ...b]) map.set(s.id, normalizeSpark(s))
  return sanitizeSparks([...map.values()]).sort(
    (x, y) => Date.parse(x.createdAt) - Date.parse(y.createdAt),
  )
}

function isShippedDefaultCap(c: Capacity): boolean {
  // Frühere mitgelieferte Defaults (nicht selbst feinjustiert)
  return (
    (c.large === 0 && c.medium === 2 && c.small === 2) ||
    (c.large === 1 && c.medium === 2 && c.small === 3)
  )
}

function normalizeDay(data: DayState, prefs: Prefs, sparks: Spark[]): DayState {
  let baselineCapacity = {
    ...(data.baselineCapacity ?? data.capacity ?? prefs.capacity),
  }
  if (isShippedDefaultCap(baselineCapacity)) {
    baselineCapacity = { ...prefs.capacity }
  }
  let capacity = { ...(data.capacity ?? prefs.capacity) }
  if (isShippedDefaultCap(capacity)) {
    capacity = data.mood
      ? capacityForMood(baselineCapacity, data.mood)
      : { ...baselineCapacity }
  }
  const baselineLifeMax = data.baselineLifeMax ?? data.lifeMax ?? prefs.lifeMax
  const round = Math.max(1, Math.round(Number(data.round) || 1))
  const priorRoundDone = Array.isArray(data.priorRoundDone)
    ? data.priorRoundDone.map((t) => ({
        ...t,
        size: t.size ?? ('medium' as const),
        minutes: t.minutes ?? 25,
      }))
    : []
  return {
    ...data,
    mood: data.mood ?? null,
    round,
    priorRoundDone,
    baselineCapacity,
    baselineLifeMax,
    capacity,
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

/**
 * Nächste Runde (Schublade): erledigte Runde archivieren, Plan neu —
 * Stimmung/Kapazität für diese Runde erneut wählen. Kein Carry, kein Tageswechsel.
 */
export function startNextRound(day: DayState): DayState {
  const done = (day.tasks ?? []).filter((t) => t.status === 'done')
  const baseline = day.baselineCapacity ?? day.capacity
  const baselineLife = day.baselineLifeMax ?? day.lifeMax
  return {
    ...day,
    round: Math.max(1, day.round ?? 1) + 1,
    priorRoundDone: [...(day.priorRoundDone ?? []), ...done],
    tasks: [],
    started: false,
    mood: null,
    capacity: { ...baseline },
    lifeMax: baselineLife,
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
      ...(t.parentTitle?.trim()
        ? { parentTitle: t.parentTitle.trim() }
        : {}),
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
  } else {
    localStorage.setItem(CARRY_KEY, JSON.stringify(items))
  }
  touchLocalUpdatedAt()
}

export function clearCarryOver(): void {
  localStorage.removeItem(CARRY_KEY)
  touchLocalUpdatedAt()
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

function prefsMirrorFromDay(state: DayState, locale: AppLocale): Prefs {
  const prefs = loadPrefs()
  return {
    ...prefs,
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
    locale,
  }
}

function prefsEqualForDay(a: Prefs, b: Prefs): boolean {
  return (
    a.checkInEveryMin === b.checkInEveryMin &&
    a.buddyTone === b.buddyTone &&
    a.lifeMax === b.lifeMax &&
    a.introButtonOnSurface === b.introButtonOnSurface &&
    a.notificationsEnabled === b.notificationsEnabled &&
    a.softFreezeEnabled === b.softFreezeEnabled &&
    a.awayNudgeMode === b.awayNudgeMode &&
    a.awayNudgeEveryMin === b.awayNudgeEveryMin &&
    a.awayNudgeMax === b.awayNudgeMax &&
    a.sparksMailEmail === b.sparksMailEmail &&
    a.capacity.large === b.capacity.large &&
    a.capacity.medium === b.capacity.medium &&
    a.capacity.small === b.capacity.small &&
    a.hiddenLifeTemplates.join('\0') === b.hiddenLifeTemplates.join('\0') &&
    a.customLifeAnchors.join('\0') === b.customLifeAnchors.join('\0')
  )
}

export function saveDay(state: DayState): void {
  suppressSyncTouch = true
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify(state))
    saveSparksVault(state.sparks)
    const prefs = loadPrefs()
    const next = prefsMirrorFromDay(state, prefs.locale)
    if (!prefsEqualForDay(prefs, next)) savePrefs(next)
  } finally {
    suppressSyncTouch = false
  }
  touchLocalUpdatedAt()
}

export function clearDay(): void {
  localStorage.removeItem(DAY_KEY)
  touchLocalUpdatedAt()
}

export function emptyDay(): DayState {
  const prefs = loadPrefs()
  return {
    date: todayKey(),
    tasks: [],
    sparks: loadSparksVault(),
    started: false,
    round: 1,
    priorRoundDone: [],
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
