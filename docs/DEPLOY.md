# Anker — Deploy & Entwicklung

---

## Lokal

```bash
npm install
npm run dev       # Vite Dev-Server
npm run build     # tsc -b && vite build → dist/
npm run preview   # Build lokal prüfen
npm run lint      # oxlint
```

Voraussetzungen: Node.js (aktuell getestet mit aktuellen LTS/Current-Versionen).

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
- [`vercel.json`](../vercel.json): Cache-Header für `sw.js`, Content-Type für Manifest
- Live: https://anker-dun.vercel.app

Nach Push auf `main` typischerweise automatisches Deployment.

---

## PWA-Hinweise Betrieb

- Service Worker: `autoUpdate` (vite-plugin-pwa)
- Nach Deploy ggf. hart neu laden / SW aktualisieren lassen
- iOS: Install nur über Safari „Zum Home-Bildschirm“; Push eingeschränkt vs. Desktop/Android

Siehe auch Install-UI in der App (`PwaGuide`).

---

## Repo

- https://github.com/thomaspeters0476-droid/anker
- Dokumentation: dieser Ordner [`docs/`](./README.md)
