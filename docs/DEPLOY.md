# Tagesanker — Deploy & Entwicklung

---

## Lokal

```bash
npm install
npm run dev       # Vite Dev-Server (API /api/* nur mit vercel dev)
npm run build     # tsc -b && vite build → dist/
npm run preview   # Build lokal prüfen
npm run lint      # oxlint
```

Ablauf-Mails lokal testen: `npx vercel dev` (braucht Env-Vars, siehe unten).

---

## One-Pager erzeugen

Quelle: [`docs/anker-onepager.html`](./anker-onepager.html)  
Skript: [`scripts/generate-onepager.mjs`](../scripts/generate-onepager.mjs)  
(Chrome oder Edge headless nötig)

```bash
node scripts/generate-onepager.mjs
```

Ausgabe: `docs/anker-onepager.pdf`

---

## Vercel

- Projekt deployt aus dem GitHub-Repo (Branch `main`)
- Build: Vite → `dist/`
- Serverless: [`api/send-expired-sparks.ts`](../api/send-expired-sparks.ts)
- [`vercel.json`](../vercel.json): Cache-Header für `sw.js`, Content-Type für Manifest
- **Live (interim):** https://anker-dun.vercel.app
- **Domains (gesichert):** `tagesanker.de`, `tagesanker.app`

Nach Push auf `main` typischerweise automatisches Deployment.

### Domains & Routen

1. Domains `tagesanker.de` / `tagesanker.app` an Vercel (**erledigt**)
2. **Marketing:** `/` Landing, `/blog`, `/preise` (Platzhalter), Legal (`/impressum`, `/datenschutz`, `/agb`, `/widerruf`)
3. **App (PWA):** `/app` — Manifest `start_url` / `scope` = `/app`
4. Resend-Versanddomain: `tagesanker.de` (`RESEND_FROM=Tagesanker <noreply@tagesanker.de>`)
5. Fallback-URLs: `anker-*.vercel.app` behalten

### Env-Vars (Geistesblitz-Mail)

| Variable | Beispiel | Pflicht |
|----------|----------|---------|
| `RESEND_API_KEY` | `re_...` | ja für Mail |
| `RESEND_FROM` | `Tagesanker <noreply@tagesanker.de>` | ja — Domain in Resend verifiziert |
| `SUPABASE_URL` | wie `VITE_SUPABASE_URL` | ja für Sync-OTP (Server) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | ja für Sync-OTP (nur Server, nie im Client) |

**Wenn Sync-Code fehlschlägt mit Domain-Hinweis:** In [Resend](https://resend.com) Domain `tagesanker.de` verifizieren und prüfen, dass `RESEND_API_KEY` zum **gleichen** Resend-Account gehört wie die Domain. Typischer API-Fehler: *API key is not authorized to send emails from tagesanker.de*.

Ohne diese Vars: API liefert 503; abgelaufene Geistesblitze mit gesetzter E-Mail bleiben in der App (kein stilles Löschen).

### Env-Vars (Geräte-Sync)

| Variable | Beispiel | Pflicht |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | `https://ueioxiffwfsgbmiowtew.supabase.co` | ja für Sync |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | ja für Sync |

Ohne diese Vars: App läuft lokal weiter; Sync-UI zeigt „nicht konfiguriert“. Setup: [`supabase/README.md`](../supabase/README.md).

### Env-Vars (Stripe — vorbereitet, Checkout öffentlich aus)

Siehe [`STRIPE.md`](./STRIPE.md). Kurz: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` / `_YEARLY`, **`STRIPE_CHECKOUT_ENABLED=false`** bis Preise live gehen. Optional `STRIPE_CHECKOUT_PREVIEW_TOKEN` für interne Tests.

### Env-Vars (Schublade — KI-Häppchen)

Gleiche Azure-OpenAI-Ressource wie Schwundbuch. API: `POST /api/chop-bites` (nur mit Opt-in in der App).

| Variable | Beispiel | Pflicht |
|----------|----------|---------|
| `AZURE_OPENAI_ENDPOINT` | `https://….openai.azure.com` | ja für KI |
| `AZURE_OPENAI_KEY` | Azure-Key | ja für KI |
| `AZURE_OPENAI_DEPLOYMENT` | z. B. `gpt-5-mini` | ja für KI |
| `AZURE_OPENAI_API_VERSION` | `2025-04-01-preview` | nein (Default wie Schwundbuch) |

Ohne diese Vars: App und manuelles Schneiden laufen; Button „Mit KI vorschlagen“ meldet „nicht eingerichtet“. Lokal: `npx vercel dev` (reine Vite-API nicht). Secrets nicht committen.

Siehe auch `.env.example`.

---

## PWA-Hinweise Betrieb

- Service Worker: `autoUpdate` (vite-plugin-pwa)
- Nach Deploy ggf. hart neu laden / SW aktualisieren lassen
- iOS: Install nur über Safari „Zum Home-Bildschirm“; Push eingeschränkt vs. Desktop/Android
- Nach Domain-Umzug: PWA ggf. neu zum Home-Bildschirm legen (andere Origin)

Siehe auch Install-UI in der App (`PwaGuide`).

---

## Repo

- https://github.com/thomaspeters0476-droid/anker
- Dokumentation: dieser Ordner [`docs/`](./README.md)
