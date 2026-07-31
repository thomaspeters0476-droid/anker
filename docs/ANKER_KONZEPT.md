# Tagesanker — Gesamtkonzept

**Produkt:** Fokus-Web-App · Marke **Tagesanker** · Tagline **„Eine Sache. Realistisch. Zurückfinden.“**  
**Domains:** [tagesanker.de](https://tagesanker.de) · [tagesanker.app](https://tagesanker.app) *(gesichert)*  
**Live (interim):** [anker-dun.vercel.app](https://anker-dun.vercel.app)  
**Stand:** Juli 2026 · **MVP / Testphase** (kostenlos, kein Login)

Dieses Dokument fasst Produkt, Haltung und Funktionen zusammen. Technik: [ARCHITEKTUR.md](./ARCHITEKTUR.md), [DATENMODELL.md](./DATENMODELL.md). Roadmap: [ANKER_ROADMAP.md](./ANKER_ROADMAP.md).

---

## Inhaltsverzeichnis

1. [Was ist Tagesanker?](#1-was-ist-tagesanker)
2. [Marke & Domain](#2-marke--domain)
3. [Zielgruppe](#3-zielgruppe)
4. [Haltung & Leitprinzipien](#4-haltung--leitprinzipien)
5. [Tagesablauf](#5-tagesablauf)
6. [Arbeitsaufgaben & Kapazität](#6-arbeitsaufgaben--kapazität)
7. [Tagesgefühl](#7-tagesgefühl)
8. [Alltagsanker](#8-alltagsanker)
9. [Offenes mitnehmen](#9-offenes-mitnehmen)
10. [Fokus, Buddy, Check-ins](#10-fokus-buddy-check-ins)
11. [Geistesblitze & Feierabend](#11-geistesblitze--feierabend)
12. [Runterregeln (Notfall)](#12-runterregeln-notfall)
13. [Weicher Freeze](#13-weicher-freeze)
14. [PWA & Erinnerungen](#14-pwa--erinnerungen)
15. [Einführung](#15-einführung)
16. [Daten & Privatsphäre (kurz)](#16-daten--privatsphäre-kurz)
17. [Bewusst nicht in Scope (Testphase)](#17-bewusst-nicht-in-scope-testphase)
18. [Verwandte Docs](#18-verwandte-docs)

---

## 1. Was ist Tagesanker?

**Tagesanker** ist eine **Web-App für fokussiertes Tagesarbeiten** — ADHS-freundlich:

- wenig und realistisch planen
- **eine Sache** nach der anderen
- sanft **zurückfinden**, wenn die Aufmerksamkeit driftet

**Tagesanker ≠ Produktivitäts-System:** Keine Scores, keine Streaks, keine Stimmungs-Historie, kein Wettbewerb mit sich selbst. Ziel ist Halt und Entlastung — nicht „mehr Output“.

---

## 2. Marke & Domain

| | |
|---|---|
| **Marke / App-Name** | **Tagesanker** (UI, PWA, Home-Bildschirm, Mails) |
| **Kurzform** | „Anker“ darf in Buddy-Texten oder Alltagsanker-Metapher vorkommen |
| **Öffentliche Domains** | **tagesanker.de**, **tagesanker.app** (beide gesichert) |
| **Deploy heute** | Vercel-URL bis DNS umgestellt ist |

Beide Domains zeigen auf dasselbe Deployment (`.app` oft für die PWA-Story, `.de` für den deutschsprachigen Einstieg).

Details DNS/Vercel: [DEPLOY.md](./DEPLOY.md).

---

## 3. Zielgruppe

Menschen, die:

- zu viel planen und den Berg nicht schaffen
- viel anfangen und schwer fertig werden
- externe Struktur / kurze Check-ins brauchen
- Alltag (Essen, Schlafen, Medikamente …) als gleichwertig zu „Arbeit“ brauchen

Primär Erwachsene mit ADHS oder ähnlichen Mustern; nutzbar auch ohne Diagnose.

---

## 4. Haltung & Leitprinzipien

| Prinzip | Bedeutung |
|---------|-----------|
| **Kapazitätsbremse** | Nicht den ganzen Berg auf den Tag legen |
| **Eine aktive Aufgabe** | Der Rest wartet absichtlich |
| **Alltag zählt** | Stabilität vor „nur Produktivität“ |
| **Entlasten, nicht bewerten** | Buddy-Sprache: warm / kurz / klar, ohne Schuld |
| **Daten lokal** | Gerät = Datenort (Testphase ohne Cloud) |

---

## 5. Tagesablauf

1. **Plan** — Tagesgefühl, Arbeitsaufgaben (S/M/L), Alltagsanker, Einstellungen  
2. **Fokus** — Timer, Check-ins, Geistesblitze, optional Freeze  
3. **Done** — Geschafft / Offen; „Neuen Tag planen“ übernimmt Offenes  

Reihenfolge im Fokus: zuerst **Arbeit**, dann **Alltag**.  
Wenn alle Arbeitsaufgaben erledigt oder übersprungen sind → **Feierabend-Modus** (Geistesblitzspeicher frei).

---

## 6. Arbeitsaufgaben & Kapazität

| Größe | Punkte | Minuten (Baseline) |
|-------|--------|--------------------|
| Klein | 1 | 15 |
| Mittel | 2 | 25 |
| Groß | 3 | 40 |

- Tagesdeckel: max. **16 Punkte**
- Hard-Caps pro Größe (z. B. max. 2× groß)
- Default-Baseline: **4× klein + 3× mittel + 1× groß** (13 Punkte) — genug für einen Arbeitstag; Stimmung skaliert bei schweren Tagen runter
- Nur **Arbeit** zählt gegen die Punkt-Kapazität
- Einstellbar unten auf dem Plan-Screen

Details: Code in `src/capacity.ts`.

---

## 7. Tagesgefühl

Optionen: **Ziemlich gut** / **Geht so** / **Heute eher schwer**.

- skaliert Kapazität, Timer-Minuten und Alltags-Maximum
- gilt **nur heute** — keine Historie, keine Auswertung über Tage
- Buddy-Texte passen sich an (besonders bei „schwer“)

Details: `src/mood.ts`, [BUDDY.md](./BUDDY.md).

---

## 8. Alltagsanker

- zählen **nicht** in die Arbeitspunkte
- Default-Vorschläge (Hund, Essen, Schlafen, Medikamente, Bewegen, Post …)
- × am Chip blendet einen Vorschlag dauerhaft aus
- eigene Anker bleiben über Tage erhalten (`customLifeAnchors`)
- Max. einstellbar (Default 3, hart max. 5)

---

## 9. Offenes mitnehmen

Unfertige, aktive oder übersprungene Aufgaben werden gemerkt:

- beim **Kalenderwechsel** (neuer Tag beim Öffnen)
- bei **„Neuen Tag planen“** auf dem Done-Screen

Auf dem Plan erscheinen sie unter **„Noch offen“** — Übernehmen (soweit Kapazität) oder Verwerfen.

---

## 10. Fokus, Buddy, Check-ins

- nur die aktuelle Aufgabe prominent
- Timer je Größe (und Stimmung)
- periodische Check-ins (Intervall einstellbar, Default 20 Min.)
- Buddy-Ton: warm / kurz / klar
- kontextreichere Texte (Stimmung, Carry, nächste Aufgabe, Feierabend …) — lokal, ohne KI

Siehe [BUDDY.md](./BUDDY.md).

---

## 11. Geistesblitze & Feierabend

- Modi: Notiz / Skizze / Audio (kurz parken, dann zurück)
- Speicher erst öffnen, wenn **Arbeitsaufgaben** settled sind (Alltag sperrt nicht)
- Retention: max. **7 Tage** — optional E-Mail in den Einstellungen: erst zusenden, dann löschen; ohne E-Mail still löschen beim nächsten Öffnen
- Export: Kopieren, Text, PDF, Audio

---

## 12. Runterregeln (Notfall)

Stets erreichbarer Button oben rechts. Ein Klick → ruhiger Vollbild-Modus (Atmen 4/6, Sinne 5-4-3-2-1, Körper-Impulse). Timer pausiert; **Ich bin wieder da** kehrt zurück ohne Bewertung.

---

## 13. Weicher Freeze

Beim Verlassen der App (Tab/Hintergrund):

- Timer pausiert (kein Reset der Restzeit)
- optionale sanfte Mitteilungen („Fokus wartet“) — Modus: aus / einmal / wiederholen
- Einstellungen unter Freeze auf dem Plan

---

## 14. PWA & Erinnerungen

- installierbar (Anleitung in der App: iPhone Safari / Android Chrome)
- Browser-Notifications: Check-in, Away, Feierabend, Schlaf-Anker
- zuverlässiger nach Installation / Berechtigung

---

## 15. Einführung

Sechs Schritte beim ersten Start:

1. **Kurzer Morgen** (Standard) — Stimmung, Offenes, Start; Rest unter „Noch etwas planen“  
2. **Oder der volle Plan** — alles auf einen Blick; Wechsel unter Einstellungen → „Kurzer Morgen“  
3. Eine Sache  
4. Zurückfinden  
5. Weicher Freeze  
6. Ruhe-Button  

Erneut über „Einführung anzeigen“ (Einstellungen / Plan, falls sichtbar).

---

## 16. Daten & Privatsphäre (kurz)

- Speicherung im **Browser** (`localStorage`) — kein Account in der Testphase
- kein serverseitiges Nutzerprofil
- Sync zwischen Geräten: geplant, noch nicht gebaut

Details: [DATENMODELL.md](./DATENMODELL.md).

---

## 17. Bewusst nicht in Scope (Testphase)

- kein Login / Cloud-Sync (noch)
- kein App-Store-Build (Capacitor o. Ä. später möglich)
- kein Abo / Paywall / Werbefrei-Argument in der UI (erst Verkaufsversion)
- kein KI-Buddy-Backend — Texte in `buddy.ts`
- keine Mood-/Produktivitäts-Historie, keine Scores

---

## 18. Verwandte Docs

- Nutzer: [ANKER_ERSTE_SCHRITTE.md](./ANKER_ERSTE_SCHRITTE.md), [ANKER_HANDBUCH.md](./ANKER_HANDBUCH.md)
- Planung: [ANKER_ROADMAP.md](./ANKER_ROADMAP.md)
- Geplant: [SCHUBLADE.md](./SCHUBLADE.md) — Vorrat, Zerkleinerung, Runden *(Konzept, noch nicht in der App)*
- Technik: [ARCHITEKTUR.md](./ARCHITEKTUR.md), [DATENMODELL.md](./DATENMODELL.md), [DEPLOY.md](./DEPLOY.md)
- Marketing: [anker-onepager.pdf](./anker-onepager.pdf)
