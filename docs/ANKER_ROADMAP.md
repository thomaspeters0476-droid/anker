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
| **Schublade** | Basis + KI + Runden + **Fristen** (5d/1d). Cap einstellbar / Buddy-Feinschliff folgen ([SCHUBLADE.md](./SCHUBLADE.md)) |
| **Verkauf / Checkout** | Stripe vorbereitet ([STRIPE.md](./STRIPE.md), Checkout gated). Preise öffentlich + Paywall **noch nicht** — siehe [SPENDENTOPF.md](./SPENDENTOPF.md) |
| ~~Domains + Marketing~~ | ~~Domains, Landing/Blog, B2C-Rechtstexte~~ *(Juli 2026 erledigt)* |
| Buddy-Feinschliff | mehr Situationen abdecken, Ton beibehalten (entlasten) |
| Stabilität PWA | Notifications auf iOS/Android zuverlässiger nach Install |
| ~~App Tablet/Desktop~~ | ~~Shell breiter, gleiches Design (Sync)~~ *(Juli 2026)* |
| Doku/Prozess | CHANGELOG bei Releases pflegen |

---

## Später

| Thema | Hinweis |
|-------|---------|
| **Verkaufsversion / Abo** | Anker-Ziel: ca. **3,99 €/Monat**, **39 €/Jahr**, **7 Tage Trial**. **Schublade kostet** (eigenes Abo); **Bundle Beides günstiger als Summe**. Spendentopf wie gehabt ([SPENDENTOPF.md](./SPENDENTOPF.md)). Beträge Schublade/Bundle noch offen. **Erst dann in UI/Marketing** |
| Store-Wrapper | z. B. Capacitor; **eine Store-App**, Module per IAP (Tagesanker / Schublade / Bundle) — siehe [SCHUBLADE.md](./SCHUBLADE.md) §12a/b |
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
| Jul 2026 | **Schublade**-Konzept fest: KI-Zerkleinerung zentral; Runden unbegrenzt; Cap einstellbar (Default 25); Fristen 5d/1d; Ketten nicht einfach streichen ([SCHUBLADE.md](./SCHUBLADE.md)) |
| Jul 2026 | Optional KI-Buddy (Roadmap „Später“) ≠ Schubladen-KI-Häppchen — Häppchen-KI ist für das Modul Pflichtmerkmal |
| Jul 2026 | App-UI Tablet/Desktop: breitere Shell (bis ~820px), Design/Farben unverändert — Sync-Nutzung |
| Aug 2026 | Produkt: Tagesanker & Schublade **einzeln** vermarktbar; bei Beides **eine UI**; Store-Ziel **eine App + IAP-Module** (zwei Store-Apps nur Ausnahme) |
| Aug 2026 | Schublade **immer kostenpflichtig**; Bundle **günstiger als Einzelkauf** (Euro-Beträge später) |
