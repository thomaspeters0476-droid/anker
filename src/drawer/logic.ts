import type { Task, TaskSize } from '../types'
import { SIZE_MINUTES } from '../capacity'
import { minutesForSize, type DayMood } from '../mood'
import {
  DRAWER_DEADLINE_EMERGENCY_DAYS,
  DRAWER_DEADLINE_RADAR_DAYS,
  DRAWER_READY_CAP_DEFAULT,
  DRAWER_READY_CAP_HYSTERESIS,
  type DeadlinePhase,
  type DrawerItem,
  type DrawerLevel,
  type DrawerState,
} from './types'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() {
  return new Date().toISOString()
}

export function emptyDrawer(): DrawerState {
  return { items: [] }
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Sichtbar in der Schublade (Aufschub noch nicht fällig) */
export function isVisibleInDrawer(item: DrawerItem, today = todayKey()): boolean {
  if (item.level === 'defer' && item.snoozeUntil && item.snoozeUntil > today) {
    return false
  }
  return true
}

/** Tage bis Frist (negativ = überfällig); null ohne gültige Frist */
export function daysUntilDeadline(
  deadline: string | null | undefined,
  today = todayKey(),
): number | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null
  const d = Date.parse(`${deadline}T12:00:00`)
  const t = Date.parse(`${today}T12:00:00`)
  if (Number.isNaN(d) || Number.isNaN(t)) return null
  return Math.round((d - t) / 86_400_000)
}

export function deadlinePhase(
  item: DrawerItem,
  today = todayKey(),
): DeadlinePhase {
  const days = daysUntilDeadline(item.deadline, today)
  if (days === null) return 'none'
  if (days <= DRAWER_DEADLINE_EMERGENCY_DAYS) return 'emergency'
  if (days <= DRAWER_DEADLINE_RADAR_DAYS) return 'radar'
  return 'sleep'
}

/** Demnächst / Notfall — auch eingefroren/Aufschub, damit Fristen nicht verschwinden */
export function itemsWithDeadlinePhase(
  items: DrawerItem[],
  phase: 'radar' | 'emergency',
  today = todayKey(),
): DrawerItem[] {
  return items
    .filter((i) => deadlinePhase(i, today) === phase)
    .sort((a, b) => {
      const da = daysUntilDeadline(a.deadline, today) ?? 99
      const db = daysUntilDeadline(b.deadline, today) ?? 99
      return da - db
    })
}

export function setItemDeadline(
  state: DrawerState,
  id: string,
  deadline: string | null,
): DrawerState {
  const t = nowIso()
  const value =
    deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null
  return {
    items: state.items.map((i) =>
      i.id === id
        ? { ...i, deadline: value, updatedAt: t, touchedAt: t }
        : i,
    ),
  }
}

export function countReady(items: DrawerItem[]): number {
  return items.filter(
    (i) =>
      i.level === 'ready' &&
      !i.isChunk &&
      isVisibleInDrawer(i),
  ).length
}

export function canChop(
  items: DrawerItem[],
  cap = DRAWER_READY_CAP_DEFAULT,
): boolean {
  return countReady(items) < cap
}

export function canChopAgain(
  items: DrawerItem[],
  cap = DRAWER_READY_CAP_DEFAULT,
): boolean {
  return countReady(items) <= Math.max(0, cap - DRAWER_READY_CAP_HYSTERESIS)
}

export function addInboxItem(state: DrawerState, title: string): DrawerState {
  const trimmed = title.trim()
  if (!trimmed) return state
  const t = nowIso()
  const item: DrawerItem = {
    id: uid(),
    title: trimmed,
    level: 'inbox',
    isChunk: true,
    createdAt: t,
    updatedAt: t,
    touchedAt: t,
  }
  return { items: [item, ...state.items] }
}

export function moveItem(
  state: DrawerState,
  id: string,
  level: DrawerLevel,
  patch?: Partial<Pick<DrawerItem, 'snoozeUntil' | 'waitingOn' | 'deadline'>>,
): DrawerState {
  const t = nowIso()
  return {
    items: state.items.map((i) =>
      i.id === id
        ? {
            ...i,
            level,
            ...patch,
            updatedAt: t,
            touchedAt: t,
          }
        : i,
    ),
  }
}

export function touchItem(state: DrawerState, id: string): DrawerState {
  const t = nowIso()
  return {
    items: state.items.map((i) =>
      i.id === id ? { ...i, touchedAt: t, updatedAt: t } : i,
    ),
  }
}

export function removeItem(state: DrawerState, id: string): DrawerState {
  const victim = state.items.find((i) => i.id === id)
  if (!victim) return state
  // Einzelnes Ketten-Häppchen: nur dieses; Parent bleibt
  // Brocken mit Kindern: Kinder mit entfernen nur wenn Parent weg
  if (victim.isChunk || !victim.parentId) {
    const childIds = new Set(
      state.items.filter((i) => i.parentId === id).map((i) => i.id),
    )
    return {
      items: state.items.filter((i) => i.id !== id && !childIds.has(i.id)),
    }
  }
  return { items: state.items.filter((i) => i.id !== id) }
}

/** Manuell in Häppchen schneiden — Rest als ready, Parent bleibt als Chunk in inbox/ready */
export function chopIntoBites(
  state: DrawerState,
  parentId: string,
  biteTitles: string[],
): DrawerState {
  const parent = state.items.find((i) => i.id === parentId)
  if (!parent) return state
  const titles = biteTitles.map((t) => t.trim()).filter(Boolean)
  if (titles.length === 0) return state

  const t = nowIso()
  const bites: DrawerItem[] = titles.map((title) => ({
    id: uid(),
    title,
    level: 'ready' as const,
    parentId,
    isChunk: false,
    energy: 'normal' as const,
    deadline: parent.deadline ?? null,
    createdAt: t,
    updatedAt: t,
    touchedAt: t,
  }))

  // Parent als Chunk behalten, Ebene inbox oder frozen je nach vorher
  const nextParent: DrawerItem = {
    ...parent,
    isChunk: true,
    updatedAt: t,
    touchedAt: t,
  }

  return {
    items: [
      ...bites,
      ...state.items.map((i) => (i.id === parentId ? nextParent : i)),
    ],
  }
}

/** Nächstes holbares Häppchen einer Kette (oder Einzel-ready); Notfall-Fristen zuerst */
export function nextPullable(
  items: DrawerItem[],
  today = todayKey(),
): DrawerItem[] {
  const ready = items.filter(
    (i) => i.level === 'ready' && !i.isChunk && isVisibleInDrawer(i, today),
  )
  // Ohne Parent: frei. Mit Parent: nur wenn kein älteres Geschwister noch ready/planned in drawer
  const pullable = ready.filter((i) => {
    if (!i.parentId) return true
    const siblings = ready
      .filter((s) => s.parentId === i.parentId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    return siblings[0]?.id === i.id
  })
  return pullable.sort((a, b) => {
    const pa = deadlinePhase(a, today)
    const pb = deadlinePhase(b, today)
    const rank = (p: DeadlinePhase) =>
      p === 'emergency' ? 0 : p === 'radar' ? 1 : 2
    const r = rank(pa) - rank(pb)
    if (r !== 0) return r
    const da = daysUntilDeadline(a.deadline, today) ?? 99
    const db = daysUntilDeadline(b.deadline, today) ?? 99
    return da - db
  })
}

export function pullToTask(
  item: DrawerItem,
  mood: DayMood | null | undefined,
  size: TaskSize = 'small',
): Task {
  return {
    id: uid(),
    title: item.title,
    kind: 'work',
    status: 'planned',
    size,
    minutes: minutesForSize(size, mood) || SIZE_MINUTES[size],
  }
}

export function itemsByLevel(
  state: DrawerState,
  level: DrawerLevel,
  today = todayKey(),
): DrawerItem[] {
  return state.items
    .filter((i) => i.level === level && isVisibleInDrawer(i, today))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}
