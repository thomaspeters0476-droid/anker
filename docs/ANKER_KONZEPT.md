# Anker — Gesamtkonzept

**Produkt:** Fokus-Web-App · Tagline **„Eine Sache. Realistisch. Zurückfinden.“**  
**Live:** [anker-dun.vercel.app](https://anker-dun.vercel.app)  
**Stand:** Juli 2026 · **MVP / Testphase** (kostenlos, kein Login)

Dieses Dokument fasst Produkt, Haltung und Funktionen zusammen. Technik: [ARCHITEKTUR.md](./ARCHITEKTUR.md), [DATENMODELL.md](./DATENMODELL.md). Roadmap: [ANKER_ROADMAP.md](./ANKER_ROADMAP.md).

---

## Inhaltsverzeichnis

1. [Was ist Anker?](#1-was-ist-anker)
2. [Zielgruppe](#2-zielgruppe)
3. [Haltung & Leitprinzipien](#3-haltung--leitprinzipien)
4. [Tagesablauf](#4-tagesablauf)
5. [Arbeitsaufgaben & Kapazität](#5-arbeitsaufgaben--kapazität)
6. [Tagesgefühl](#6-tagesgefühl)
7. [Alltagsanker](#7-alltagsanker)
8. [Offenes mitnehmen](#8-offenes-mitnehmen)
9. [Fokus, Buddy, Check-ins](#9-fokus-buddy-check-ins)
10. [Geistesblitze & Feierabend](#10-geistesblitze--feierabend)
11. [Weicher Freeze](#11-weicher-freeze)
12. [PWA & Erinnerungen](#12-pwa--erinnerungen)
13. [Einführung](#13-einführung)
14. [Daten & Privatsphäre (kurz)](#14-daten--privatsphäre-kurz)
15. [Bewusst nicht in Scope (Testphase)](#15-bewusst-nicht-in-scope-testphase)
16. [Verwandte Docs](#16-verwandte-docs)

---

## 1. Was ist Anker?

Anker ist eine **Web-App für fokussiertes Tagesarbeiten** — ADHS-freundlich:

- wenig und realistisch planen
- **eine Sache** nach der anderen
- sanft **zurückfinden**, wenn die Aufmerksamkeit driftet

**Anker ≠ Produktivitäts-System:** Keine Scores, keine Streaks, keine Stimmungs-Historie, kein Wettbewerb mit sich selbst. Ziel ist Halt und Entlastung — nicht „mehr Output“.

---

## 2. Zielgruppe

Menschen, die:

- zu viel planen und den Berg nicht schaffen
- viel anfangen und schwer fertig werden
- externe Struktur / kurze Check-ins brauchen
- Alltag (Essen, Schlafen, Medikamente …) als gleichwertig zu „Arbeit“ brauchen

Primär Erwachsene mit ADHS oder ähnlichen Mustern; nutzbar auch ohne Diagnose.

---

## 3. Haltung & Leitprinzipien

| Prinzip | Bedeutung |
|---------|-----------|
| **Kapazitätsbremse** | Nicht den ganzen Berg auf den Tag legen |
| **Eine aktive Aufgabe** | Der Rest wartet absichtlich |
| **Alltag zählt** | Stabilität vor „nur Produktivität“ |
| **Entlasten, nicht bewerten** | Buddy-Sprache: warm / kurz / klar, ohne Schuld |
| **Daten lokal** | Gerät = Datenort (Testphase ohne Cloud) |

---

## 4. Tagesablauf

1. **Plan** — Tagesgefühl, Arbeitsaufgaben (S/M/L), Alltagsanker, Einstellungen  
2. **Fokus** — Timer, Check-ins, Geistesblitze, optional Freeze  
3. **Done** — Geschafft / Offen; „Neuen Tag planen“ übernimmt Offenes  

Reihenfolge im Fokus: zuerst **Arbeit**, dann **Alltag**.  
Wenn alle Arbeitsaufgaben erledigt oder übersprungen sind → **Feierabend-Modus** (Geistesblitzspeicher frei).

---

## 5. Arbeitsaufgaben & Kapazität

| Größe | Punkte | Minuten (Baseline) |
|-------|--------|--------------------|
| Klein | 1 | 15 |
| Mittel | 2 | 25 |
| Groß | 3 | 40 |

- Tagesdeckel: max. **8 Punkte**
- Hard-Caps pro Größe (z. B. max. 2× groß)
- Default-Baseline: 2× mittel + 2× klein (6 Punkte)
- Nur **Arbeit** zählt gegen die Punkt-Kapazität
- Einstellbar unten auf dem Plan-Screen

Details: Code in `src/capacity.ts`.

---

## 6. Tagesgefühl

Optionen: **Ziemlich gut** / **Geht so** / **Heute eher schwer**.

- skaliert Kapazität, Timer-Minuten und Alltags-Maximum
- gilt **nur heute** — keine Historie, keine Auswertung über Tage
- Buddy-Texte passen sich an (besonders bei „schwer“)

Details: `src/mood.ts`, [BUDDY.md](./BUDDY.md).

---

## 7. Alltagsanker

- zählen **nicht** in die Arbeitspunkte
- Default-Vorschläge (Hund, Essen, Schlafen, Medikamente, Bewegen, Post …)
- × am Chip blendet einen Vorschlag dauerhaft aus
- eigene Anker bleiben über Tage erhalten (`customLifeAnchors`)
- Max. einstellbar (Default 3, hart max. 5)

---

## 8. Offenes mitnehmen

Unfertige, aktive oder übersprungene Aufgaben werden gemerkt:

- beim **Kalenderwechsel** (neuer Tag beim Öffnen)
- bei **„Neuen Tag planen“** auf dem Done-Screen

Auf dem Plan erscheinen sie unter **„Noch offen“** — Übernehmen (soweit Kapazität) oder Verwerfen.

---

## 9. Fokus, Buddy, Check-ins

- nur die aktuelle Aufgabe prominent
- Timer je Größe (und Stimmung)
- periodische Check-ins (Intervall einstellbar, Default 20 Min.)
- Buddy-Ton: warm / kurz / klar
- kontextreichere Texte (Stimmung, Carry, nächste Aufgabe, Feierabend …) — lokal, ohne KI

Siehe [BUDDY.md](./BUDDY.md).

---

## 10. Geistesblitze & Feierabend

- Modi: Notiz / Skizze / Audio (kurz parken, dann zurück)
- Speicher erst öffnen, wenn **Arbeitsaufgaben** settled sind (Alltag sperrt nicht)
- Retention: max. **7 Tage** — optional E-Mail in den Einstellungen: erst zusenden, dann löschen; ohne E-Mail still löschen beim nächsten Öffnen
- Export: Kopieren, Text, PDF, Audio

---

## 10a. Runterregeln (Notfall)

Stets erreichbarer Button oben rechts. Ein Klick → ruhiger Vollbild-Modus (Atmen 4/6, Sinne 5-4-3-2-1, Körper-Impulse). Timer pausiert; **Ich bin wieder da** kehrt zurück ohne Bewertung.

---

## 11. Weicher Freeze

Beim Verlassen der App (Tab/Hintergrund):

- Timer pausiert (kein Reset der Restzeit)
- optionale sanfte Mitteilungen („Fokus wartet“) — Modus: aus / einmal / wiederholen
- Einstellungen unter Freeze auf dem Plan

---

## 12. PWA & Erinnerungen

- installierbar (Anleitung in der App: iPhone Safari / Android Chrome)
- Browser-Notifications: Check-in, Away, Feierabend, Schlaf-Anker
- zuverlässiger nach Installation / Berechtigung

---

## 13. Einführung

Vier Schritte beim ersten Start (Wenig planen / Eine Sache / Zurückfinden / Weicher Freeze).  
Erneut über „Einführung anzeigen“ auf dem Plan; Button in Einstellungen versteckbar.

---

## 14. Daten & Privatsphäre (kurz)

- Speicherung im **Browser** (`localStorage`) — kein Account in der Testphase
- kein serverseitiges Nutzerprofil
- Sync zwischen Geräten: geplant, noch nicht gebaut

Details: [DATENMODELL.md](./DATENMODELL.md).

---

## 15. Bewusst nicht in Scope (Testphase)

- kein Login / Cloud-Sync (noch)
- kein App-Store-Build (Capacitor o. Ä. später möglich)
- kein Abo / Paywall / Werbefrei-Argument in der UI (erst Verkaufsversion)
- kein KI-Buddy-Backend — Texte in `buddy.ts`
- keine Mood-/Produktivitäts-Historie, keine Scores

---

## 16. Verwandte Docs

- Nutzer: [ANKER_ERSTE_SCHRITTE.md](./ANKER_ERSTE_SCHRITTE.md), [ANKER_HANDBUCH.md](./ANKER_HANDBUCH.md)
- Planung: [ANKER_ROADMAP.md](./ANKER_ROADMAP.md)
- Technik: [ARCHITEKTUR.md](./ARCHITEKTUR.md), [DATENMODELL.md](./DATENMODELL.md), [DEPLOY.md](./DEPLOY.md)
- Marketing: [anker-onepager.pdf](./anker-onepager.pdf)
