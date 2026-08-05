# Capacitor → Play Store / App Store (Wiederverwendbar)

Kurzanleitung für **dieses** und **weitere** Projekte: PWA/Web-App als Store-App mit Capacitor.

## Wann Capacitor?

- Du willst **Android und später iOS** aus einer Codebasis.
- Die App soll sich „echter“ anfühlen (Startbildschirm, Statusleiste, lokale Erinnerungen).
- Die Website/PWA im Browser bleibt parallel bestehen.

Nicht nötig, wenn nur Android-Vollbild der Live-Website reicht (dann Bubblewrap/TWA).

## Voraussetzungen (pro Rechner)

- **JDK 21+** (Capacitor 8) — empfohlen Microsoft OpenJDK 21 LTS
- Android Studio / Android SDK
- Für iOS später: Mac + Xcode

Windows (winget):

```bash
winget install Microsoft.OpenJDK.21
```

`JAVA_HOME` auf JDK 21 setzen.

## Zwei Apps in diesem Repo

| | Tagesanker | Die Schublade |
|--|--|--|
| Ordner | `android/` | `android-schublade/` |
| appId | `de.tagesanker.app` | `de.tagesanker.schublade` |
| Start | `#/app` | `#/schublade` |
| Build | `npm run android:apk` | `npm run android:schublade:apk` |

Steuerung: `NATIVE_PRODUCT` (Capacitor-Config) + `VITE_NATIVE_PRODUCT` (Vite, Mode `schublade` → `.env.schublade`).

### Abrechnung (wichtig)

- Freischaltung hängt am **Sync-Konto** (E-Mail) + Stripe-Tier, **nicht** an der App-ID.
- Nur Tagesanker-Abo → nur Tagesanker-App. Nur Schublade-Abo → nur Schublade-App. **Bundle** → beide.
- Zwei Store-Apps schaffen **keinen** kostenlosen Doppelzugang.
- Checkout weiter über `tagesanker.de` / bestehende API (`product`: `tagesanker` \| `schublade` \| `bundle`).

### Scripts

| Befehl | Zweck |
|--------|--------|
| `npm run build:native` | Web-Build Tagesanker (`VITE_NATIVE_PRODUCT` default) |
| `npm run build:native:schublade` | Web-Build Schublade |
| `npm run android:sync` / `android:apk` | Tagesanker sync / Debug-APK |
| `npm run android:schublade:sync` / `android:schublade:apk` | Schublade sync / Debug-APK |
| `npm run android:schublade:open` | Android Studio (Schublade) |

Alte Bubblewrap-Hülle: `android-twa/`.

## Einmalig: Schublade-Android anlegen

```bash
npm run build:native:schublade
node scripts/cap-with-product.mjs schublade add android
```

Erzeugt `android-schublade/`. Danach `npm run android:schublade:apk`.

## Play Store (kurz, später)

1. Eigenes Listing pro App-ID, eigener Signing-Key / AAB.
2. Datenschutz-URL: `https://tagesanker.de/datenschutz`.
3. Release-SHA-256 in `assetlinks.json` (pro App-Zertifikat).
4. Vor öffentlichem Release: Stripe-Web-Checkout vs. Play Billing policy klären.

## iOS später

```bash
npm i -D @capacitor/ios
# je Produkt NATIVE_PRODUCT setzen, dann:
node scripts/cap-with-product.mjs anker add ios
node scripts/cap-with-product.mjs schublade add ios
```

## Typische Stolpersteine

- Relative `/api`-Calls in der APK → 404 (Origin ist nicht die Website) → `apiUrl()`.
- Service Worker + Store-Build → veraltete UI (native: kein SW).
- Android WebView: Vite `build.target: 'es2019'`, sonst weißer Screen.
- Falsches Produkt gebaut: Startroute stimmt nicht → Mode/`NATIVE_PRODUCT` prüfen.
