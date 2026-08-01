/** Schublade — siehe docs/SCHUBLADE.md */

export type DrawerLevel = 'inbox' | 'ready' | 'defer' | 'frozen'

export type DrawerEnergy = 'mini' | 'focus' | 'normal'

export type DrawerItem = {
  id: string
  title: string
  level: DrawerLevel
  /** Parent-Brocken-ID, wenn Häppchen einer Kette */
  parentId?: string | null
  /** true = noch unzerschnittenes Vorhaben */
  isChunk?: boolean
  energy?: DrawerEnergy
  /** Sanfter Aufschub — ISO date YYYY-MM-DD, bis dahin aus Ansicht (nicht gelöscht) */
  snoozeUntil?: string | null
  waitingOn?: string | null
  /** Harte Frist YYYY-MM-DD */
  deadline?: string | null
  createdAt: string
  updatedAt: string
  /** Letzte bewusste Interaktion (für „lange liegen“) */
  touchedAt: string
}

export type DrawerState = {
  items: DrawerItem[]
  /** Cap erreicht → Chop erst wieder unter Cap−Hysterese */
  readyCapLatched?: boolean
}

export const DRAWER_READY_CAP_MIN = 15
export const DRAWER_READY_CAP_MAX = 40

/** Soft-Cap Bereit-Häppchen (Default); Nutzer-Einstellung später */
export const DRAWER_READY_CAP_DEFAULT = 25
export const DRAWER_READY_CAP_HYSTERESIS = 5

/** Harte Fristen — siehe SCHUBLADE.md §6 */
export const DRAWER_DEADLINE_RADAR_DAYS = 5
export const DRAWER_DEADLINE_EMERGENCY_DAYS = 1

export type DeadlinePhase = 'none' | 'sleep' | 'radar' | 'emergency'
