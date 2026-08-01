import type { DayState, Task } from './types'
import type { DayMood } from './mood'
import i18n, { ensureI18n } from './i18n'

export type BuddyTone = DayState['buddyTone']

/** Situationskontext — Buddy bleibt lokal, wird aber treffsicherer */
export type BuddyCtx = {
  tone: BuddyTone
  mood?: DayMood | null
  workWaiting?: number
  lifeWaiting?: number
  lifeLeft?: number
  sparkCount?: number
  carryCount?: number
  minutesLeft?: number
  nextTitle?: string
}

function pick(
  tone: BuddyTone,
  key: string,
  opts?: Record<string, string | number>,
): string {
  ensureI18n()
  return i18n.t(`buddy:${key}.${tone}`, opts)
}

function isHard(mood: DayMood | null | undefined): boolean {
  return mood === 'hard'
}

export function ctxFromDay(
  day: DayState,
  patch: Partial<BuddyCtx> = {},
): BuddyCtx {
  const workWaiting = day.tasks.filter(
    (t) => t.kind === 'work' && t.status === 'planned',
  ).length
  const lifeWaiting = day.tasks.filter(
    (t) => t.kind === 'life' && t.status === 'planned',
  ).length
  const lifeLeft = day.tasks.filter(
    (t) =>
      t.kind === 'life' &&
      (t.status === 'planned' || t.status === 'active'),
  ).length
  return {
    tone: day.buddyTone,
    mood: day.mood ?? null,
    workWaiting,
    lifeWaiting,
    lifeLeft,
    sparkCount: day.sparks.length,
    ...patch,
  }
}

function moodPlanLine(mood: DayMood, tone: BuddyTone): string {
  if (mood === 'good') return pick(tone, 'plan.moodGood')
  if (mood === 'ok') return pick(tone, 'plan.moodOk')
  return pick(tone, 'plan.moodHard')
}

export function planBuddy(ctx: BuddyCtx): string {
  const { tone, mood, carryCount = 0 } = ctx

  if (mood) {
    const base = moodPlanLine(mood, tone)
    if (carryCount > 0) {
      return pick(tone, 'plan.moodWithCarry', { base, count: carryCount })
    }
    return base
  }

  if (carryCount > 0) {
    return pick(tone, 'plan.carryMorning', { count: carryCount })
  }

  // Leicht abwechseln: weichere Variante bei warm
  if (tone === 'warm' && Math.random() < 0.35) {
    return pick(tone, 'plan.morningSoft')
  }
  return pick(tone, 'plan.morning')
}

/** @deprecated Prefer planBuddy */
export function greeting(tone: BuddyTone): string {
  return planBuddy({ tone })
}

export function capacityHint(
  usedPts: number,
  maxPts: number,
  life: number,
  lifeMax: number,
  tone: BuddyTone,
  mood?: DayMood | null,
): string | null {
  if (maxPts > 0 && usedPts >= maxPts) {
    return pick(
      tone,
      isHard(mood) ? 'capacity.workFullHard' : 'capacity.workFull',
    )
  }
  if (maxPts > 0 && usedPts / maxPts >= 0.75) {
    return pick(
      tone,
      isHard(mood) ? 'capacity.workTightHard' : 'capacity.workTight',
    )
  }
  if (lifeMax > 0 && life >= lifeMax) {
    return pick(tone, 'capacity.lifeFull')
  }
  return null
}

function afterHint(ctx: BuddyCtx): string {
  const w = ctx.workWaiting ?? 0
  const l = ctx.lifeWaiting ?? 0
  if (w + l === 0) return ''
  if (w > 0) return pick(ctx.tone, 'after.workQueue', { count: w })
  return pick(ctx.tone, 'after.lifeQueue', { count: l })
}

function wShort(ctx: BuddyCtx): string {
  const w = ctx.workWaiting ?? 0
  return w > 0 ? ` (+${w})` : ''
}

export function startFocus(task: Task, ctx: BuddyCtx): string {
  if (task.kind === 'life') return lifeContinue(task, ctx)
  const soft = isHard(ctx.mood)
  return pick(ctx.tone, soft ? 'focus.startSoft' : 'focus.start', {
    title: task.title,
    tail: afterHint(ctx),
    short: wShort(ctx),
  })
}

export function checkInPrompt(task: Task, ctx: BuddyCtx): string {
  const mins = ctx.minutesLeft
  if (mins != null && mins <= 3) {
    return pick(ctx.tone, 'focus.checkInEnding', { title: task.title })
  }
  if (isHard(ctx.mood)) {
    return pick(ctx.tone, 'focus.checkInHard', { title: task.title })
  }
  return pick(ctx.tone, 'focus.checkIn', { title: task.title })
}

export function afterDrift(ctx: BuddyCtx): string {
  return pick(ctx.tone, isHard(ctx.mood) ? 'drift.hard' : 'drift.normal')
}

export function afterStill(task: Task | undefined, ctx: BuddyCtx): string {
  if (task?.kind === 'life') return lifeContinue(task, ctx)
  return pick(ctx.tone, isHard(ctx.mood) ? 'still.soft' : 'still.normal')
}

export function afterPause(ctx: BuddyCtx): string {
  return pick(ctx.tone, isHard(ctx.mood) ? 'pause.hard' : 'pause.normal')
}

export function afterDone(task: Task, ctx: BuddyCtx): string {
  const next = ctx.nextTitle
  if (next) {
    return pick(ctx.tone, 'done.withNext', { title: task.title, next })
  }
  return pick(ctx.tone, 'done.alone', { title: task.title })
}

export function timeboxOver(ctx: BuddyCtx): string {
  return pick(ctx.tone, isHard(ctx.mood) ? 'timebox.overHard' : 'timebox.over')
}

export function anotherRound(ctx: BuddyCtx): string {
  return pick(ctx.tone, 'timebox.another')
}

export function backToFocus(task: Task, ctx: BuddyCtx): string {
  if (task.kind === 'life') return lifeContinue(task, ctx)
  return pick(ctx.tone, 'back.work', { title: task.title })
}

export function dayDone(done: number, total: number, ctx: BuddyCtx): string {
  const { tone, mood } = ctx
  if (done === 0) {
    return pick(tone, isHard(mood) ? 'day.zeroHard' : 'day.zero')
  }
  if (done === total) {
    return pick(tone, 'day.all', { done, total })
  }
  return pick(tone, 'day.partial', { done, total })
}

export function sleepReminder(ctx: BuddyCtx): string {
  return pick(ctx.tone, 'sleep.hint')
}

export function sparkParked(count: number, ctx: BuddyCtx): string {
  return pick(ctx.tone, 'spark.parked', { count })
}

export function sparkVaultLocked(count: number, ctx: BuddyCtx): string {
  if (count === 0) return pick(ctx.tone, 'spark.lockedEmpty')
  return pick(ctx.tone, 'spark.locked', { count })
}

export function lifeContinue(task: Task, ctx: BuddyCtx): string {
  const sparks = ctx.sparkCount ?? 0
  if (sparks > 0) {
    return pick(ctx.tone, 'life.withSparks', {
      title: task.title,
      count: sparks,
    })
  }
  return pick(ctx.tone, 'life.plain', { title: task.title })
}

export function welcomeBack(task: Task | undefined, ctx: BuddyCtx): string {
  if (!task) return pick(ctx.tone, 'welcome.none')
  if (isHard(ctx.mood)) {
    return pick(ctx.tone, 'welcome.hard', { title: task.title })
  }
  return pick(ctx.tone, 'welcome.normal', { title: task.title })
}

export function feierabend(ctx: BuddyCtx): string {
  const lifeLeft = ctx.lifeLeft ?? 0
  const sparks = ctx.sparkCount ?? 0
  if (lifeLeft <= 0) {
    if (sparks > 0) {
      return pick(ctx.tone, 'feierabend.noLifeSparks', { count: sparks })
    }
    return pick(ctx.tone, 'feierabend.noLife')
  }
  return pick(ctx.tone, 'feierabend.withLife', { count: lifeLeft })
}

/** Kurze Schubladen-Hinweise (Cap / Fristen / Zerlegen / Kette) — entlastend, steuernd */
export function drawerBuddy(
  tone: BuddyTone,
  opts: {
    chopBlocked?: boolean
    /** already_small | too_fine | too_many — Buddy greift beim Zerlegen ein */
    chopSteer?: 'already_small' | 'too_fine' | 'too_many' | null
    /** Ketten-Vorziehen: Titel des eigentlich nächsten Schritts */
    pullAheadEarlier?: string | null
    emergencyCount?: number
    radarCount?: number
    /** Viele Bereit-Häppchen — Aufräumen vorschlagen */
    readyCount?: number
    restN?: number
    tidyAt?: number
  },
): string | null {
  if (opts.chopBlocked) return pick(tone, 'drawer.capBlocked')
  if (opts.pullAheadEarlier) {
    return pick(tone, 'drawer.pullAhead', { earlier: opts.pullAheadEarlier })
  }
  if (opts.chopSteer === 'already_small') {
    return pick(tone, 'drawer.alreadySmall')
  }
  if (opts.chopSteer === 'too_fine') {
    return pick(tone, 'drawer.tooFine')
  }
  if (opts.chopSteer === 'too_many') {
    return pick(tone, 'drawer.tooMany')
  }
  if ((opts.emergencyCount ?? 0) > 0) {
    return pick(tone, 'drawer.emergency', { count: opts.emergencyCount! })
  }
  const tidyAt = opts.tidyAt ?? 8
  if ((opts.readyCount ?? 0) >= tidyAt && (opts.restN ?? 0) > 0) {
    return pick(tone, 'drawer.tidyReady', {
      count: opts.readyCount!,
      rest: opts.restN!,
    })
  }
  if ((opts.radarCount ?? 0) > 0) {
    return pick(tone, 'drawer.radar', { count: opts.radarCount! })
  }
  return pick(tone, 'drawer.welcome')
}
