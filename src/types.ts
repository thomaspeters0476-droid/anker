export type TaskKind = 'work' | 'life'
export type TaskStatus = 'planned' | 'active' | 'done' | 'skipped'
export type Screen = 'plan' | 'focus' | 'done'
export type CheckInChoice = 'still' | 'drift' | 'pause'
export type TaskSize = 'small' | 'medium' | 'large'

export interface Task {
  id: string
  title: string
  kind: TaskKind
  status: TaskStatus
  size: TaskSize
  minutes: number
}

export type SparkMode = 'note' | 'draw' | 'audio'

export interface Spark {
  id: string
  createdAt: string
  mode: SparkMode
  text?: string
  drawingDataUrl?: string
  /** data-URL der Sprachnotiz */
  audioDataUrl?: string
  audioMimeType?: string
}

export interface CapacitySettings {
  large: number
  medium: number
  small: number
}

export interface DayState {
  date: string
  tasks: Task[]
  sparks: Spark[]
  started: boolean
  checkInEveryMin: number
  buddyTone: 'warm' | 'kurz' | 'klar'
  capacity: CapacitySettings
  /** Einstellungswert — Stimmung skaliert davon ab (nicht die Stimmung selbst speichern langfristig) */
  baselineCapacity?: CapacitySettings
  /** Max. Alltagsanker heute (1–LIFE_MAX_HARD) */
  lifeMax: number
  baselineLifeMax?: number
  /** Nur heute, transient — keine Historie */
  mood?: 'good' | 'ok' | 'hard' | null
  /** Einführung-Button auf der Plan-Oberfläche */
  introButtonOnSurface: boolean
  /** Browser-Erinnerungen (Check-in / Alltag) */
  notificationsEnabled: boolean
  /** Weicher Freeze: pausieren beim Verlassen */
  softFreezeEnabled: boolean
  /** Mitteilungen beim Wegsein: off | once | repeat */
  awayNudgeMode: 'off' | 'once' | 'repeat'
  awayNudgeEveryMin: number
  awayNudgeMax: number
  /** Standard-Alltagsvorschläge, die nicht mehr angeboten werden */
  hiddenLifeTemplates: string[]
  /** Eigene Alltagsanker — bleiben über Tage erhalten */
  customLifeAnchors: string[]
}

/** Geistesblitzspeicher: erst wenn keine Arbeitsaufgabe mehr offen ist */
export function workTasksSettled(tasks: Task[]): boolean {
  const work = tasks.filter((t) => t.kind === 'work')
  if (work.length === 0) return true
  return work.every((t) => t.status === 'done' || t.status === 'skipped')
}

export const LIFE_MAX_HARD = 5
export const LIFE_DEFAULT = 3
export const CHECK_IN_DEFAULT = 20

export function clampLifeMax(value: number, floor = 0): number {
  return Math.max(Math.max(1, floor), Math.min(LIFE_MAX_HARD, Math.round(value)))
}

export const LIFE_TEMPLATES = [
  'Mit dem Hund gehen',
  'Essen kochen / essen',
  'Rechtzeitig schlafen gehen',
  'Medikamente nehmen',
  'Kurz bewegen / spazieren',
  'Post / Besorgungen',
] as const

const DEFAULT_LIFE_SET = new Set<string>(LIFE_TEMPLATES)

export function normalizeTitleList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** Sichtbare Alltags-Vorschläge: Defaults minus ausgeblendete + eigene */
export function visibleLifeAnchors(
  hiddenDefaults: string[],
  custom: string[],
): string[] {
  const hidden = new Set(normalizeTitleList(hiddenDefaults))
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of LIFE_TEMPLATES) {
    if (hidden.has(t) || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  for (const t of normalizeTitleList(custom)) {
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function isDefaultLifeTemplate(title: string): boolean {
  return DEFAULT_LIFE_SET.has(title.trim())
}
