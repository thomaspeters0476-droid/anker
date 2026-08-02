# Tagesanker — Spendentopf

**Stand:** 30.07.2026  
**Status:** interne Selbstverpflichtung / Konzept — noch **nicht** in Checkout oder Preise-UI live  
**Preisanker (Ziel):** Tagesanker **3,49 €/Monat** · **34,90 €/Jahr** · Schublade **4,99 / 49,90** · Bundle **7,49 / 74,90** · 7 Tage Trial (mit Zahlungsmittel)

---

## 0. Preisbotschaft (warum überhaupt Geld)

Kern der Verkaufs-/Preise-Story — **vor** Feature-Listen und Spendentopf:

> Wir nehmen Geld, weil wir auf **Werbung** und auf **jede Art von Datenhandel** verzichten.

Dazu gehört klar:

- Kein Verkauf oder Weitergabe von Nutzungs-/Profildaten an Werbe- oder Datenhändler.
- Kein werbefinanziertes Modell (Aufmerksamkeit ist bei ADHS knappe Ressource).
- Abo = Betrieb, Weiterentwicklung und Unabhängigkeit von Werbe-/Datenökonomie.
- Spendentopf (§1ff.) ist **Zusatz**, nicht der Ersatz für diese Begründung.

Formulierungen für Preise-Seite / Checkout später 1:1 an diese Haltung anbinden.

---

## 1. Zweck

Ein Teil der Einnahmen und freiwillige Mehrzahlungen fließen in einen **Spendentopf**:

1. **Vorrang:** Finanzierung von **Sozialzugängen** (gesponserte App-Nutzung für Menschen, die das Abo sonst nicht tragen können).
2. **Danach:** Was am Periodenende **echt übrig** bleibt (nach Reserve für laufende Zugänge) → Spende an **ADHS-Forschung**; Quittung wird veröffentlicht.

Das ist eine **Selbstverpflichtung**, kein Rechtsanspruch Dritter auf Auszahlung oder Zugang.

---

## 2. Zuflüsse

| Quelle | Anteil in den Topf |
|--------|-------------------|
| Abo-Umsatz | **5 % vom Brutto** (Preis wie berechnet / Stripe Charge, inkl. MwSt.) |
| Freiwillige Mehrzahlung am Checkout | **100 %** |

- Kein weiterer 5 %-Schnitt auf Mehrzahlungen.
- Mehrzahlung ist **Unterstützung des Topfs**, **keine** steuerliche Spendenbescheinigung an Kund:innen (Aufwand zu hoch; im Checkout klar kommunizieren).

**Beispiel (Orientierung):** 3,49 €/Mo. → ~0,17 € Topf; 34,90 €/Jahr → ~1,75 € Topf — zuzüglich Mehrzahlungen.

---

## 3. Sozialzugänge (Vorrang)

### Vergabe

- Anfrage per E-Mail an **info@tagesanker.de** (oder später Formular).
- **Kurze Beschreibung warum** (Freitext) reicht.
- **Kein Nachweis** (Bescheinigungen o. Ä.), solange kein Gefühl von systematischer Ausnutzung entsteht.
- Bei Ausnutzung / Missbrauch: Zugang im Einzelfall beenden oder künftig Nachweise verlangen können.
- **Kein Rechtsanspruch**, begrenztes Kontingent nach Topf-Stand und Fair Use.
- Dauer typischerweise zeitlich begrenzt (z. B. 3–12 Monate), Verlängerung nach erneuter kurzer Nachricht möglich.

### Fair Use (kurz)

- Sozialzugang ist für echte finanzielle Enge gedacht, nicht als Dauer-Ersatz für zahlende Kund:innen ohne Not.
- Ein Zugang pro Person; Weitergabe der Zugangsdaten unzulässig.
- Kontingent und Warteliste richten sich nach Topf-Stand und laufender Reserve (siehe §4).

### Verrechnung

Jeder aktive Sozialzugang belastet den Topf mit dem entsprechenden Abo-Brutto (Monats- bzw. Jahresäquivalent) für die zugesagte Laufzeit — zumindest als **interne Verrechnung** im Transparenzbericht, auch wenn Stripe technisch „gratis“ gesetzt wird.

---

## 4. Jahresüberschuss und Forschungsspende

Sozialzugänge **laufen weiter**. Deshalb darf am Jahresende **nicht** einfach der ganze Kontostand gespendet werden.

### Arbeitsformel (Stichtag: Kalenderjahr, 31.12.)

1. **Topf-Stand** = Summe Zuflüsse (5 % + Mehrzahlungen) − bereits verrechnete/verbrauchte Sozialmonate (und ggf. frühere Forschungsspenden).
2. **Reserve** = für alle **aktiven** Sozialzugänge: verbleibende zugesagte Monate × Abo-Brutto (aktuell 3,99 €/Mo. bzw. anteilig)  
   **+ optionaler Puffer** (z. B. 1–3 Monatsäquivalente Contingency für kurzfristige neue Härtefälle).
3. **Spendbarer Überschuss** = `max(0, Topf-Stand − Reserve)`.
4. Nur dieser Betrag → ADHS-Forschung / anerkannte Organisation; **Spendenquittung veröffentlichen** (Betrag, Datum, Empfänger — **ohne** personenbezogene Daten von Kund:innen oder Sozialzugangs-Empfänger:innen).
5. Reserve bleibt im Topf.

Feinjustierung der Reservefaktor-Zahlen, sobald erste echte Umsätze und Zugänge vorliegen. Bis dahin diese Formel verbindlich führen.

---

## 5. Transparenzbericht (führen)

**Festlegung:**

| Ebene | Was | Wie |
|-------|-----|-----|
| **Intern** | Laufender Bericht = **Quelle der Wahrheit** | Zuerst manuell nach Vorlage unten; mit Stripe: Zuflüsse **automatisch** berechnen und eintragen |
| **Öffentlich** | Schön gestalteter Bericht / Seite | **Immer manuell** aus dem Internbericht abgeleitet — **kein** Auto-Export, kein Zwang zu generiertem PDF |

### Intern — Automatisierung

1. Bei jeder erfolgreichen Abo-Zahlung: **5 % vom Brutto** → Ledger-Zufluss `pct_5` (Stripe-Webhook).
2. Bei Mehrzahlung (Checkout-Line-Item): **100 %** → Ledger-Zufluss `topup`.
3. **Internbericht (API):** `GET /api/spend-pot-report` aggregiert Perioden aus `spend_pot_ledger`.
   - Auth: Env `SPEND_POT_REPORT_TOKEN` als `Authorization: Bearer …`, Header `x-tagesanker-report-token` oder `?token=`
   - Query: `period=month|quarter|year` oder `from=` / `to=` (ISO), optional `format=md`
   - Antwort: JSON inkl. `markdown` (Kennzahlen); **nicht** öffentlich verlinken
4. **Manuelle Inputs bleiben:** Sozialzugänge (`source=social_out`), Forschungsspende (`research_out`) + Quittungsdatei, Reserve-Notiz.
5. Öffentlicher Schönbericht: manuell aus dem Markdown/JSON ableiten.

### Vorlage Intern (Spalten / Felder)

| Feld | Inhalt |
|------|--------|
| Periode | Monat / Quartal / Jahr |
| Brutto-Abo-Umsatz | Summe |
| 5 %-Zuweisung | = 5 % × Brutto |
| Mehrzahlungen | Summe |
| Zufluss gesamt | 5 % + Mehrzahlungen |
| Sozialzugänge | Anzahl aktiv / neu / beendet; verrechnete Summe (anonym) |
| Reserve Stichtag | nach Formel §4 |
| Topf-Stand | nach Zu-/Abflüssen |
| Forschungsspende | nur Jahresüberschuss; Verweis auf Quittungsdatei |
| Notizen | Empfänger Forschung, Besonderheiten |

Keine Speicherung von E-Mails oder Begründungen der Sozialanfragen im öffentlichen Ableger.

### Öffentlich (manuell)

- Jahresquittung Forschung + ausgewählte Kennzahlen aus dem Internbericht.
- Layout/Gestaltung bewusst **von Hand**.

---

## 6. Checkout (später, wenn Stripe)

- Abo 3,99 / 39 + Trial.
- Optional: Mehrzahlung (Betrag wählbar oder Stufen).
- Text: Unterstützung des Sozial-/Forschungstopfs; **keine Spendenbescheinigung**.
- Technik: separates Stripe Line Item / Tip — Tracking für den Internbericht (§5).
- Webhooks speisen das Ledger für die automatische 5 %-/Mehrzahlungs-Berechnung.

Noch **nicht** gebaut.

---

## 7. Recht & Kommunikation (kurz)

- Formulierungen müssen zur Praxis passen („5 % vom Umsatz“ = Brutto-Abo wie hier definiert).
- Kein Versprechen absoluter Spendenhöhen; Überschuss hängt von Sozialzugängen ab.
- Preise-Seite / AGB später anbinden; bis Verkaufsstart nur dieses Doc + Roadmap.

---

## 8. Offene operative Punkte

- Empfänger-Organisation(en) für ADHS-Forschung festlegen.
- Kontingent Soft-Cap (z. B. max. X parallele Sozialzugänge), wenn Topf klein ist.
- Stripe-Coupon / „comp“-Abo-Technik für Sozialzugänge.

---

## Verwandt

- [ANKER_ROADMAP.md](./ANKER_ROADMAP.md) — Verkauf / Checkout
- [DEPLOY.md](./DEPLOY.md) — Betrieb
