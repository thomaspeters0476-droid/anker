# Tagesanker Android (TWA)

Trusted Web Activity um [tagesanker.de/app](https://tagesanker.de/app). Die App ist ein dünner Android-Wrapper — Inhalt kommt aus der Web-PWA.

## Voraussetzungen

- JDK 17 (`C:\Program Files\Java\jdk-17` oder `JAVA_HOME`)
- Android SDK (mit Platform 36 / Build-Tools)
- Node.js (für `bubblewrap update`, optional)

Bubblewrap-Config lokal: `%USERPROFILE%\.bubblewrap\config.json`

```json
{
  "jdkPath": "C:\\Program Files\\Java\\jdk-17",
  "androidSdkPath": "C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk"
}
```

## Debug-APK bauen

```bash
cd android
# einmalig, falls fehlend:
echo sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk > local.properties

gradlew.bat assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`  
(Kopie: `tagesanker-debug.apk` nach lokalem Build)

Oder vom Repo-Root: `npm run android:apk`

## Aufs Handy

1. USB-Debugging an, oder APK per Download
2. Installieren (unbekannte Quellen erlauben)
3. Öffnen → sollte `https://tagesanker.de/app` starten

Ohne gültige [Digital Asset Links](https://tagesanker.de/.well-known/assetlinks.json) zeigt Chrome oft noch die URL-Leiste — trotzdem nutzbar. Nach Deploy der `assetlinks.json` (Fingerprint = App-Signatur) wird es „fullscreen“.

## Projekt aus Manifest neu erzeugen

```bash
cd android
npx @bubblewrap/cli update --skipVersionUpgrade
```

Config: `twa-manifest.json`

## Wichtig

- Aktuelle Debug-APK ist mit dem **Android-Debug-Keystore** signiert (nur Tests).
- Für den Play Store später: eigenen Upload-Key anlegen, AAB bauen, Fingerprint in `assetlinks.json` ergänzen.
- `local.properties`, `*.apk`, `app/build/` nicht committen.
