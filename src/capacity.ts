import type { Task, TaskSize } from './types'

export const SIZE_POINTS: Record<TaskSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
}

export const SIZE_MINUTES: Record<TaskSize, number> = {
  small: 15,
  medium: 25,
  large: 40,
}

export const SIZE_LABEL: Record<TaskSize, string> = {
  small: 'Klein',
  medium: 'Mittel',
  large: 'Groß',
}

/** Absolute Höchstgrenzen pro Größe */
export const HARD_CAPS: Record<TaskSize, number> = {
  large: 2,
  medium: 6,
  small: 8,
}

/** Gesamtpunkte-Deckel — verhindert „alles auf Maximum“ */
export const MAX_DAY_POINTS = 8

export type Capacity = Record<TaskSize, number>

export const DEFAULT_CAPACITY: Capacity = {
  large: 0,
  medium: 2,
  small: 2, // 6 Punkte — realistischer Normal-Tag
}

export function capacityPoints(cap: Capacity): number {
  return (
    cap.large * SIZE_POINTS.large +
    cap.medium * SIZE_POINTS.medium +
    cap.small * SIZE_POINTS.small
  )
}

export function usedCapacity(tasks: Task[]): Capacity {
  const used: Capacity = { large: 0, medium: 0, small: 0 }
  for (const t of tasks) {
    if (t.kind !== 'work') continue
    used[t.size] += 1
  }
  return used
}

export function usedPoints(tasks: Task[]): number {
  return capacityPoints(usedCapacity(tasks))
}

export function remainingCapacity(cap: Capacity, tasks: Task[]): Capacity {
  const used = usedCapacity(tasks)
  return {
    large: Math.max(0, cap.large - used.large),
    medium: Math.max(0, cap.medium - used.medium),
    small: Math.max(0, cap.small - used.small),
  }
}

export function canAddSize(cap: Capacity, tasks: Task[], size: TaskSize): boolean {
  return remainingCapacity(cap, tasks)[size] > 0
}

/**
 * Eine Größe setzen; andere werden automatisch runtergenommen,
 * bis Punkte ≤ MAX_DAY_POINTS und Floors (bereits geplante Aufgaben) gelten.
 */
export function setCapacitySize(
  current: Capacity,
  size: TaskSize,
  rawValue: number,
  floors: Capacity = { large: 0, medium: 0, small: 0 },
): Capacity {
  const value = Math.max(
    floors[size],
    Math.min(HARD_CAPS[size], Math.round(rawValue)),
  )

  const next: Capacity = { ...current, [size]: value }

  const others: TaskSize[] =
    size === 'large'
      ? ['small', 'medium']
      : size === 'medium'
        ? ['small', 'large']
        : ['medium', 'large']

  // Zu viele Punkte → andere Größen reduzieren (klein zuerst bei großer Wahl)
  let guard = 0
  while (capacityPoints(next) > MAX_DAY_POINTS && guard < 24) {
    guard += 1
    let reduced = false
    for (const key of others) {
      if (next[key] > floors[key]) {
        next[key] -= 1
        reduced = true
        if (capacityPoints(next) <= MAX_DAY_POINTS) break
      }
    }
    if (!reduced) break
  }

  // Immer noch über Deckel → die gesetzte Größe selbst begrenzen
  while (capacityPoints(next) > MAX_DAY_POINTS && next[size] > floors[size]) {
    next[size] -= 1
  }

  return next
}

export function maxSteppable(
  current: Capacity,
  size: TaskSize,
  floors: Capacity,
): number {
  // Höchster Wert, den man für size wählen kann, ohne floors der anderen zu brechen
  for (let n = HARD_CAPS[size]; n >= floors[size]; n--) {
    const trial = setCapacitySize(current, size, n, floors)
    if (trial[size] === n) return n
  }
  return floors[size]
}
