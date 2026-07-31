import type { CapacitySettings, TaskSize } from './types'
import {
  DEFAULT_CAPACITY,
  HARD_CAPS,
  MAX_DAY_POINTS,
  SIZE_MINUTES,
  SIZE_POINTS,
  capacityPoints,
} from './capacity'
import { LIFE_MAX_HARD, clampLifeMax } from './types'

/** Nur für heute — nicht historisch speichern / bewerten */
export type DayMood = 'good' | 'ok' | 'hard'

export const MOOD_OPTIONS: { id: DayMood }[] = [
  { id: 'good' },
  { id: 'ok' },
  { id: 'hard' },
]

type MoodScale = {
  pointFactor: number
  minuteFactor: number
  lifeFactor: number
}

const SCALES: Record<DayMood, MoodScale> = {
  good: { pointFactor: 1, minuteFactor: 1, lifeFactor: 1 },
  ok: { pointFactor: 0.7, minuteFactor: 1.25, lifeFactor: 1 },
  hard: { pointFactor: 0.5, minuteFactor: 1.5, lifeFactor: 0.85 },
}

export function moodMinuteFactor(mood: DayMood | null | undefined): number {
  if (!mood) return 1
  return SCALES[mood].minuteFactor
}

export function minutesForSize(
  size: TaskSize,
  mood: DayMood | null | undefined,
): number {
  const base = SIZE_MINUTES[size]
  const factor = moodMinuteFactor(mood)
  return Math.round(base * factor)
}

/**
 * Kapazität aus Baseline für heutige Stimmung.
 * Proportional zur Baseline — nicht „alles in Mittel“, sonst sind Klein/Groß oft 0.
 */
export function capacityForMood(
  baseline: CapacitySettings,
  mood: DayMood,
): CapacitySettings {
  const scale = SCALES[mood]
  const basePts = capacityPoints(baseline)
  const cappedTarget = Math.min(
    MAX_DAY_POINTS,
    Math.max(1, Math.round(basePts * scale.pointFactor)),
  )

  if (basePts <= 0) {
    return { large: 0, medium: 0, small: 1 }
  }

  const sizes: TaskSize[] = ['small', 'medium', 'large']
  let next: CapacitySettings = { large: 0, medium: 0, small: 0 }

  // Anteilig nach Baseline-Punkten je Größe
  for (const size of sizes) {
    if (baseline[size] <= 0) continue
    const share = (baseline[size] * SIZE_POINTS[size]) / basePts
    const wantPts = share * cappedTarget
    next[size] = Math.min(
      HARD_CAPS[size],
      baseline[size],
      Math.floor(wantPts / SIZE_POINTS[size] + 1e-9),
    )
  }

  // Restpunkte: klein → mittel → groß (mehr Wahl beim Anlegen)
  let guard = 0
  while (capacityPoints(next) < cappedTarget && guard < 24) {
    guard += 1
    let grew = false
    for (const size of sizes) {
      const maxForSize = Math.min(
        HARD_CAPS[size],
        Math.max(baseline[size], size === 'small' ? 1 : 0),
      )
      if (next[size] >= maxForSize) continue
      if (
        capacityPoints(next) + SIZE_POINTS[size] >
        cappedTarget
      ) {
        continue
      }
      next = { ...next, [size]: next[size] + 1 }
      grew = true
      break
    }
    if (!grew) break
  }

  guard = 0
  while (capacityPoints(next) > cappedTarget && guard < 24) {
    guard += 1
    let cut = false
    for (const size of ['large', 'medium', 'small'] as TaskSize[]) {
      if (next[size] > 0) {
        next = { ...next, [size]: next[size] - 1 }
        cut = true
        break
      }
    }
    if (!cut) break
  }

  if (capacityPoints(next) === 0) {
    next = { large: 0, medium: 0, small: 1 }
  }

  return next
}

export function lifeMaxForMood(baselineLife: number, mood: DayMood): number {
  const scaled = Math.round(baselineLife * SCALES[mood].lifeFactor)
  return clampLifeMax(Math.max(1, scaled))
}

export { DEFAULT_CAPACITY, LIFE_MAX_HARD }
