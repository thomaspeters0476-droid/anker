/**
 * Gegen Mikro-Zerlegung: Häppchen sollen greifbar bleiben (~ein Fokusblock),
 * nicht „Stift nehmen / Datei öffnen“.
 */

export const CHOP_FURTHER_MAX = 4
/** Erste Zerlegung: lieber wenige greifbare Schritte als viele Mikro-Aktionen */
export const CHOP_FIRST_PREFERRED_MAX = 6

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

/** Vorschlag/Eingabe ist zu fein zerschnitten */
export function bitesTooFine(lines: string[]): boolean {
  if (lines.length === 0) return false
  if (lines.length > CHOP_FURTHER_MAX) return true
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
