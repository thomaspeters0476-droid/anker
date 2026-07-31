# Tagesanker — Datenmodell

Persistenz: **Browser `localStorage`**, optional Cloud-Sync (Supabase) nach OTP + Sync-Passwort. Cloud-Inhalt ist **E2E-verschlüsselt** (Envelope in `user_state`, Medien in Storage `sync-blobs`). Ablauf-Mails über Vercel/Resend (optional, nicht E2E).

---

## Keys

| Key | Inhalt |
|-----|--------|
| `fokus-buddy-day` | Aktueller Tageszustand (`DayState`) |
| `anker-prefs` | Dauerhafte Einstellungen (Baseline-Kapazität, Buddy, lifeMax, Freeze, Life-Anker, …) |
| `anker-carry` | Offene Aufgaben zum Mitnehmen (`CarryItem[]`) |
| `anker-sparks` | Geistesblitz-Vault (Ablauf über `reconcileExpiredSparks`) |
| `anker-drawer` | Schublade (`DrawerState`) |
| `anker-intro-seen` | `'1'` nach Intro |
| `anker-sync-meta` | `{ updatedAt }` für Last-Write-Wins Sync |

Prefs u. a.: `sparksMailEmail` — optional, Zieladresse für Ablauf-Mail.

### Cloud (`user_state`)

Eine Zeile pro User: `payload` = `{ day, prefs, carry, sparks, drawer }`, `updated_at`. Details: [`supabase/`](../supabase/).

---

## Geistesblitze — Retention & Mail

Konstante: `SPARK_RETENTION_DAYS = 7` ([`storage.ts`](../src/storage.ts)).

Beim App-Start ([`sparkExpiry.ts`](../src/sparkExpiry.ts)):

1. Abgelaufene Einträge finden  
2. Wenn gültige E-Mail: `POST /api/send-expired-sparks` → bei Erfolg löschen  
3. Bei Mail-Fehler: behalten (kein stilles Löschen)  
4. Ohne E-Mail: still löschen  

API: [`api/send-expired-sparks.ts`](../api/send-expired-sparks.ts) (Resend). Env: siehe [DEPLOY.md](./DEPLOY.md).

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
| `sparksMailEmail` | optional: Ablauf-Mail-Adresse |
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

Beim `saveDay` werden relevante Felder nach `anker-prefs` geschrieben (inkl. `sparksMailEmail`).  
**Mood wird nicht in Prefs gespeichert.**

---

## Carry-over

`rollDayForward(day)`:

1. Unfinished (`planned` / `active` / `skipped`) → `anker-carry`
2. Sparks in Vault mergen
3. Day-Key löschen

Auslöser:

- Datumswechsel in `loadDay()`
- „Neuen Tag planen“ in `DoneScreen`

UI: PlanScreen „Noch offen“ → Übernehmen / Verwerfen (`clearCarryOver`).

---

## Kapazität (Arbeit)

| Größe | Punkte | Baseline-Minuten |
|-------|--------|------------------|
| small | 1 | 15 |
| medium | 2 | 25 |
| large | 3 | 40 |

- `MAX_DAY_POINTS = 16`
- Default-Kapazität: 4× klein, 3× mittel, 1× groß (13 Punkte)
- Hard-Caps: large≤2, medium≤6, small≤8
- Default-Baseline: medium:2, small:2

Mood skaliert Punkte und Minuten zur Laufzeit; Baseline bleibt in Prefs.
