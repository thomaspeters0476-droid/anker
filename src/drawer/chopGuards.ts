/**
 * Zerlegung in Stufen à 3–5.
 * Wenn jemand jede Stufe voll ausreizt: 5 → 25 → 125 Häppchen —
 * deshalb Buddy gegen unnötiges Weiterzerteilen schon greifbarer Schritte.
 */

/** Pro Zerlegung (erster Schnitt und Weiterzerteilen) */
export const CHOP_MIN = 3
export const CHOP_MAX = 5

/** @deprecated alias — gleiche Grenze für alle Stufen */
export const CHOP_FURTHER_MAX = CHOP_MAX
/** @deprecated alias */
export const CHOP_FIRST_PREFERRED_MAX = CHOP_MAX

const MICRO_RE =
  /^(stift|maus|klick|öffnen|aufmachen|hinsetzen|aufstehen|atmen|trinken|speichern|scrollen)\b/i

/** Häppchen wirkt schon klein genug — eher holen als weiter zerteilen */
export function looksAlreadySmall(title: string): boolean {
  const t = title.trim()
  if (!t) return true
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length <= 3 && t.length <= 32) return true
  if (words.length <= 5 && t.length <= 40 && !/[;/·|]/.test(t)) return true
  if (MICRO_RE.test(t)) return true
  return false
}

/** Vorschlag/Eingabe ist zu fein zerschnitten (Mikro-Schritte) — Anzahl separat prüfen */
export function bitesTooFine(lines: string[]): boolean {
  if (lines.length === 0) return false
  const tiny = lines.filter((line) => {
    const t = line.trim()
    const words = t.split(/\s+/).filter(Boolean)
    return t.length < 12 || words.length <= 2 || MICRO_RE.test(t)
  })
  if (lines.length >= 3 && tiny.length >= Math.ceil(lines.length * 0.5)) {
    return true
  }
  if (lines.length >= 4 && tiny.length >= 2) return true
  return false
}

export function parseChopLines(text: string): string[] {
  return text
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
}
