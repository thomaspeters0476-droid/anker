/**
 * Brücke Anker ↔ Schublade: kurze Einmal-Hinweise.
 * Volle Intros bleiben jeweils in der eigenen App.
 */

export type BridgeTipSide = 'anker' | 'schublade'

const KEYS: Record<BridgeTipSide, string> = {
  anker: 'anker-bridge-tip-seen-anker',
  schublade: 'anker-bridge-tip-seen-schublade',
}

/** Älterer Toast-Key — zählt als „Schublade-Seite schon gesehen“. */
const LEGACY_SCHUBLADE_TOAST = 'anker-schublade-bridge-toast'

export function hasSeenBridgeTip(side: BridgeTipSide): boolean {
  try {
    if (localStorage.getItem(KEYS[side]) === '1') return true
    if (side === 'schublade' && localStorage.getItem(LEGACY_SCHUBLADE_TOAST) === '1') {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function markBridgeTipSeen(side: BridgeTipSide) {
  try {
    localStorage.setItem(KEYS[side], '1')
    if (side === 'schublade') {
      localStorage.setItem(LEGACY_SCHUBLADE_TOAST, '1')
    }
  } catch {
    /* ignore */
  }
}
