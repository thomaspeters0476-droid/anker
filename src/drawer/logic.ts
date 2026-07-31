import type { Task, TaskSize } from '../types'
import { SIZE_MINUTES } from '../capacity'
import { minutesForSize, type DayMood } from '../mood'
import {
  DRAWER_READY_CAP_DEFAULT,
  DRAWER_READY_CAP_HYSTERESIS,
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
  const bites: DrawerItem[] = titles.map((title, idx) => ({
    id: uid(),
    title,
    level: 'ready' as const,
    parentId,
    isChunk: false,
    energy: 'normal' as const,
    createdAt: t,
    updatedAt: t,
    touchedAt: t,
    // nur Schritt 1 sofort „bereit“-fühlend — alle ready, aber Reihenfolge via createdAt
    // Spec: oft nur Schritt 1 bereit; wir setzen alle ready, holen nur erstes ohne erledigte Geschwister
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

/** Nächstes holbares Häppchen einer Kette (oder Einzel-ready) */
export function nextPullable(
  items: DrawerItem[],
  today = todayKey(),
): DrawerItem[] {
  const ready = items.filter(
    (i) => i.level === 'ready' && !i.isChunk && isVisibleInDrawer(i, today),
  )
  // Ohne Parent: frei. Mit Parent: nur wenn kein älteres Geschwister noch ready/planned in drawer
  return ready.filter((i) => {
    if (!i.parentId) return true
    const siblings = ready
      .filter((s) => s.parentId === i.parentId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    return siblings[0]?.id === i.id
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
