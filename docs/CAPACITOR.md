# Capacitor → Play Store / App Store (Wiederverwendbar)

Kurzanleitung für **dieses** und **weitere** Projekte: PWA/Web-App als Store-App mit Capacitor.

## Wann Capacitor?

- Du willst **Android und später iOS** aus einer Codebasis.
- Die App soll sich „echter“ anfühlen (Startbildschirm, Statusleiste, lokale Erinnerungen).
- Die Website/PWA im Browser bleibt parallel bestehen.

Nicht nötig, wenn nur Android-Vollbild der Live-Website reicht (dann Bubblewrap/TWA).

## Voraussetzungen (pro Rechner)

- **JDK 21+** (Capacitor 8) — empfohlen Microsoft OpenJDK 21 LTS; optional auch JDK 25
- Android Studio / Android SDK
- Für iOS später: Mac + Xcode

Windows (winget):

```bash
winget install Microsoft.OpenJDK.21
# optional neueste LTS:
winget install Microsoft.OpenJDK.25
```

Dann `JAVA_HOME` auf JDK 21 setzen und ggf. in `android/gradle.properties`:

`org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-21.…-hotspot`

## Einmalig pro Projekt

1. Web-App baut nach `dist/` (`vite` o.ä.).
2. Packages:

```bash
npm i @capacitor/core @capacitor/app @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/local-notifications
npm i -D @capacitor/cli @capacitor/android
# später iOS (nur macOS): npm i -D @capacitor/ios && npx cap add ios
```

3. `capacitor.config.ts` — `appId` (z.B. `de.firma.app`), `appName`, `webDir: 'dist'`.
4. Native Build mit relativen Assets: `vite build --base ./`
5. API: Im Browser relative `/api/...`, **in der Store-App absolute URLs** zur Live-Domain (sonst findet die App kein Backend). Pattern: `apiUrl()` wie in `src/native/platform.ts`.
6. Service Worker in der nativen App **nicht** registrieren.
7. `npx cap add android` → Ordner `android/`
8. `npm run android:sync` (Build + `cap sync`)
9. Android Studio öffnen: `npx cap open android` → Run auf Gerät/Emulator.

## Tagesanker-Scripts

| Befehl | Zweck |
|--------|--------|
| `npm run build:native` | Web-Build für Capacitor (`base ./`) |
| `npm run android:sync` | Build + Sync in `android/` |
| `npm run android:open` | Android Studio |
| `npm run android:apk` | Debug-APK bauen |

Alte Bubblewrap-Hülle liegt unter `android-twa/` (nur Referenz).

## Play Store (kurz)

1. Eigener Upload-/Signing-Key (nicht der Debug-Keystore).
2. In Android Studio: **Build → Generate Signed Bundle / APK** → AAB.
3. Play Console: App anlegen, AAB hochladen, Store-Texte, Datenschutz-URL (`https://tagesanker.de/datenschutz`).
4. SHA-256 des **Release**-Zertifikats in `public/.well-known/assetlinks.json` eintragen (Deep Links / verifizierte Domain).

## iOS später

```bash
npm i -D @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

Braucht Mac + Apple Developer Account. Dieselbe Web-`dist/` und dieselben Native-Hooks.

## Schublade / zweite App

Zweites Capacitor-Projekt oder zweites `appId` + eigener Android-Ordner — nicht in dieselbe Store-Listing packen. Zuerst Tagesanker stabil, dann kopieren.

## Typische Stolpersteine

- Relative `/api`-Calls in der APK → 404 (Origin ist nicht die Website).
- Service Worker + Store-Build → veraltete UI.
- Android WebView: Build-Target mindestens so alt wie die älteste Test-WebView (`es2019` im Vite-Build), sonst weißer Screen (`||=` SyntaxError).
