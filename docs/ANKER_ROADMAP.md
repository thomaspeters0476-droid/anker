# Tagesanker — Roadmap

**Konzept:** [ANKER_KONZEPT.md](./ANKER_KONZEPT.md) · **Stand:** Juli 2026

Testphase = App **kostenlos**, ohne Paywall. Verkaufs-/Abo-Themen nur hier dokumentieren, **nicht** in der Nutzer-UI.

---

## Jetzt (MVP live)

- Plan → Fokus → Done
- Kapazität S/M/L, Caps, Alltagsanker (ausblendbar + eigene persistent)
- Tagesgefühl ohne Historie
- Carry-over („Noch offen“) inkl. „Neuen Tag planen“
- Geistesblitze (Notiz/Skizze/Audio), 7-Tage-Vault, Feierabend
- Weicher Freeze + optionale Away-Nudges
- PWA, Intro, Browser-Erinnerungen
- Kontextreicher Buddy (lokal, `BuddyCtx`) — siehe [BUDDY.md](./BUDDY.md)
- One-Pager unter `docs/`

---

## Als Nächstes

| Thema | Ziel |
|-------|------|
| ~~**Sync**~~ | ~~Einstellungen und Tagesstand zwischen Geräten~~ *(Magic Link + Supabase, optional)* |
| **Verkauf / Checkout** | Stripe vorbereitet ([STRIPE.md](./STRIPE.md), Checkout gated). Preise öffentlich + Paywall **noch nicht** — siehe [SPENDENTOPF.md](./SPENDENTOPF.md) |
| ~~Domains + Marketing~~ | ~~Domains, Landing/Blog, B2C-Rechtstexte~~ *(Juli 2026 erledigt)* |
| Buddy-Feinschliff | mehr Situationen abdecken, Ton beibehalten (entlasten) |
| Stabilität PWA | Notifications auf iOS/Android zuverlässiger nach Install |
| Doku/Prozess | CHANGELOG bei Releases pflegen |

---

## Später

| Thema | Hinweis |
|-------|---------|
| **Verkaufsversion / Abo** | Ziel: ca. **3,99 €/Monat**, **39 €/Jahr**, **7 Tage Trial**. Botschaft: Geld statt Werbung/Datenhandel. Spendentopf: 5 % Brutto + Mehrzahlung → Sozialzugänge, Überschuss → Forschung ([SPENDENTOPF.md](./SPENDENTOPF.md)). **Erst dann in UI/Marketing** |
| Store-Wrapper | z. B. Capacitor (u. a. M1-Mac-Build) |
| Optional KI-Buddy | opt-in, kurz, entlastend — Kosten/Datenschutz klären |
| Datenschutz-Paket | wenn Cloud/Sync: TOMs, AVV, Impressum-Anbindung |

---

## Bewusst zurückgestellt

- Scores, Streaks, Leaderboards
- Mood-Historie / „Produktivitäts-Reports“
- Werbung in der App
- Soziales / Buddy-zu-Buddy-Chat als Pflicht

---

## Entscheidungslog

| Datum | Entscheidung |
|-------|----------------|
| Jul 2026 | Öffentlicher Name **Tagesanker** (UI/PWA); Domains tagesanker.de / .app |
| Jul 2026 | Domains **tagesanker.de** + **tagesanker.app** gesichert |
| Jul 2026 | Marketing-Site `/` + App `/app`, Blog, Impressum/Datenschutz/AGB/Widerruf (B2C); Preise-Seite noch ohne Beträge |
| Jul 2026 | Test gratis; Abo-Kommunikation erst Verkaufsversion |
| Jul 2026 | Sync vor Preiserhöhung / 3,99er-Story |
| Jul 2026 | Buddy zuerst kontextreich lokal, KI optional später |
| Jul 2026 | Dokuhub analog Schwundbuch (`docs/`) |
| Jul 2026 | Preisziel **3,99 / 39**; Preisbotschaft: Abo statt Werbung/Datenhandel; Spendentopf ([SPENDENTOPF.md](./SPENDENTOPF.md)): 5 % Brutto + Mehrzahlung vorrangig Sozialzugänge, Jahresüberschuss (nach Reserve) → ADHS-Forschung; Internbericht später auto, Öffentlich-Bericht manuell |
