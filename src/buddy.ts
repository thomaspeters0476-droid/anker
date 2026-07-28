import type { DayState, Task } from './types'

type Tone = DayState['buddyTone']

function pick(tone: Tone, warm: string, kurz: string, klar: string): string {
  if (tone === 'kurz') return kurz
  if (tone === 'klar') return klar
  return warm
}

export function greeting(tone: Tone): string {
  return pick(
    tone,
    'Guten Morgen. Was ist heute realistisch — nicht ideal?',
    'Morgen. Was kommt heute rein?',
    'Plan für heute: wenig, klar, machbar.',
  )
}

export function capacityHint(
  usedPts: number,
  maxPts: number,
  life: number,
  lifeMax: number,
  tone: Tone,
): string | null {
  if (maxPts > 0 && usedPts >= maxPts) {
    return pick(
      tone,
      'Arbeits-Kapazität voll. Mehr geht heute nicht — Alltag zählt extra.',
      'Arbeit voll. Stop.',
      'Punkte aufgebraucht. Keine weitere Arbeitsaufgabe.',
    )
  }
  if (maxPts > 0 && usedPts / maxPts >= 0.75) {
    return pick(
      tone,
      'Fast voll. Eine große Sache ersetzt oft zwei mittlere — nicht beides.',
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

export function startFocus(task: Task, tone: Tone): string {
  return pick(
    tone,
    `Okay. Nur das jetzt: „${task.title}“. Der Rest wartet.`,
    `Los: ${task.title}`,
    `Fokus: ${task.title}. Eine Sache.`,
  )
}

export function checkInPrompt(task: Task, tone: Tone): string {
  return pick(
    tone,
    `Kurzer Check: bist du noch bei „${task.title}“?`,
    `Noch bei „${task.title}“?`,
    `Status: „${task.title}“ — noch dran?`,
  )
}

export function afterDrift(tone: Tone): string {
  return pick(
    tone,
    'Passiert. Zurück zur einen Sache — oder bewusst Pause.',
    'Zurücklenken oder Pause.',
    'Neu ausrichten: Aufgabe oder Pause.',
  )
}

export function afterDone(task: Task, tone: Tone): string {
  return pick(
    tone,
    `Geschafft: „${task.title}“. Kurz durchatmen — dann das Nächste.`,
    `Fertig: ${task.title}`,
    `Abgeschlossen: ${task.title}. Weiter nur wenn du willst.`,
  )
}

export function dayDone(done: number, total: number, tone: Tone): string {
  if (done === 0) {
    return pick(
      tone,
      'Heute nichts Abgehaktes — und das ist okay. Morgen neu, kleiner.',
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
    `${done} von ${total} geschafft. Der Rest darf liegen bleiben.`,
    `${done}/${total} fertig. Rest offenlassen.`,
    `Erledigt: ${done}/${total}. Nicht nachziehen.`,
  )
}

export function sleepReminder(tone: Tone): string {
  return pick(
    tone,
    'Wenn „rechtzeitig schlafen“ auf der Liste steht: jetzt ist ein guter Moment, den Tag zu schließen.',
    'Schlaf-Anker? Tag schließen.',
    'Schlaf-Zeit prüfen. Tag beenden.',
  )
}

export function sparkParked(count: number, tone: Tone): string {
  return pick(
    tone,
    `Geparkt (${count}). Zurück zur Aufgabe — Ideen kommen später.`,
    `Geparkt (${count}). Zurück.`,
    `Gespeichert (${count}). Fokus fortsetzen.`,
  )
}

export function sparkVaultLocked(count: number, tone: Tone): string {
  if (count === 0) {
    return pick(
      tone,
      'Ideen parken geht immer. Anschauen erst nach den Arbeitsaufgaben.',
      'Speicher zu — erst Arbeit fertig.',
      'Geistesblitze: Ablegen ja, Öffnen nach Arbeit.',
    )
  }
  return pick(
    tone,
    `${count} Geistesblitz${count === 1 ? '' : 'e'} warten. Freigabe nach den Arbeitsaufgaben — Alltag zählt nicht dafür.`,
    `${count} geparkt. Öffnen nach Arbeit.`,
    `${count} gespeichert. Freischaltung: Arbeitsaufgaben erledigt.`,
  )
}

export function lifeContinue(task: Task, tone: Tone): string {
  return pick(
    tone,
    `Alltag zuerst: weiter bei „${task.title}“. Die Ideen warten geduldig.`,
    `Weiter: ${task.title}`,
    `Alltagsanker: „${task.title}“. Nicht abschweifen.`,
  )
}
