import type { Task, TaskSize } from '../types'
import { SIZE_MINUTES } from '../capacity'
import { minutesForSize, type DayMood } from '../mood'
import {
  DRAWER_DEADLINE_EMERGENCY_DAYS,
  DRAWER_DEADLINE_RADAR_DAYS,
  DRAWER_READY_CAP_DEFAULT,
  DRAWER_READY_CAP_HYSTERESIS,
  DRAWER_READY_CAP_MAX,
  DRAWER_READY_CAP_MIN,
  DRAWER_STALE_DAYS,
  DRAWER_STALE_QUIET_DAYS,
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
  return { items: [], readyCapLatched: false }
}

export function clampReadyCap(n: number): number {
  return Math.max(
    DRAWER_READY_CAP_MIN,
    Math.min(DRAWER_READY_CAP_MAX, Math.round(n)),
  )
}

/** Cap-Latch aktualisieren (nach Holen/Chop/Verschieben) */
export function refreshReadyCapLatch(
  state: DrawerState,
  cap = DRAWER_READY_CAP_DEFAULT,
): DrawerState {
  const n = countReady(state.items)
  if (n >= cap) return { ...state, readyCapLatched: true }
  if (n <= Math.max(0, cap - DRAWER_READY_CAP_HYSTERESIS)) {
    return { ...state, readyCapLatched: false }
  }
  return state
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
    ...state,
    items: state.items.map((i) =>
      i.id === id
        ? { ...i, deadline: value, updatedAt: t, touchedAt: t }
        : i,
    ),
  }
}

function daysBetweenIso(fromIso: string, today = todayKey()): number | null {
  const day = fromIso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const a = Date.parse(`${day}T12:00:00`)
  const b = Date.parse(`${today}T12:00:00`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/** Lange liegen: 21 Tage ohne Touch, dann Frage; Quiet 14 Tage nach Frage */
export function isStaleAskDue(item: DrawerItem, today = todayKey()): boolean {
  if (item.level === 'frozen') return false
  if (!isVisibleInDrawer(item, today)) return false
  const untouched = daysBetweenIso(item.touchedAt, today)
  if (untouched === null || untouched < DRAWER_STALE_DAYS) return false
  if (item.staleAskedAt) {
    const sinceAsk = daysBetweenIso(item.staleAskedAt, today)
    if (sinceAsk !== null && sinceAsk < DRAWER_STALE_QUIET_DAYS) return false
  }
  return true
}

export function nextStaleAsk(
  items: DrawerItem[],
  today = todayKey(),
): DrawerItem | null {
  const due = items
    .filter((i) => isStaleAskDue(i, today))
    .sort(
      (a, b) => Date.parse(a.touchedAt) - Date.parse(b.touchedAt),
    )
  return due[0] ?? null
}

export function markStaleAsked(state: DrawerState, id: string): DrawerState {
  const t = nowIso()
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === id ? { ...i, staleAskedAt: t, updatedAt: t } : i,
    ),
  }
}

/** Behalten: Touch zurücksetzen (21-Tage-Uhr neu) */
export function keepStaleItem(state: DrawerState, id: string): DrawerState {
  const t = nowIso()
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === id
        ? {
            ...i,
            touchedAt: t,
            updatedAt: t,
            staleAskedAt: null,
          }
        : i,
    ),
  }
}

export function isChainMember(state: DrawerState, item: DrawerItem): boolean {
  if (item.parentId) return true
  return state.items.some((x) => x.parentId === item.id)
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
  stateOrItems: DrawerState | DrawerItem[],
  cap = DRAWER_READY_CAP_DEFAULT,
): boolean {
  const items = Array.isArray(stateOrItems)
    ? stateOrItems
    : stateOrItems.items
  const latched = Array.isArray(stateOrItems)
    ? false
    : Boolean(stateOrItems.readyCapLatched)
  const n = countReady(items)
  if (n >= cap) return false
  if (latched && n > Math.max(0, cap - DRAWER_READY_CAP_HYSTERESIS)) {
    return false
  }
  return true
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
  return { ...state, items: [item, ...state.items] }
}

export function moveItem(
  state: DrawerState,
  id: string,
  level: DrawerLevel,
  patch?: Partial<Pick<DrawerItem, 'snoozeUntil' | 'waitingOn' | 'deadline'>>,
): DrawerState {
  const t = nowIso()
  const next: DrawerState = {
    ...state,
    items: state.items.map((i) =>
      i.id === id
        ? {
            ...i,
            level,
            ...patch,
            // Beim Verlassen von defer: Wiedervorlage zurücksetzen
            ...(level !== 'defer' && patch?.snoozeUntil === undefined
              ? { snoozeUntil: null }
              : {}),
            updatedAt: t,
            touchedAt: t,
          }
        : i,
    ),
  }
  return next
}

/** Sanfter Aufschub: Ebene defer + Wiedervorlage */
export function snoozeItem(
  state: DrawerState,
  id: string,
  until: string,
): DrawerState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return state
  return moveItem(state, id, 'defer', { snoozeUntil: until })
}

export function setWaitingOn(
  state: DrawerState,
  id: string,
  waitingOn: string | null,
): DrawerState {
  const t = nowIso()
  const value = waitingOn?.trim() ? waitingOn.trim().slice(0, 80) : null
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === id
        ? { ...i, waitingOn: value, updatedAt: t, touchedAt: t }
        : i,
    ),
  }
}

export function addDaysToToday(days: number, today = todayKey()): string {
  const d = new Date(`${today}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function touchItem(state: DrawerState, id: string): DrawerState {
  const t = nowIso()
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === id
        ? { ...i, touchedAt: t, updatedAt: t, staleAskedAt: null }
        : i,
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
      ...state,
      items: state.items.filter((i) => i.id !== id && !childIds.has(i.id)),
    }
  }
  return {
    ...state,
    items: state.items.filter((i) => i.id !== id),
  }
}

/**
 * In Häppchen schneiden.
 * - Brocken/Eingang: Parent bleibt als Chunk, neue Häppchen darunter.
 * - Fertiges Häppchen weiter zerteilen: ersetzt den Schritt in derselben Kette
 *   (Reihenfolge bleibt, Geschwister warten weiter).
 */
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
  const isLeafBite = parent.isChunk === false

  // Häppchen weiter zerteilen → kleinere Schritte an derselben Kettenstelle
  if (isLeafBite) {
    const baseMs = Date.parse(parent.createdAt)
    const start = Number.isFinite(baseMs) ? baseMs : Date.now()
    const bites: DrawerItem[] = titles.map((title, idx) => ({
      id: uid(),
      title,
      level: 'ready' as const,
      parentId: parent.parentId ?? null,
      isChunk: false,
      energy: 'normal' as const,
      deadline: parent.deadline ?? null,
      createdAt: new Date(start + idx).toISOString(),
      updatedAt: t,
      touchedAt: t,
    }))
    return {
      ...state,
      items: [
        ...bites,
        ...state.items.filter((i) => i.id !== parentId),
      ],
    }
  }

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

  const nextParent: DrawerItem = {
    ...parent,
    isChunk: true,
    updatedAt: t,
    touchedAt: t,
  }

  return {
    ...state,
    items: [
      ...bites,
      ...state.items.map((i) => (i.id === parentId ? nextParent : i)),
    ],
  }
}

/** Geschwister einer Kette unter „Bereit“, in KI-/Schnitt-Reihenfolge */
export function readyChainSiblings(
  items: DrawerItem[],
  parentId: string,
  today = todayKey(),
): DrawerItem[] {
  return items
    .filter(
      (i) =>
        i.parentId === parentId &&
        i.level === 'ready' &&
        !i.isChunk &&
        isVisibleInDrawer(i, today),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
}

/**
 * free = keine Kette · next = nächster Schritt · later = eigentlich später
 * (Reihenfolge kommt aus dem Zerlegen / der KI)
 */
export function chainPullRole(
  items: DrawerItem[],
  item: DrawerItem,
  today = todayKey(),
): 'free' | 'next' | 'later' {
  if (!item.parentId || item.isChunk) return 'free'
  if (item.level !== 'ready') return 'free'
  const siblings = readyChainSiblings(items, item.parentId, today)
  if (siblings.length === 0) return 'free'
  if (siblings[0]?.id === item.id) return 'next'
  if (siblings.some((s) => s.id === item.id)) return 'later'
  return 'free'
}

/** Erster noch offener Vorgänger in der Kette (für Buddy-Text) */
export function earlierChainStep(
  items: DrawerItem[],
  item: DrawerItem,
  today = todayKey(),
): DrawerItem | null {
  if (!item.parentId) return null
  const siblings = readyChainSiblings(items, item.parentId, today)
  const idx = siblings.findIndex((s) => s.id === item.id)
  if (idx <= 0) return null
  return siblings[0] ?? null
}

/** Nächstes holbares Häppchen einer Kette (oder Einzel-ready); Notfall-Fristen zuerst */
export function nextPullable(
  items: DrawerItem[],
  today = todayKey(),
): DrawerItem[] {
  const ready = items.filter(
    (i) => i.level === 'ready' && !i.isChunk && isVisibleInDrawer(i, today),
  )
  // Ohne Parent: frei. Mit Parent: nur der nächste Ketten-Schritt ohne Rückfrage
  const pullable = ready.filter((i) => {
    const role = chainPullRole(items, i, today)
    return role === 'free' || role === 'next'
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
  parentTitle?: string | null,
): Task {
  const brocken = parentTitle?.trim()
  return {
    id: uid(),
    title: item.title,
    kind: 'work',
    status: 'planned',
    size,
    minutes: minutesForSize(size, mood) || SIZE_MINUTES[size],
    ...(brocken ? { parentTitle: brocken } : {}),
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

/** Parent-Brocken eines Häppchens (falls noch vorhanden) */
export function parentOf(
  items: DrawerItem[],
  item: DrawerItem,
): DrawerItem | null {
  if (!item.parentId) return null
  return items.find((i) => i.id === item.parentId) ?? null
}

/** Direkte Kinder eines Brockens — Kettenreihenfolge */
export function childrenOf(
  items: DrawerItem[],
  parentId: string,
  today = todayKey(),
): DrawerItem[] {
  return items
    .filter(
      (i) => i.parentId === parentId && isVisibleInDrawer(i, today),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
}

export type DrawerItemGroup = {
  key: string
  /** Brocken-Titel — null = Einzelstück ohne Gruppe */
  label: string | null
  items: DrawerItem[]
}

/** Bereit: Notfall → nächster Ketten-Schritt → frei → später */
export function sortReadyForFocus(
  levelItems: DrawerItem[],
  allItems: DrawerItem[],
  today = todayKey(),
): DrawerItem[] {
  return [...levelItems].sort((a, b) => {
    const rank = (i: DrawerItem) => {
      const phase = deadlinePhase(i, today)
      if (phase === 'emergency') return 0
      if (i.isChunk) return 1
      const role = chainPullRole(allItems, i, today)
      if (role === 'next') return 2
      if (role === 'free') return 3
      if (phase === 'radar') return 4
      return 5
    }
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    return Date.parse(a.createdAt) - Date.parse(b.createdAt)
  })
}

/** Häppchen unter Brocken bündeln; Brocken und Einzelne bleiben eigene Gruppen */
export function groupItemsByParent(
  allItems: DrawerItem[],
  levelItems: DrawerItem[],
): DrawerItemGroup[] {
  const groups = new Map<string, DrawerItemGroup>()
  const order: string[] = []

  for (const item of levelItems) {
    if (item.isChunk) {
      const key = `chunk:${item.id}`
      if (!groups.has(key)) {
        groups.set(key, { key, label: null, items: [] })
        order.push(key)
      }
      groups.get(key)!.items.push(item)
      continue
    }
    if (item.parentId) {
      const parent = allItems.find((i) => i.id === item.parentId)
      const key = `p:${item.parentId}`
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: parent?.title?.trim() || null,
          items: [],
        })
        order.push(key)
      }
      groups.get(key)!.items.push(item)
      continue
    }
    const key = `solo:${item.id}`
    groups.set(key, { key, label: null, items: [item] })
    order.push(key)
  }

  return order.map((k) => groups.get(k)!)
}

/**
 * Kandidaten für „in Ruhe“: nicht die Fokus-Spitze, nicht Notfall, nicht nächster Ketten-Schritt.
 */
export function readyRestCandidates(
  items: DrawerItem[],
  keepFocus = 3,
  today = todayKey(),
): DrawerItem[] {
  const ready = items.filter(
    (i) => i.level === 'ready' && !i.isChunk && isVisibleInDrawer(i, today),
  )
  const sorted = sortReadyForFocus(ready, items, today)
  const keep = new Set<string>()
  let kept = 0
  for (const i of sorted) {
    const phase = deadlinePhase(i, today)
    const role = chainPullRole(items, i, today)
    if (phase === 'emergency' || role === 'next') {
      keep.add(i.id)
      continue
    }
    if (kept < keepFocus) {
      keep.add(i.id)
      kept += 1
    }
  }
  return sorted.filter((i) => !keep.has(i.id))
}

export function moveItems(
  state: DrawerState,
  ids: string[],
  level: DrawerLevel,
): DrawerState {
  let next = state
  for (const id of ids) {
    next = moveItem(next, id, level)
  }
  return next
}
