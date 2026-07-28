# Anker — Handbuch

Alle Funktionen aus Nutzersicht. Schnellstart: [ANKER_ERSTE_SCHRITTE.md](./ANKER_ERSTE_SCHRITTE.md).

**In der App:** Plan → Einstellungen → **Handbuch öffnen**  
**Stand:** Juli 2026

> Die In-App-Version (`src/components/Handbook.tsx`) und dieses Dokument sollen inhaltlich übereinstimmen. Bei Änderungen beides anpassen.

---

## Inhaltsverzeichnis

1. [Bildschirme](#1-bildschirme)
2. [Plan](#2-plan)
3. [Fokus](#3-fokus)
4. [Abschluss (Done)](#4-abschluss-done)
5. [Einstellungen](#5-einstellungen)
6. [Geistesblitze](#6-geistesblitze)
7. [Runterregeln (Notfall)](#7-runterregeln-notfall)
8. [Daten auf dem Gerät](#8-daten-auf-dem-gerät)

---

## 1. Bildschirme

| Screen | Wann |
|--------|------|
| Einführung | Erster Start (oder manuell erneut) |
| Plan | Tag noch nicht gestartet / nach Reset |
| Fokus | Tag gestartet, Aufgaben laufen |
| Done | Alle Aufgaben erledigt oder übersprungen |

---

## 2. Plan

### Buddy-Karte

Kurzer Text oben: Gruß, Stimmungshinweis, Hinweis auf offene Aufgaben vom letzten Durchgang.

### Tagesgefühl

- **Ziemlich gut** — normale Menge und Zeiten  
- **Geht so** — weniger Punkte, etwas längere Boxen  
- **Heute eher schwer** — deutlich weniger, mehr Zeit  

Nur für heute. Keine Bewertung über Tage.

### Arbeit

- Titel + Größe (Klein / Mittel / Groß)
- Punkte und Minuten siehe Konzept
- Entfernen mit ✕ an der Zeile
- Wenn Kapazität voll: Buddy warnt, Hinzufügen blockiert

### Alltag

- Liste der heutigen Anker + ✕ zum Entfernen vom **heutigen** Plan
- Chips: Vorschläge; × am Chip = **dauerhaft nicht mehr vorschlagen**
- Eigene Anker bleiben als Vorschlag gespeichert
- Limit: einstellbar (max. 5)

### Noch offen

- Offene Aufgaben vom letzten Tag / „Neuen Tag planen“
- Auswählen → **Übernehmen** (Kapazität beachten) oder **Verwerfen**

### Tag starten

Nur aktiv, wenn mindestens eine Aufgabe geplant ist. Danach Fokus-Screen.

---

## 3. Fokus

### Aktive Aufgabe

- Art (Arbeit / Alltag), Größe, Timer, Fortschritt
- **Pause / Weiter**, **Fertig**, **Später / überspringen**
- Warteschlange sichtbar, aber „nicht jetzt“

### Check-in

In einstellbaren Abständen (Default 20 Min.):

- Ja, noch dabei  
- Abgeschweift — zurück  
- Pause  

### Feierabend

Wenn keine Arbeitsaufgabe mehr offen (erledigt/übersprungen):

- Banner / Buddy: Geistesblitze frei
- Alltag kann noch folgen — ohne den Speicher wieder zu sperren

### Weicher Freeze

App/Tab verlassen → Timer pausiert. Zurück → Buddy begrüßt.  
Optionale Mitteilungen je nach Freeze-Einstellung.

### Tag beenden

Offene Aufgaben werden als übersprungen markiert → Done-Screen.

---

## 4. Abschluss (Done)

- Buddy-Zusammenfassung (ohne Schuld bei 0 fertig)
- Liste Geschafft / Offen gelassen
- Geistesblitze ansehen (wenn freigeschaltet)
- **Neuen Tag planen** → Offenes wird gemerkt, leerer Plan

---

## 5. Einstellungen

Am unteren Rand des Plans (aufklappbar):

| Einstellung | Wirkung |
|-------------|---------|
| Kapazität S/M/L | Wie viele Arbeitsaufgaben welcher Größe |
| Alltagsanker max. | 1–5 |
| Buddy-Ton | warm / kurz / klar |
| Check-in-Intervall | 10–40 Min. |
| Erinnerungen | Browser-Notifications |
| Weicher Freeze | an/aus; Away-Nudges aus/einmal/wiederholen |
| Einführung-Button | auf der Oberfläche zeigen oder nur über Einstellungen |
| PWA-Anleitung | Install-Hinweise |
| **Handbuch** | dieses Handbuch in der App öffnen |

---

## 6. Geistesblitze

| Aktion | Beschreibung |
|--------|----------------|
| Parken | Notiz, Zeichnung oder kurze Sprachnotiz |
| Speicher | Ansehen erst nach erledigter/übersprungener **Arbeit** |
| Haltbarkeit | max. **7 Tage** |
| E-Mail (optional) | unter Einstellungen — nach 7 Tagen Zusendung, **dann** Löschen |
| Ohne E-Mail | nach 7 Tagen still löschen (beim nächsten Öffnen der App) |
| Löschen | im offenen Speicher pro Eintrag |
| Export | Kopieren, Textdatei, PDF, Audio |

Große Skizzen können die Mail-Grenze sprengen — dann Hinweis in der Mail, vorher in der App exportieren. Audio ist auf **60 Sekunden** begrenzt und wird in der Regel mitgeschickt.

Technik/Betrieb: [DEPLOY.md](./DEPLOY.md) (`RESEND_*` auf Vercel).

---

## 7. Runterregeln (Notfall)

Oben rechts: Button **„Ruhe“** — immer erreichbar (außer Einführung). Einmaliger Hinweis erklärt ihn.

Öffnet einen ruhigen Vollbild-Modus. Timer und Aufgaben sind ausgeblendet; im Fokus pausiert der Timer.

| Impuls | Inhalt |
|--------|--------|
| Atmen | Pulsierender Kreis (4 s ein / 6 s aus) |
| Sinne | 5-4-3-2-1-Impulse vom Buddy |
| Körper | Kühle ins Gesicht / Wasser / Hand auf die Brust |

**Ich bin wieder da** schließt den Modus. Der Timer bleibt pausiert — Fortsetzen ohne Druck.

---

## 8. Daten auf dem Gerät

- Alles lokal im Browser dieses Geräts
- Anderer Browser / Cache leeren = Daten weg (bis Sync existiert)
- Kein Account in der Testphase

Technik: [DATENMODELL.md](./DATENMODELL.md).
