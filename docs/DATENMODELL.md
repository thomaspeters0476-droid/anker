# Anker — Datenmodell

Persistenz: **Browser `localStorage`**. Kein Server in der Testphase.

---

## Keys

| Key | Inhalt |
|-----|--------|
| `fokus-buddy-day` | Aktueller Tageszustand (`DayState`) |
| `anker-prefs` | Dauerhafte Einstellungen (Baseline-Kapazität, Buddy, lifeMax, Freeze, Life-Anker, …) |
| `anker-carry` | Offene Aufgaben zum Mitnehmen (`CarryItem[]`) |
| `anker-sparks` | Geistesblitz-Vault (nach Purge ≤ 7 Tage) |
| `anker-intro-seen` | `'1'` nach Intro |

Hinweis: Der Day-Key heißt historisch `fokus-buddy-day` (früherer Projektname).

---

## DayState (Kern)

Siehe [`src/types.ts`](../src/types.ts). Wesentliche Felder:

| Feld | Bedeutung |
|------|-----------|
| `date` | ISO-Tag `YYYY-MM-DD` |
| `tasks` | Arbeit + Alltag |
| `sparks` | Geistesblitze des Tags (mit Vault gemerged) |
| `started` | Tag gestartet? |
| `capacity` / `baselineCapacity` | Tages- vs. Einstellungs-Kapazität |
| `lifeMax` / `baselineLifeMax` | Alltags-Limit |
| `mood` | nur heute, transient |
| `buddyTone` | warm \| kurz \| klar |
| `checkInEveryMin` | Check-in-Intervall |
| Soft-Freeze-Felder | `softFreezeEnabled`, `awayNudgeMode`, … |
| `hiddenLifeTemplates` | ausgeblendete Standard-Vorschläge |
| `customLifeAnchors` | eigene persistente Anker |
| `introButtonOnSurface` | Intro-Button sichtbar? |
| `notificationsEnabled` | Erinnerungen |

### Task

- `kind`: `work` \| `life`
- `status`: `planned` \| `active` \| `done` \| `skipped`
- `size`, `minutes` (Arbeit relevant für Kapazität/Timer)

### Spark

- `mode`: `note` \| `draw` \| `audio`
- `createdAt`, optionale Payloads (Text, Drawing-Data-URL, Audio)

---

## Prefs

Beim `saveDay` werden relevante Felder nach `anker-prefs` geschrieben (Baseline-Kapazität, lifeMax, Buddy, Freeze, Life-Anker-Listen, …).  
**Mood wird nicht in Prefs gespeichert.**

---

## Carry-over

`rollDayForward(day)`:

1. Unfinished (`planned` / `active` / `skipped`) → `anker-carry`
2. Sparks in Vault mergen + 7-Tage-Purge
3. Day-Key löschen

Auslöser:

- Datumswechsel in `loadDay()`
- „Neuen Tag planen“ in `DoneScreen`

UI: PlanScreen „Noch offen“ → Übernehmen / Verwerfen (`clearCarryOver`).

---

## Geistesblitze — Retention

Konstante: `SPARK_RETENTION_DAYS = 7` in [`storage.ts`](../src/storage.ts).  
Ältere Einträge werden beim Laden/Speichern des Vaults entfernt.

---

## Kapazität (Arbeit)

| Größe | Punkte | Baseline-Minuten |
|-------|--------|------------------|
| small | 1 | 15 |
| medium | 2 | 25 |
| large | 3 | 40 |

- `MAX_DAY_POINTS = 8`
- Hard-Caps: large≤2, medium≤6, small≤8
- Default-Baseline: medium:2, small:2

Mood skaliert Punkte und Minuten zur Laufzeit; Baseline bleibt in Prefs.
