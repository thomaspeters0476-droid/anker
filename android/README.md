# Tagesanker Android (Capacitor)

```bash
# Repo-Root
npm run android:sync    # Web bauen + in android/ kopieren
npm run android:open    # Android Studio
npm run android:apk     # Debug-APK
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

**JDK:** Microsoft OpenJDK **21** (LTS) — in `gradle.properties` als `org.gradle.java.home` gesetzt. Zusätzlich ist OpenJDK **25** installiert (`C:\Program Files\Microsoft\jdk-25.0.4.7-hotspot`), falls du die neueste JVM brauchst.

Ausführlich (auch für andere Projekte): [`docs/CAPACITOR.md`](../docs/CAPACITOR.md)

Alte Bubblewrap-Hülle: [`android-twa/`](../android-twa/).
