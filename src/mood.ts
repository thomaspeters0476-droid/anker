import type { CapacitySettings, TaskSize } from './types'
import {
  DEFAULT_CAPACITY,
  HARD_CAPS,
  MAX_DAY_POINTS,
  SIZE_MINUTES,
  capacityPoints,
  setCapacitySize,
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

/** Kapazität aus Baseline (Einstellungen) für heutige Stimmung ableiten */
export function capacityForMood(
  baseline: CapacitySettings,
  mood: DayMood,
): CapacitySettings {
  const scale = SCALES[mood]
  const targetPoints = Math.max(
    1,
    Math.round(capacityPoints(baseline) * scale.pointFactor),
  )
  const cappedTarget = Math.min(targetPoints, MAX_DAY_POINTS)

  // Von groß nach klein füllen, damit „schwer“ eher Kleines übrig lässt
  let next: CapacitySettings = { large: 0, medium: 0, small: 0 }
  let left = cappedTarget

  const order: TaskSize[] = ['large', 'medium', 'small']
  const points: Record<TaskSize, number> = { large: 3, medium: 2, small: 1 }

  for (const size of order) {
    const maxByHard = HARD_CAPS[size]
    const maxByBase = baseline[size]
    const maxCount = Math.min(maxByHard, maxByBase)
    const want = Math.floor(left / points[size])
    const take = Math.min(maxCount, want)
    next[size] = take
    left -= take * points[size]
  }

  // Restpunkte in Klein, wenn Baseline das hergibt
  while (left >= 1 && next.small < Math.min(HARD_CAPS.small, Math.max(baseline.small, 1))) {
    const trial = setCapacitySize(next, 'small', next.small + 1)
    if (capacityPoints(trial) > cappedTarget) break
    next = trial
    left = cappedTarget - capacityPoints(next)
  }

  if (capacityPoints(next) === 0) {
    next = { ...DEFAULT_CAPACITY, large: 0, medium: 0, small: 1 }
  }

  return next
}

export function lifeMaxForMood(baselineLife: number, mood: DayMood): number {
  const scaled = Math.round(baselineLife * SCALES[mood].lifeFactor)
  return clampLifeMax(Math.max(1, scaled))
}

export { DEFAULT_CAPACITY, LIFE_MAX_HARD }
