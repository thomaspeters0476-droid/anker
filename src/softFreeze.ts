/** Weicher Freeze — Defaults für ADHS (sanft, nicht nervig) */

export type AwayNudgeMode = 'off' | 'once' | 'repeat'

export const SOFT_FREEZE_DEFAULTS = {
  /** Timer pausieren + Rückkehr-Impuls */
  softFreezeEnabled: true,
  /**
   * Beim Weggehen erinnern:
   * once = ein sanfter Impuls (Empfehlung)
   * repeat = wenige weitere, mit Abstand
   * off = keine Extra-Mitteilungen
   */
  awayNudgeMode: 'once' as AwayNudgeMode,
  /** Abstand bei Wiederholen (Minuten) */
  awayNudgeEveryMin: 4,
  /** Max. Mitteilungen während einer Abwesenheit (inkl. der ersten) */
  awayNudgeMax: 3,
}

export function awayNudgeLabel(mode: AwayNudgeMode): string {
  if (mode === 'off') return 'Keine'
  if (mode === 'once') return 'Einmal'
  return 'Wiederholen'
}
