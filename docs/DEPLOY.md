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

Ohne diese Vars: API liefert 503; abgelaufene Geistesblitze mit gesetzter E-Mail bleiben in der App (kein stilles Löschen).

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
