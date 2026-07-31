# Die Schublade — Produktkonzept

**Modul:** Schublade (Job-Tresor & Denk-Werkstatt)  
**Produkt:** Tagesanker  
**Stand:** 31. Juli 2026 · **erste Basis in der App** (manuell; KI-Häppchen / Runden / Fristen-Phasen folgen)  
**Quelle / Feinkonzept-Rohfassung:** [`Wünsche/die schublade.docx`](./Wünsche/die%20schublade.docx)

Verwandt: [ANKER_KONZEPT.md](./ANKER_KONZEPT.md) · [BUDDY.md](./BUDDY.md) · [ANKER_ROADMAP.md](./ANKER_ROADMAP.md) · [DATENMODELL.md](./DATENMODELL.md)

---

## 1. Zweck

Die **Schublade** ist der sichere Aufbewahrungsort für berufliche und private Pflichten, Ideen und Vorhaben, die **nicht für den aktuellen Anker-Moment** bestimmt sind.

| Ziel | Bedeutung |
|------|-----------|
| Druck raus | Der Tagesanker bleibt dünn und machbar |
| Angst vor dem Vergessen weg | Alles ist dokumentiert, nichts muss im Kopf kreisen |
| Freeze vermeiden | Kein Anblick von 50 gleichwertigen To-dos auf dem Tag |
| Arbeit ermöglichen | Über **Runden** kann an guten Tagen beliebig nachgelegt werden |

**Faustregeln**

1. **Zerkleinern füllt die Schublade, nie den Anker.** KI-Zerkleinerung ist Zentralmerkmal.  
2. **Kleine Runden, beliebig oft — Ende entscheidet der Mensch.**  
3. **Nie heimlich löschen.** Nichts verschwindet ohne bewusste Nutzeraktion.  
4. **Ketten-Glieder nicht einfach streichen** — Dialog / Gesamtvorhaben.  
5. **Ohne Schublade bleibt der Tagesanker wie heute** (ein Plan pro Tag, kein Runden-Modus).

---

## 2. Abgrenzung zum heutigen Tagesanker

| Heute (ohne Schublade) | Mit Schublade |
|------------------------|---------------|
| Plan → Fokus → Done | Gleicher Kern; Schublade als Vorrat daneben |
| Aufgaben entstehen auf dem Tag | Vorrat in der Schublade; Tag holt nur die aktuelle Runde |
| Carry = unerledigt von gestern | Carry bleibt für *heutige* Restposten; Schublade = längerfristiger Tresor |
| Geistesblitze: 7-Tage-Vault | Feierabend: Blitze → Papierkorb oder **Eingang** der Schublade |
| Soft Freeze = Fokus-Pause | ≠ Ebene „Eingefroren“ (Someday-Archiv) |
| Keine Runden-Frage | Nach erledigter Runde: Feierabend oder noch eine Runde |

Runden, „Aus Schublade holen“, Zerkleinerungs-Cap und Schubladen-Buddy gelten **nur**, wenn das Modul Schublade verfügbar/aktiv ist. Sonst unverändertes Verhalten.

---

## 3. Name & Haltung

| | |
|---|---|
| **Produktname** | **Die Schublade** |
| **Metaphern (Text)** | Job-Tresor, Denk-Werkstatt — erklären, ersetzen den Namen nicht |
| **Kein** | Ordnerbaum, A/B/C-Prios, Score, Streak, heimisches „Aufräumen“ durch die App |

Die Schublade darf alltagssprachlich an „weglegen“ erinnern — die App kontert das mit Wiedervorlage, Fristen, Buddy und bewusstem Verwerfen.

---

## 4. Die vier Gefühlsebenen

Keine klassischen Ordner. Vier **auf-/zuklappbare** Zustände:

### 4.1 Eingangs-Fach (Neu / Unsortiert)

- Schnell-Drop ohne Pflichtfelder (kein Datum, keine Kategorie).
- Quellen u. a.: manuell, Feierabend-Sichtung der Geistesblitze, später Filter-App („Als Aufgabe parken“).
- Oben in der Schublade; Buddy hilft kurz beim Sichten.
- Hier liegen oft noch **Brocken** (unzerschnitten).

### 4.2 Bereit für den Anker (Häppchen)

- Nur **sofort anpackbare** Schritte, typisch **ca. 5–30 Minuten**.
- Optional nach Energie: z. B. Mini / Fokus.
- **Das ist der Pool für „Aus Schublade holen“** und für Runden.
- Soft-Cap: siehe [§7 Vorratsschutz](#7-vorratsschutz-bereit-cap).

### 4.3 Aufschub & Fristen

| Unterbereich | Zweck |
|--------------|--------|
| **Sanfter Aufschub** | Wiedervorlage-Datum — bis dahin in der Schubladen-Ansicht unsichtbar (nicht gelöscht) |
| **Wartet auf …** | Ball bei jemand anderem; verhindert gedankliches Feststecken |
| **Harte Fristen** | Echte Deadlines; 3-Phasen-System (siehe §6) |

### 4.4 Eingefroren (Ideen-Archiv / Someday)

- „Irgendwann vielleicht“ — standardmäßig **komplett eingeklappt**.
- Bleibt erhalten, belastet das Sehfeld nicht.
- Zählt **nicht** gegen das Bereit-Cap.

---

## 5. Zerkleinerung (Kernfunktion)

Zerkleinerung ist **zentral**, nicht optional für den Weg auf den Anker.

### 5.1 Regeln

- Unzerkleinerte **Brocken** dürfen **nicht** blind auf den Tagesanker.
- Zerlegen erzeugt eine **Kette**: Parent-Brocken + Häppchen 1…n.
- Auf den Anker kommt typischerweise nur der **nächste** holbare Schritt; Rest bleibt in der Schublade.
- Default nach dem Schneiden: oft nur **Schritt 1** ist sofort „Bereit“; 2…n folgen, wenn der Vorgänger erledigt ist — oder der Nutzer schaltet bewusst frei. So quillt „Bereit“ nicht mit der ganzen Zerlegung über.

### 5.2 Wege — KI ist Zentralmerkmal

| Weg | Rolle |
|-----|--------|
| **KI: „In Häppchen schneiden“** | **Zentrales Merkmal** der Schublade — Primärweg zum Zerlegen |
| **Manuell** | Fallback (offline, Ablehnung, Nachjustieren); gleiche Regeln |

Ohne brauchbare KI-Zerkleinerung ist das Modul unvollständig. Manuell allein reicht nicht als Zielbild.  
Opt-in / Datenschutz / Anbieter bei Anbindung klären; die Produktregel gilt unabhängig davon.

Beispiel: „Nebenkostenabrechnung vorbereiten“ → Ordner holen (2 Min) → Zahlen tippen (15 Min) → Ausdrucken & Mail (5 Min).

### 5.3 Im Overlay „Aus Schublade holen“

Liegt noch ein Brocken in der Auswahl: nicht direkt auf den Anker — Button **„Erst in Häppchen schneiden“**. Nutzer wählt z. B. Schritt 1 → auf den Anker; 2 und 3 bleiben in der Schublade.

---

## 6. Harte Fristen (3 Phasen) — fest

Damit Fristen nicht vergessen werden, aber keine Dauerpanik entsteht:

| Phase | Wann | Verhalten |
|-------|------|-----------|
| **1 Schlummern** | mehr als **5 Tage** vor Frist | Im Hintergrund; kein Dauerdruck |
| **2 Radar** | ab **5 Tagen** vor Frist | Sichtbar unter Demnächst; Buddy schlägt Planung/Zerkleinern vor |
| **3 Notfall-Anker** | ab **1 Tag** vor Frist | Beim Start einer Runde / Öffnen von „Aus Schublade holen“: oben als Bypass (zerkleinert auf heute Machbares). **Nicht** mitten in der Nacht still auf den Anker schieben |

Haltung: **Puffer vor der Frist, kein Panik-Dauerfeuer.**

---

## 7. Vorratsschutz (Bereit-Cap) — fest

„Bereit“ soll nicht zum zweiten Berg werden.

| Parameter | Default | Bemerkung |
|-----------|---------|-----------|
| Soft-Cap | **25** Häppchen in **Bereit** | **In Einstellungen einstellbar** (sinnvoller Bereich z. B. 15–40) |
| Zählung | Nur holbare **Bereit**-Häppchen | Nicht: Eingang-Brocken, Aufschub, Wartet, Eingefroren; Ketten-Rest, der noch nicht „bereit“ ist, zählt nicht voll |
| Hysterese | Cap minus **5** (Default: wieder unter **20**) | Zerkleinern erst wieder, wenn unter Freigabe-Schwelle — gegen Flattern |

**Ab Cap:** Weiteres Zerkleinern **unterbinden** (Button/Flow gestoppt), Buddy freundlich:

> Du hast schon genug kleine Schritte bereit. Hol erst ein paar auf den Anker — oder leg Dinge in Ruhe (Aufschub / eingefroren). Dann zerlegen wir wieder.

Erlaubt bleiben u. a.: Schnell-Drop in den **Eingang**, Sichten, Verschieben in Ruhe-Positionen, Holen/Runden starten.  
**Verboten:** stilles Löschen oder „Aufräumen“ durch die App.

---

## 8. Buddy in der Schublade

Ton wie [BUDDY.md](./BUDDY.md): entlasten, nicht bewerten; warm / kurz / klar.

| Situation | Haltung |
|-----------|---------|
| Öffnen | Alles ist sicher; heute muss nicht alles; Angebot, eine Kleinigkeit zu zerlegen (wenn Cap frei) |
| Cap erreicht | Zerkleinern pausieren; holen oder in Ruhe bringen |
| Lange liegen | Freundlich fragen, ob behalten / Ruhe / verwerfen — **nur Vorschlag** |
| Fristen | Sanft erinnern; ersten kleinen Schritt anbieten |
| Runden-Ende | Feiern; Feierabend oder noch eine Runde — ohne Druck |

**Lange liegen — fest:**

- Ab **21 Tagen** ohne Interaktion darf der Buddy **einmal** freundlich fragen.
- Danach nicht nerven: frühestens wieder nach weiteren **14 Tagen**, oder nach erneuter Berührung (Timer zurück).

> Das liegt schon eine Weile hier. Brauchst du’s noch — oder dürfen wir’s gemeinsam weglegen?

Antworten: **Behalten** · **In Ruhe** · **Verwerfen** (nur nach bewusstem Tippen; bei Ketten siehe [§8a](#8a-ketten--verwerfen--carry)).

---

## 8a. Ketten · Verwerfen · Carry — fest

### Ketten schützen

Ein Häppchen, das **Teil einer Kette** ist, darf man **nicht einfach streichen**, als wäre es ein Einzelposten.

- **Einzelnes Ketten-Häppchen verwerfen:** nur mit klarem Dialog — Auswirkungen auf die Kette erklären (Lücke / nächster Schritt rückt nach / Parent bleibt).
- **Ganze Kette / Brocken verwerfen:** eigene, bewusste Aktion („gesamtes Vorhaben weglegen“), nicht über „diesen einen Schritt löschen“ aus Versehen.
- Buddy-/Lange-liegen-Vorschlag bei Ketten-Gliedern: bevorzugt **In Ruhe** oder **gesamtes Vorhaben prüfen** — nicht ein einzelnes Glied mitten in der Kette „wegwischen“.
- Erledigte Schritte: aus der aktiven Kette nehmen; Parent/Rest bleibt erhalten, bis bewusst abgeschlossen oder verworfen.

### Carry vs. Runde nicht geschafft

| Situation | Wohin |
|-----------|--------|
| Unerledigtes aus der **aktuellen Runde** (auf dem Anker) | **„Noch offen“ / Carry** wie heute |
| Rest der **Kette** in der Schublade | Bleibt in der Schublade — **nicht** alles auf Carry kippen |
| Nutzer will Carry-Eintrag verwerfen | Wenn er aus einer Kette stammt: **nicht einfach streichen** — zurück in die Schublade / Kette anbieten oder Ketten-Dialog (§ oben) |

UI-Text Carry: „von heute noch offen“ — nicht „ganze Schublade“.

---

## 9. Runden (nur mit Schublade)

### 9.1 Idee

Viele Häppchen einer Zerlegung **nicht** morgens alle auf den Anker legen (sonst ist der Tag „voll“, obwohl wenig echte Last). Stattdessen:

1. **Runde N planen** — kleines Kontingent aus der Schublade (Stimmung/Kapazität, typisch 1–3).  
2. Runde **erledigen**.  
3. Moment: *„Du hast alles erledigt, was du dir vorgenommen hast. Toll.“*  
4. Wahl: **Feierabend** · **Noch eine Runde**.

### 9.2 Regeln

- **Rundenzahl unbegrenzt** — Super-Tag = Runde 4, 5, … erlaubt; die App bremst nicht über eine Max-Runde.
- **Bremse nur pro Runde** (Stimmung / Kapazitätspunkte / Slot-Logik analog heute).
- Nachlegen **nie automatisch** — immer nach Frage und Zustimmung.
- **Ohne Schublade:** kein Runden-Flow; Verhalten wie bisher.

### 9.3 Bezug Kapazität

Häppchen sind oft klein (S). Eng wird der Anker über **Punkte/Minuten der aktuellen Runde**, nicht über „alle Häppchen der Schublade“. Drei 10‑Min-Schritte in Runde 1 ≠ sieben zerlegte Schritte vorab committen.

---

## 10. Tageskreis mit Schublade

### Morgens / Start einer Runde

1. Gefühls-Check-in (wie heute) setzt Grenzen für **diese Runde**.  
2. Auf dem Plan: u. a. **„Aus Schublade holen“** und optional manuell.  
3. Overlay filtert vorkuratiert — nicht die ganze Schublade durchwühlen:

| Ebene | Inhalt |
|-------|--------|
| 1 | Notfall-/Frist-Bypass (Phase 3), zerkleinert auf heute Machbares |
| 2 | Energie-Match aus **Bereit** (wenig Energie → nur Mini; normal → bis ~30 Min; viel → inkl. Fokus) |
| 3 | Brocken nur mit „Erst in Häppchen schneiden“ |

4. Gewähltes Häppchen → Slot; Overlay zu; Schublade wieder im Hintergrund.

### Tagsüber

- Neue Gedanken: Geistesblitz (stört die Schubladen-Ordnung nicht).  
- Später: aus Filter-App direkt in den **Eingang**.

### Wenn die Runde leer / erledigt ist

- Feiern + **Feierabend oder noch eine Runde** (§9).  
- Feierabend: wie bisher Done-Ritual; optional kurze Sichtung.

### Abends (kurz, ~2 Min)

- Geistesblitze: Papierkorb oder Eingang.  
- Bei Bedarf Brocken zerlegen (**wenn Cap frei**).  
- Nicht alles auf „Bereit für morgen“ schieben — Morgen holt das Overlay passend zur Stimmung.

---

## 11. Geistesblitz in der Schublade

Schwebender / präsenter Geistesblitz-Knopf auch in der Schubladen-Ansicht: tippen, kurz festhalten, weg. Landet im Zwischenspeicher (bestehende Spark-Logik), nicht als sofortiges Bereit-Häppchen.

---

## 12. Daten & Sync

- Persistenz: `anker-drawer` (`DrawerState`), siehe [DATENMODELL.md](./DATENMODELL.md)
- Sync-Payload: `{ day, prefs, carry, sparks, drawer }`
- **Kein stilles Löschen** bei Sync/Cleanup — Ausnahme nur explizite Nutzeraktion (Verwerfen). Aufschub = unsichtbar, nicht gelöscht.

Erste Basis in der App: Eingang / Bereit / Aufschub / Eingefroren, manuell Häppchen, auf Plan holen. KI, Runden, Fristen-Phasen folgen.

---

## 12a. Produktmodell: einzeln & zusammen

**Haltung:** Schublade wird **funktionsreicher** als der reine Tagesanker. Beides soll **einzeln nutz- und vermarktbar** sein; niemand bei Tagesanker muss Schublade „mitnehmen“.

| Man hat | Erfahrung |
|---------|-----------|
| **Nur Tagesanker** | Plan → Fokus → Done. Keine Schubladen-UI. |
| **Nur Schublade** | Vorrat / Häppchen / Fristen … ohne Tagesanker-Zwang. |
| **Beides** | **Eine Oberfläche**, klare Bereiche (z. B. Heute \| Schublade), gemeinsame Daten/Sync. |

**Faustregel:** Verkaufen = zwei Angebote. Bei Beides: gemeinsame Daten/Sync, klare Nav — **kein zweites Repo**.

### Vercel / Web (fest)

| Schicht | Entscheidung |
|---------|----------------|
| **Wahrnehmung** | **Zwei Apps** — `/app` = Tagesanker, `/schublade` = Die Schublade |
| **Programmpflege** | **Ein Git-Repo**, **ein Vercel-Projekt**, ein Deploy |
| **Daten** | Gemeinsam (localStorage-Keys + Sync-Payload inkl. `drawer`) |
| **Tagesanker** | Schublade **default aus** (`drawerEnabled`); Einstellungen oder Besuch von `/schublade` aktivieren die Brücke (Nav Heute \| Schublade) |
| **PWA-Install** | **Beide allein installierbar** — eigene Manifeste (`id`/`start_url`/`scope`: `/app` vs `/schublade`). Zwei Homescreen-Icons möglich. |

Manifeste: `manifest.webmanifest` (Anker), `manifest-schublade.webmanifest` (Schublade). Unter `/schublade` wird das Schubladen-Manifest gesetzt (auch vor React).

Optional später: zweite Domain (z. B. `schublade.…`) zeigt auf dasselbe Vercel-Projekt und leitet auf `/schublade` — weiterhin **kein** zweites Codebase.

**Nicht** zwei Vercel-Projekte mit doppeltem Deploy, solange nichts anderes erzwungen wird (Env-Trennung, Billing). Wartung geht vor Store-Illusion.

### Preis / Verkauf (fest — Beträge später)

| Angebot | Haltung |
|---------|---------|
| **Schublade allein** | **Immer kostenpflichtig** (kein dauerhaft gratis Vollprodukt). Testphase/Trial möglich wie beim Anker. |
| **Tagesanker allein** | Eigenes Abo (Zielrichtung bisher ca. 3,99 €/Monat — siehe Roadmap / [STRIPE.md](./STRIPE.md)). |
| **Bundle Beides** | **Günstiger als Summe** der Einzel-Abos — Anreiz für beide Module, ohne Schublade „umsonst“ mitzugeben. |

Schublade ist das **größere Funktionspaket** → eigenständiger Preis, nicht nur Upsell-Schnäppchen ohne Wert.  
Öffentliche Beträge / Paywall erst in der Verkaufsversion (Testphase gratis, Checkout gated).

---

## 12b. App Store / Play Store (später)

### Empfohlen: eine Store-App, Module per IAP

- Ein Listing (Familienname / „Tagesanker“)
- In‑App Purchases: Abo **Tagesanker** · Abo **Schublade** (pflichtig kostenpflichtig) · **Bundle Beides** (günstiger als Einzelkauf)
- Freischaltung steuert dieselben Module wie im Web
- Bei Beides: Navigation Heute \| Schublade — wirkt wie ein Produkt

Web: Stripe (wie vorbereitet). Native Builds: Store-IAP für iOS/Android (Capacitor o. Ä.); Entitlements idealerweise am Account spiegeln.

### Alternative: zwei Store-Apps

Ja, möglich — z. B. App „Tagesanker“ und App „Die Schublade“, und in jeder die **andere als Zusatz** kaufen/ freischalten.

| | |
|---|---|
| **Wie** | Gemeinsamer Account (Login/Sync); Kauf in App A setzt Entitlement, das App B erkennt (Universal Purchase / Shared Secret / eigener Server-Check). Upsell: „Schublade freischalten“ → IAP oder Link zur anderen App + Restore. |
| **Vorteil** | Klare Store-Suche pro Name; wer nur Schublade will, findet sie eigenständig. |
| **Nachteil** | Zwei Binaries, zwei Reviews, zwei Update-Zyklen; Nutzer brauchen oft **beide Installationen**, wenn sie zusammenarbeiten sollen — mehr Reibung (ADHS-ungünstig). Kauf über Kreuz ist fehleranfällig (Restore, Familienfreigabe, unterschiedliche Bundles). |

**Festlegung vorerst:** Store-Zielbild = **eine App + IAP-Module** (+ Bundle). Zwei Listings nur erwägen, wenn Schublade klar als eigenständiges Lead-Produkt mit eigener Akquise läuft und die Sync-/Upsell-Komplexität bewusst getragen wird.

---

## 13. Umsetzungsschnitt

### Zum Modul dazugehörig (kein „ohne KI shippen“)

- Vier Ebenen + Verschieben  
- Schnell-Drop (Eingang)  
- **KI-Zerkleinerung** als Zentralmerkmal (+ manueller Fallback), Ketten-Logik, Ketten-Schutz beim Verwerfen  
- „Aus Schublade holen“ + Stimmungsfilter  
- **Runden** (unbegrenzt)  
- Bereit-Cap (Default 25 / Hysterese Cap−5), **einstellbar**  
- Sanfter Aufschub + „Wartet auf …“  
- 3-Phasen harte Fristen (5 Tage / 1 Tag, Bypass beim Runden-Start)  
- Eingefroren eingeklappt  
- Buddy: Öffnen, Cap, lange liegen (21 / 14), Runden-Ende  
- Carry nur Runden-Rest; Kette bleibt in der Schublade  
- Persistenz + Sync  
- **Optional / freischaltbar** — Tagesanker ohne Schublade nutzbar  

### Später vertiefen

- Filter-App-Bridge  
- KI-Qualität / Modelle feiner  
- UI-Feinschliff Overlay-Animation  
- Store-IAP / Entitlements  

### Bewusst nicht

- Heimliches Löschen / Auto-Purge  
- Ketten-Glied „einfach streichen“ ohne Dialog  
- Scores, Streaks, „Produktivitätsbericht Schublade“  
- Unbegrenztes Zerkleinern bei vollem Bereit-Fach  
- Runden-UI ohne Schublade  
- Schublade als Pflicht für reine Tagesanker-Nutzer  

---

## 14. Entscheidungslog (Konzept)

| Datum | Entscheidung |
|-------|----------------|
| Jul 2026 | Name **Die Schublade** (öffentlich); Job-Tresor nur Metapher |
| Jul 2026 | Zerkleinerung = Kern vor dem Anker; **KI = Zentralmerkmal**, manuell = Fallback |
| Jul 2026 | Runden nur mit Schublade; Rundenzahl **unbegrenzt**; Bremse pro Runde |
| Jul 2026 | Bereit-Cap Default **25**, Hysterese Cap−5; **in Einstellungen einstellbar** |
| Jul 2026 | Fristen: Radar ab **5 Tagen**, Notfall ab **1 Tag**; Bypass beim Runden-Start, nicht still nachts |
| Jul 2026 | Lange liegen: Frage ab **21 Tagen**, erneut frühestens nach **14 Tagen** |
| Jul 2026 | Carry = nur unerledigte **Runde**; Ketten-Rest bleibt in der Schublade |
| Jul 2026 | Ketten-Glied **nicht einfach streichen** — Dialog / Gesamtvorhaben |
| Jul 2026 | **Nie heimlich löschen**; Verwerfen nur bewusst |
| Jul 2026 | Ohne Schublade: Tagesanker-Verhalten unverändert |
| Aug 2026 | Schublade = größeres Funktionspaket; **einzeln vermarktbar**; bei Beides **eine UI** |
| Aug 2026 | Store-Ziel: **eine App + IAP-Module** (Bundle); zwei Store-Apps nur Ausnahme |
| Aug 2026 | Web: **zwei Einstiege** `/app` + `/schublade`, **ein** Vercel/Repo; `drawerEnabled` default aus |
| Aug 2026 | Schublade **kostet** (allein); Bundle Beides **günstiger als Summe** — Beträge später |
| Aug 2026 | Schublade **allein als PWA installierbar** (eigenes Manifest / scope) |

---

## 15. Festgeschrieben (ehemals offen)

| Thema | Festlegung |
|-------|------------|
| Fristen Phase 2/3 | 5 Tage / 1 Tag; Auto nur als Bypass beim Runden-/Holen-Start |
| Bereit-Cap | Default 25, einstellbar; Hysterese Cap−5 |
| KI-Häppchen | Zentralmerkmal; manuell Fallback; Anbieter/Opt-in bei Anbindung |
| Lange liegen | 21 Tage → einmal fragen; Quiet 14 Tage |
| Carry / Kette | Carry = Runden-Rest; Kette in Schublade; kein einfaches Streichen von Ketten-Gliedern |
| Produkt / Store | Einzeln nutzbar; zusammen eine App; Store = eine Listing + IAP (nicht Pflicht: zwei Apps) |
| Preis Schublade | Immer kostenpflichtig; Bundle günstiger als Anker + Schublade einzeln |
