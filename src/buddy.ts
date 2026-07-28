import type { DayState, Task } from './types'
import type { DayMood } from './mood'

export type BuddyTone = DayState['buddyTone']

/** Situationskontext — Buddy bleibt lokal, wird aber treffsicherer */
export type BuddyCtx = {
  tone: BuddyTone
  mood?: DayMood | null
  /** Geplante Arbeit, die noch wartet (ohne aktive) */
  workWaiting?: number
  /** Geplanter Alltag, der noch wartet (ohne aktive) */
  lifeWaiting?: number
  /** Offener Alltag inkl. aktive */
  lifeLeft?: number
  sparkCount?: number
  carryCount?: number
  /** Minuten in der aktuellen Zeitbox */
  minutesLeft?: number
  nextTitle?: string
}

function pick(tone: BuddyTone, warm: string, kurz: string, klar: string): string {
  if (tone === 'kurz') return kurz
  if (tone === 'klar') return klar
  return warm
}

function isHard(mood: DayMood | null | undefined): boolean {
  return mood === 'hard'
}

/** Kontext aus Tageszustand ableiten */
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
  if (mood === 'good') {
    return pick(
      tone,
      'Okay — normale Tagesmenge. Feinjustieren kannst du unten in den Einstellungen.',
      'Normale Menge. Einstellungen unten.',
      'Baseline: normale Kapazität. Anpassen in den Einstellungen.',
    )
  }
  if (mood === 'ok') {
    return pick(
      tone,
      'Geht so: etwas weniger auf dem Zettel, mehr Zeit pro Sache. Kein Versagen — Anpassung.',
      'Weniger + mehr Zeit. Passt.',
      'Kapazität reduziert, Zeiten verlängert. So geplant.',
    )
  }
  return pick(
    tone,
    'Heute eher schwer: bewusst wenig. Mehr Zeit pro Sache. Entlasten zählt.',
    'Schwer-Tag: wenig planen.',
    'Schwere Kapazität aktiv. Wenig einplanen.',
  )
}

/** Plan-Screen: Stimmung, Carry, Einstieg */
export function planBuddy(ctx: BuddyCtx): string {
  const { tone, mood, carryCount = 0 } = ctx

  if (mood) {
    const base = moodPlanLine(mood, tone)
    if (carryCount > 0) {
      return pick(
        tone,
        `${base} Unten warten ${carryCount} offene Sache${carryCount === 1 ? '' : 'n'} — nur mitnehmen, was heute geht.`,
        `${base} ${carryCount} offen — wählerisch mitnehmen.`,
        `${base} Carry: ${carryCount}. Nur übernehmen, was in die Kapazität passt.`,
      )
    }
    return base
  }

  if (carryCount > 0) {
    return pick(
      tone,
      `Guten Morgen. ${carryCount} Sache${carryCount === 1 ? '' : 'n'} noch offen — mitnehmen oder lassen. Was ist heute realistisch?`,
      `Morgen. ${carryCount} offen. Mitnehmen?`,
      `Plan: ${carryCount} Carry prüfen. Dann wenig und klar.`,
    )
  }

  return pick(
    tone,
    'Guten Morgen. Was ist heute realistisch — nicht ideal?',
    'Morgen. Was kommt heute rein?',
    'Plan für heute: wenig, klar, machbar.',
  )
}

/** @deprecated Prefer planBuddy — kept for simple calls */
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
      isHard(mood)
        ? 'Arbeits-Kapazität voll — und das ist heute genau richtig so. Alltag zählt extra.'
        : 'Arbeits-Kapazität voll. Mehr geht heute nicht — Alltag zählt extra.',
      'Arbeit voll. Stop.',
      'Punkte aufgebraucht. Keine weitere Arbeitsaufgabe.',
    )
  }
  if (maxPts > 0 && usedPts / maxPts >= 0.75) {
    return pick(
      tone,
      isHard(mood)
        ? 'Schon eng — bei einem schweren Tag lieber hier stoppen.'
        : 'Fast voll. Eine große Sache ersetzt oft zwei mittlere — nicht beides.',
      'Fast voll. Vorsicht.',
      'Kapazität eng. Nicht erweitern.',
    )
  }
  if (lifeMax > 0 && life >= lifeMax) {
    return pick(
      tone,
      'Alltag ist voll belegt. Das reicht als Anker.',
      'Alltag voll.',
      'Alltagsanker am Limit.',
    )
  }
  return null
}

function afterHint(ctx: BuddyCtx): string {
  const w = ctx.workWaiting ?? 0
  const l = ctx.lifeWaiting ?? 0
  if (w + l === 0) return ''
  if (w > 0) {
    return pick(
      ctx.tone,
      ` Danach noch ${w} Arbeit — die wartet.`,
      ` +${w} Arbeit.`,
      ` Warteschlange Arbeit: ${w}.`,
    )
  }
  return pick(
    ctx.tone,
    ` Danach noch ${l} Alltag.`,
    ` +${l} Alltag.`,
    ` Warteschlange Alltag: ${l}.`,
  )
}

export function startFocus(task: Task, ctx: BuddyCtx): string {
  const soft = isHard(ctx.mood)
  const tail = afterHint(ctx)
  if (task.kind === 'life') {
    return lifeContinue(task, ctx)
  }
  return pick(
    ctx.tone,
    soft
      ? `Ganz ruhig. Nur das jetzt: „${task.title}“.${tail}`
      : `Okay. Nur das jetzt: „${task.title}“. Der Rest wartet.${tail}`,
    `Los: ${task.title}${wShort(ctx)}`,
    `Fokus: ${task.title}. Eine Sache.${tail}`,
  )
}

function wShort(ctx: BuddyCtx): string {
  const w = ctx.workWaiting ?? 0
  return w > 0 ? ` (+${w})` : ''
}

export function checkInPrompt(task: Task, ctx: BuddyCtx): string {
  const mins = ctx.minutesLeft
  if (mins != null && mins <= 3) {
    return pick(
      ctx.tone,
      `Gleich vorbei die Box — noch bei „${task.title}“?`,
      `Box ende · „${task.title}“?`,
      `Zeitbox fast leer: „${task.title}“ — noch dran?`,
    )
  }
  if (isHard(ctx.mood)) {
    return pick(
      ctx.tone,
      `Kurzer Check, ohne Druck: bist du noch bei „${task.title}“?`,
      `Noch bei „${task.title}“?`,
      `Status „${task.title}“ — noch dran? (Schwer-Tag: Pause ist okay.)`,
    )
  }
  return pick(
    ctx.tone,
    `Kurzer Check: bist du noch bei „${task.title}“?`,
    `Noch bei „${task.title}“?`,
    `Status: „${task.title}“ — noch dran?`,
  )
}

export function afterDrift(ctx: BuddyCtx): string {
  if (isHard(ctx.mood)) {
    return pick(
      ctx.tone,
      'Abschweifen passiert — besonders an schweren Tagen. Zurück zur einen Sache, oder bewusst Pause.',
      'Passiert. Zurück oder Pause.',
      'Neu ausrichten: Aufgabe oder Pause. Kein Vorwurf.',
    )
  }
  return pick(
    ctx.tone,
    'Passiert. Zurück zur einen Sache — oder bewusst Pause.',
    'Zurücklenken oder Pause.',
    'Neu ausrichten: Aufgabe oder Pause.',
  )
}

export function afterStill(task: Task | undefined, ctx: BuddyCtx): string {
  if (task?.kind === 'life') return lifeContinue(task, ctx)
  return pick(
    ctx.tone,
    isHard(ctx.mood)
      ? 'Gut. Weiter — in deinem Tempo.'
      : 'Gut. Weiter bei der einen Sache.',
    'Weiter.',
    'Bestätigt. Fokus fortsetzen.',
  )
}

export function afterPause(ctx: BuddyCtx): string {
  return pick(
    ctx.tone,
    isHard(ctx.mood)
      ? 'Pause ist heute besonders okay. Wenn du bereit bist: Timer wieder starten.'
      : 'Pause ist okay. Wenn du bereit bist: Timer wieder starten.',
    'Pause.',
    'Pause. Timer gestoppt.',
  )
}

export function afterDone(task: Task, ctx: BuddyCtx): string {
  const next = ctx.nextTitle
  if (next) {
    return pick(
      ctx.tone,
      `Geschafft: „${task.title}“. Als Nächstes wartet „${next}“ — erst kurz Luft holen.`,
      `Fertig: ${task.title} → ${next}`,
      `Abgeschlossen: ${task.title}. Danach: ${next}.`,
    )
  }
  return pick(
    ctx.tone,
    `Geschafft: „${task.title}“. Kurz durchatmen — dann das Nächste.`,
    `Fertig: ${task.title}`,
    `Abgeschlossen: ${task.title}. Weiter nur wenn du willst.`,
  )
}

export function timeboxOver(ctx: BuddyCtx): string {
  return pick(
    ctx.tone,
    isHard(ctx.mood)
      ? 'Zeitbox vorbei. Fertig markieren ist genug — oder noch eine sanfte Runde.'
      : 'Zeitbox vorbei. Als fertig markieren — oder Timer nochmal starten.',
    'Zeitbox vorbei. Fertig oder weiter?',
    'Zeitbox abgelaufen. Abschließen oder verlängern.',
  )
}

export function anotherRound(ctx: BuddyCtx): string {
  return pick(
    ctx.tone,
    'Noch eine Zeitbox — nur diese eine Sache.',
    'Noch eine Runde.',
    'Weitere Zeitbox. Fokus unverändert.',
  )
}

export function backToFocus(task: Task, ctx: BuddyCtx): string {
  if (task.kind === 'life') return lifeContinue(task, ctx)
  return pick(
    ctx.tone,
    `Zurück zu „${task.title}“.`,
    'Zurück zur Aufgabe.',
    `Fokus fortsetzen: „${task.title}“.`,
  )
}

export function dayDone(
  done: number,
  total: number,
  ctx: BuddyCtx,
): string {
  const { tone, mood } = ctx
  if (done === 0) {
    return pick(
      tone,
      isHard(mood)
        ? 'Heute nichts Abgehaktes — an einem schweren Tag ist das keine Niederlage. Morgen kleiner.'
        : 'Heute nichts Abgehaktes — und das ist okay. Morgen neu, kleiner.',
      '0 fertig. Morgen kleiner planen.',
      'Nichts abgeschlossen. Morgen: weniger einplanen.',
    )
  }
  if (done === total) {
    return pick(
      tone,
      `Alles erledigt (${done}). Das war ein guter, realistischer Tag.`,
      `Alles fertig (${done}).`,
      `Tag abgeschlossen: ${done}/${total}.`,
    )
  }
  return pick(
    tone,
    `${done} von ${total} geschafft. Der Rest darf liegen bleiben — er taucht unter „Noch offen“ wieder auf.`,
    `${done}/${total} fertig. Rest offenlassen.`,
    `Erledigt: ${done}/${total}. Nicht nachziehen. Carry möglich.`,
  )
}

export function sleepReminder(ctx: BuddyCtx): string {
  return pick(
    ctx.tone,
    'Wenn „rechtzeitig schlafen“ auf der Liste steht: jetzt ist ein guter Moment, den Tag zu schließen.',
    'Schlaf-Anker? Tag schließen.',
    'Schlaf-Zeit prüfen. Tag beenden.',
  )
}

export function sparkParked(count: number, ctx: BuddyCtx): string {
  return pick(
    ctx.tone,
    `Geparkt (${count}). Zurück zur Aufgabe — Ideen kommen später.`,
    `Geparkt (${count}). Zurück.`,
    `Gespeichert (${count}). Fokus fortsetzen.`,
  )
}

export function sparkVaultLocked(count: number, ctx: BuddyCtx): string {
  if (count === 0) {
    return pick(
      ctx.tone,
      'Ideen parken geht immer. Anschauen erst nach den Arbeitsaufgaben.',
      'Speicher zu — erst Arbeit fertig.',
      'Geistesblitze: Ablegen ja, Öffnen nach Arbeit.',
    )
  }
  return pick(
    ctx.tone,
    `${count} Geistesblitz${count === 1 ? '' : 'e'} warten. Freigabe nach den Arbeitsaufgaben — Alltag zählt nicht dafür.`,
    `${count} geparkt. Öffnen nach Arbeit.`,
    `${count} gespeichert. Freischaltung: Arbeitsaufgaben erledigt.`,
  )
}

export function lifeContinue(task: Task, ctx: BuddyCtx): string {
  const sparks = ctx.sparkCount ?? 0
  if (sparks > 0) {
    return pick(
      ctx.tone,
      `Alltag: „${task.title}“. ${sparks} Idee${sparks === 1 ? '' : 'n'} warten geduldig im Speicher.`,
      `Alltag: ${task.title}`,
      `Alltagsanker „${task.title}“. Speicher hat ${sparks} — später.`,
    )
  }
  return pick(
    ctx.tone,
    `Alltag zuerst: weiter bei „${task.title}“.`,
    `Weiter: ${task.title}`,
    `Alltagsanker: „${task.title}“. Nicht abschweifen.`,
  )
}

export function welcomeBack(task: Task | undefined, ctx: BuddyCtx): string {
  if (!task) {
    return pick(
      ctx.tone,
      'Willkommen zurück. Kein Drama — einfach weitermachen, wenn du magst.',
      'Wieder da. Weiter?',
      'Zurück. Fortsetzen möglich.',
    )
  }
  if (isHard(ctx.mood)) {
    return pick(
      ctx.tone,
      `Wieder da. „${task.title}“ wartet ohne Vorwurf. Timer war pausiert.`,
      `Zurück: ${task.title}?`,
      `Fokus wieder: „${task.title}“. Timer pausiert.`,
    )
  }
  return pick(
    ctx.tone,
    `Willkommen zurück. Weiter bei „${task.title}“? Der Timer war pausiert.`,
    `Zurück. Weiter: ${task.title}?`,
    `Wieder im Fokus: „${task.title}“. Timer pausiert.`,
  )
}

export function feierabend(ctx: BuddyCtx): string {
  const lifeLeft = ctx.lifeLeft ?? 0
  const sparks = ctx.sparkCount ?? 0
  if (lifeLeft <= 0) {
    return pick(
      ctx.tone,
      sparks > 0
        ? `Arbeit erledigt. ${sparks} Geistesblitz${sparks === 1 ? '' : 'e'} sind frei — und der Tag darf zu Ende gehen.`
        : 'Arbeit erledigt. Geistesblitze sind frei — und der Tag darf zu Ende gehen.',
      'Arbeit fertig. Speicher offen.',
      'Feierabend Arbeit. Speicher freigegeben.',
    )
  }
  return pick(
    ctx.tone,
    `Feierabend-Modus: Arbeit ist durch. Geistesblitze frei. Noch ${lifeLeft} Alltagsanker — ohne Druck.`,
    `Feierabend. Noch ${lifeLeft}× Alltag.`,
    `Arbeit abgeschlossen. Alltag: ${lifeLeft}. Speicher offen.`,
  )
}
