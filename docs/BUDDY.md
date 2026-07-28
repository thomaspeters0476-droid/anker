# Tagesanker — Buddy

Lokale Texthilfe — **entlasten, nicht bewerten**. Keine KI in der Testphase.

Code: [`src/buddy.ts`](../src/buddy.ts)

---

## Ton

Einstellbar unter Plan → Einstellungen:

| Ton | Charakter |
|-----|-----------|
| **warm** | etwas länger, zugewandt |
| **kurz** | knapp |
| **klar** | sachlich, direkt |

Alle drei Varianten transportieren dieselbe Haltung.

---

## Kontext (`BuddyCtx`)

Statt nur `tone` nutzen die meisten Texte einen Kontext:

```ts
type BuddyCtx = {
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
```

Ableitung: `ctxFromDay(day, patch?)`.

### Typische Situationen

| Funktion | Wann |
|----------|------|
| `planBuddy` | Plan-Screen (Mood + Carry) |
| `capacityHint` | Kapazität eng/voll |
| `startFocus` / `lifeContinue` | Aufgabe beginnt |
| `checkInPrompt` | Check-in (inkl. Box fast leer) |
| `afterStill` / `afterDrift` / `afterPause` | Check-in-Antwort |
| `afterDone` | Fertig (optional nächster Titel) |
| `timeboxOver` / `anotherRound` | Timer Ende / Verlängerung |
| `welcomeBack` | nach Soft Freeze |
| `feierabend` | Arbeit settled |
| `sparkParked` / `sparkVaultLocked` | Geistesblitze |
| `dayDone` | Abschluss-Screen |
| `sleepReminder` | Schlaf-Anker abends |

---

## Regeln (verbindlich)

1. **Keine Schuld** bei 0 erledigten Aufgaben oder Abschweifen  
2. **Keine Scores / Streaks** in Buddy-Texten  
3. Bei Mood **hard**: eher sanfter, Pausen ausdrücklich okay  
4. Alltag und Arbeit wertschätzend; Feierabend freut Speicher frei, ohne Alltag zu entwerten  
5. Verkaufs-/Abo-/Werbetexte **nicht** in Buddy-Copy (Testphase)

---

## Erweiterung

Mehr Kontext = mehr Treffsicherheit ohne KI.  
Optional später: KI opt-in — dann eigene Spec (`ANKER_BUDDY_KI.md`) und Datenschutz klären. Siehe [ANKER_ROADMAP.md](./ANKER_ROADMAP.md).
