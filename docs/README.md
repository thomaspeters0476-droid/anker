# Anker — Dokuhub

Zentrale Dokumentation für Produkt, Nutzer und Technik.  
Bei neuen Features: passende Spec hier pflegen und [`CHANGELOG.md`](./CHANGELOG.md) ergänzen.

| | |
|---|---|
| **Live** | https://anker-dun.vercel.app |
| **Repo** | https://github.com/thomaspeters0476-droid/anker |
| **Status** | MVP / Testphase — kostenlos, kein Abo in der App |
| **Stand** | Juli 2026 |

---

## Produkt

| Dokument | Inhalt |
|----------|--------|
| [ANKER_KONZEPT.md](./ANKER_KONZEPT.md) | Zweck, Haltung, Features, Abgrenzung, Scope |
| [ANKER_ROADMAP.md](./ANKER_ROADMAP.md) | Jetzt / als Nächstes / später (Sync, Verkaufsversion) |
| [anker-onepager.pdf](./anker-onepager.pdf) | Ein-Seiten-Überblick (Marketing) · Quelle: [anker-onepager.html](./anker-onepager.html) |

## Nutzer

| Dokument | Inhalt |
|----------|--------|
| [ANKER_ERSTE_SCHRITTE.md](./ANKER_ERSTE_SCHRITTE.md) | Schnelleinstieg (PWA, Plan, Fokus) |
| [ANKER_HANDBUCH.md](./ANKER_HANDBUCH.md) | Alle Funktionen im Detail (auch in der App unter Einstellungen) |

## Technik

| Dokument | Inhalt |
|----------|--------|
| [ARCHITEKTUR.md](./ARCHITEKTUR.md) | Screens, Module, Ablauf |
| [DATENMODELL.md](./DATENMODELL.md) | DayState, Prefs, localStorage, Retention |
| [BUDDY.md](./BUDDY.md) | Ton, Kontext (`BuddyCtx`), Regeln |
| [DEPLOY.md](./DEPLOY.md) | Lokal, Vercel, PWA, One-Pager-Skript |
| [CHANGELOG.md](./CHANGELOG.md) | Release-Historie |

---

## Einstieg für Entwickler

1. Root-[`README.md`](../README.md) lesen  
2. [`ARCHITEKTUR.md`](./ARCHITEKTUR.md) + [`DATENMODELL.md`](./DATENMODELL.md)  
3. Lokal: siehe [`DEPLOY.md`](./DEPLOY.md)

## Später ergänzen (wenn nötig)

Neue Themen als eigene Dateien in `docs/`, Index hier verlinken — z. B. `ANKER_SYNC.md`, `ANKER_ABO.md`, `DATENSCHUTZ.md`, `SECURITY.md`.
