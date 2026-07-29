import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PROVIDER, setPageMeta, SITE } from './site'

function LegalShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  useEffect(() => {
    setPageMeta(`${title} — ${SITE.name}`, description)
  }, [title, description])

  return (
    <main className="mkt-main mkt-narrow">
      <article className="mkt-legal">
        <header className="mkt-page-head">
          <h1>{title}</h1>
          <p className="mkt-legal-stand">Stand: Juli 2026</p>
        </header>
        <div className="mkt-prose mkt-prose-legal">{children}</div>
        <p className="mkt-legal-nav">
          <Link to="/impressum">Impressum</Link>
          {' · '}
          <Link to="/datenschutz">Datenschutz</Link>
          {' · '}
          <Link to="/agb">AGB</Link>
          {' · '}
          <Link to="/widerruf">Widerruf</Link>
        </p>
      </article>
    </main>
  )
}

export function ImpressumPage() {
  return (
    <LegalShell title="Impressum" description={`Impressum und Anbieterkennzeichnung von ${SITE.name}.`}>
      <h2>Anbieterin</h2>
      <p>
        {PROVIDER.name}
        <br />
        {PROVIDER.legalForm}
        <br />
        {PROVIDER.street}
        <br />
        {PROVIDER.zipCity}
      </p>
      <p>Vertretungsberechtigt: {PROVIDER.name}</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{' '}
        <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
      </p>

      <h2>Umsatzsteuer</h2>
      <p>
        USt-IdNr.: {PROVIDER.vatId}
        <br />
        Steuernummer: {PROVIDER.taxId}
      </p>

      <h2>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2>
      <p>
        {PROVIDER.name}, Anschrift wie oben
      </p>

      <h2>Online-Streitbeilegung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr" rel="noreferrer" target="_blank">
          https://ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalShell>
  )
}

export function DatenschutzPage() {
  return (
    <LegalShell
      title="Datenschutz"
      description={`Datenschutzerklärung für Website und App ${SITE.name}.`}
    >
      <p>
        Hinweise der Anbieterin zur Verarbeitung personenbezogener Daten bei Nutzung der Website und
        der Anwendung „{SITE.name}“.
      </p>

      <h2>1. Verantwortliche</h2>
      <p>
        {PROVIDER.name}
        <br />
        {PROVIDER.street}, {PROVIDER.zipCity}
        <br />
        E-Mail: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
      </p>

      <h2>2. Geltungsbereich</h2>
      <p>
        Diese Erklärung gilt für die öffentlich erreichbare Website unter {SITE.url} sowie die
        browserbasierte Progressive Web App (PWA) „{SITE.name}“ für Endnutzerinnen und Endnutzer
        (Verbraucher).
      </p>

      <h2>3. Welche Daten wir verarbeiten</h2>
      <h3>a) Website / Marketingseiten</h3>
      <p>
        Beim Aufruf der Seiten verarbeitet der Hostinganbieter technisch notwendige Server-Logdaten
        (z.&nbsp;B. IP-Adresse in gekürzter/technischer Form, Zeitpunkt, angeforderte Ressource,
        User-Agent), soweit dies für Betrieb und Sicherheit erforderlich ist. Wir setzen{' '}
        <strong>keine Werbe-Cookies</strong> und kein nutzerübergreifendes Tracking-Profil ein.
      </p>

      <h3>b) App-Nutzung (lokal auf Ihrem Gerät)</h3>
      <p>
        Tagesanker speichert Tagespläne, Einstellungen, Geistesblitze und ähnliche Inhalte
        vorrangig <strong>lokal</strong> im Speicher Ihres Browsers bzw. Geräts (z.&nbsp;B.
        localStorage). Ohne Sync-Anmeldung werden diese Daten in der Regel nicht auf unseren
        Servern abgelegt. Wer Zugriff auf Ihr Gerät hat, kann auf diese lokalen Daten zugreifen.
      </p>

      <h3>c) Optionaler Geräte-Sync (Konto per Magic Link)</h3>
      <p>
        Wenn Sie in der App den Geräte-Sync aktivieren, melden Sie sich per Magic Link (E-Mail)
        an. Dann werden Ihr Tagesstand, Einstellungen und Geistesblitze verschlüsselt über HTTPS
        an unseren Sync-Dienst (Supabase) übertragen und mit Ihren anderen Geräten
        abgeglichen. Rechtsgrundlage: Einwilligung bzw. Vertragserfüllung auf Ihre Anforderung
        (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a bzw. lit.&nbsp;b DSGVO). Ohne Anmeldung findet kein
        Sync statt. Abmelden beendet die Cloud-Synchronisation; lokale Daten bleiben auf dem
        Gerät.
      </p>

      <h3>d) Optionale E-Mail bei ablaufenden Geistesblitzen</h3>
      <p>
        Wenn Sie in der App eine E-Mail-Adresse hinterlegen und den Versand ablaufender Geistesblitze
        nutzen, übermitteln wir die angegebene Adresse sowie die zu sichernden Inhalte an unseren
        E-Mail-Dienstleister, damit die Nachricht zugestellt werden kann. Rechtsgrundlage:
        Einwilligung bzw. Vertragserfüllung auf Ihre Anforderung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a
        bzw. lit.&nbsp;b DSGVO).
      </p>

      <h2>4. Empfänger / Auftragsverarbeitung</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> — Hosting der Website und API (Verarbeitung u.&nbsp;a. in der
          EU, u.&nbsp;a. Frankfurt), soweit technisch für die Auslieferung erforderlich.
        </li>
        <li>
          <strong>Resend</strong> — Versand optionaler E-Mails (z.&nbsp;B. Geistesblitze), nur wenn
          Sie diese Funktion nutzen.
        </li>
        <li>
          <strong>Supabase</strong> — Authentifizierung (Magic Link) und Speicherung Ihres
          App-Stands in der Cloud, <strong>nur wenn</strong> Sie den optionalen Geräte-Sync
          aktivieren.
        </li>
      </ul>
      <p>
        Mit den eingesetzten Dienstleistern bestehen soweit erforderlich Vereinbarungen zur
        Auftragsverarbeitung.
      </p>

      <h2>5. Speicherdauer</h2>
      <p>
        Lokale App-Daten bleiben, bis Sie sie in der App löschen oder den Browser-/App-Speicher
        leeren. Bei aktivem Geräte-Sync bleiben Cloud-Kopien, bis Sie sie löschen bzw. das Konto
        entfernen oder den Sync beenden und Daten beim Anbieter löschen lassen. Server-Logs werden
        nach den üblichen Fristen des Hosters gelöscht oder anonymisiert. E-Mail-Inhalte beim
        optionalen Versand werden beim Dienstleister nach dessen Betriebsprozessen und gesetzlichen
        Pflichten behandelt; die App löscht abgelaufene Geistesblitze nach dem dokumentierten Ablauf
        (derzeit typischerweise sieben Tage), sofern nicht anders angegeben.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben nach der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen Verarbeitungen
        auf Grundlage von Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO. Einwilligungen können Sie mit
        Wirkung für die Zukunft widerrufen. Außerdem besteht ein Beschwerderecht bei einer
        Datenschutzaufsichtsbehörde.
      </p>
      <p>
        Kontakt: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
      </p>

      <h2>7. Sicherheit</h2>
      <p>
        Die Übertragung erfolgt über HTTPS. Dennoch kann keine absolute Sicherheit bei der
        Übertragung und Speicherung in Browsern gewährleistet werden. Schützen Sie Ihr Gerät und
        führen Sie Backups wichtiger Inhalte selbst durch, soweit Sie das möchten.
      </p>

      <h2>8. Keine medizinische oder therapeutische Leistung</h2>
      <p>
        Tagesanker ist ein digitales Alltagswerkzeug und ersetzt keine ärztliche, psychotherapeutische
        oder sonstige fachliche Beratung.
      </p>
    </LegalShell>
  )
}

export function AgbPage() {
  return (
    <LegalShell
      title="Allgemeine Geschäftsbedingungen (AGB)"
      description={`AGB für die Nutzung von ${SITE.name} (B2C).`}
    >
      <p>
        für die Nutzung der digitalen Anwendung „{SITE.name}“ gegenüber Verbraucherinnen und
        Verbrauchern (§&nbsp;13 BGB)
      </p>

      <h2>Anbieterin und Vertragspartnerin</h2>
      <p>
        {PROVIDER.name}
        <br />
        {PROVIDER.street}, {PROVIDER.zipCity}
        <br />
        E-Mail: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
        <br />
        USt-IdNr.: {PROVIDER.vatId} · Steuernummer: {PROVIDER.taxId}
      </p>

      <h2>§ 1 Geltungsbereich und Vertragsgegenstand</h2>
      <p>
        (1) Diese AGB gelten für die Nutzung der Website und der browserbasierten Anwendung
        „{SITE.name}“ (PWA) sowie für künftige entgeltliche Digitale-Dienste- und Abo-Verträge zwischen
        der Anbieterin und Verbraucherinnen/Verbrauchern.
      </p>
      <p>
        (2) Abweichende Bedingungen der Nutzerin/des Nutzers werden nicht Vertragsbestandteil, es sei
        denn, die Anbieterin stimmt ausdrücklich zu.
      </p>

      <h2>§ 2 Unverbindliche Darstellung und Testphase</h2>
      <p>
        (1) Die Darstellung von Leistungen und künftigen Preisen auf der Website ist unverbindlich,
        solange kein Bestellvorgang abgeschlossen ist.
      </p>
      <p>
        (2) In der Testphase kann die Anwendung ohne Entgelt und ohne Kaufvertrag genutzt werden.
        Daraus entsteht kein Anspruch auf unbegrenzte oder unveränderte Weiterführung einzelner
        Funktionen.
      </p>

      <h2>§ 3 Vertragsschluss bei entgeltlichen Angeboten</h2>
      <p>
        Sobald entgeltliche Abos oder Digitale Inhalte zum Kauf angeboten werden, kommt der Vertrag
        zustande, indem die Nutzerin/der Nutzer den Bestellprozess durchläuft, diese AGB sowie die
        Widerrufsbelehrung zur Kenntnis nimmt bzw. akzeptiert und den Kauf durch die vorgesehene
        Schaltfläche verbindlich abschließt. Die Anbieterin nimmt das Angebot durch Freischaltung
        bzw. Bestätigungsmail an. Zahlungsabwicklung kann über einen Zahlungsdienstleister erfolgen.
      </p>

      <h2>§ 4 Leistungen</h2>
      <p>
        (1) Gegenstand ist die Bereitstellung der Anwendung „{SITE.name}“ zur Unterstützung bei
        Alltagsplanung und Fokus. Die Speicherung erfolgt derzeit vorrangig lokal auf dem Gerät der
        Nutzerin/des Nutzers.
      </p>
      <p>
        (2) Die Anwendung ersetzt keine medizinische, therapeutische oder sonstige fachliche
        Behandlung oder Beratung. Es wird keine bestimmte therapeutische Wirkung zugesichert.
      </p>
      <p>
        (3) Die Anbieterin strebt eine angemessene Verfügbarkeit der Website an. Wartung,
        Störungen Dritter (Netz, Gerät, Browser) und höhere Gewalt können die Nutzung
        beeinträchtigen.
      </p>

      <h2>§ 5 Nutzungsrechte</h2>
      <p>
        Die Nutzerin/der Nutzer erhält ein einfaches, nicht übertragbares Recht zur bestimmungsgemäßen
        Nutzung der Anwendung für eigene, nicht-gewerbliche Zwecke im Rahmen dieser AGB. Reverse
        Engineering ist nur erlaubt, soweit gesetzlich zwingend gestattet.
      </p>

      <h2>§ 6 Vergütung</h2>
      <p>
        Entgeltliche Leistungen werden mit den zum Bestellzeitpunkt ausgewiesenen Preisen berechnet.
        Preise verstehen sich — sofern nicht anders angegeben — inklusive der gesetzlichen
        Umsatzsteuer. Einzelheiten erscheinen, sobald der Verkauf freigeschaltet ist.
      </p>

      <h2>§ 7 Widerruf</h2>
      <p>
        Für Verbraucherinnen und Verbraucher gilt das gesetzliche Widerrufsrecht nach Maßgabe der
        Widerrufsbelehrung unter <Link to="/widerruf">/widerruf</Link>.
      </p>

      <h2>§ 8 Laufzeit und Kündigung künftiger Abos</h2>
      <p>
        Entgeltliche Abos laufen — soweit abgeschlossen — für den gewählten Zeitraum und verlängern
        sich nach den dann ausgewiesenen Bedingungen. Die Kündigung zum Periodenende ist in Textform
        (z.&nbsp;B. E-Mail an {PROVIDER.email}) oder über den dann bereitgestellten Kündigungs-/
        Kundenweg möglich. Das Recht zur außerordentlichen Kündigung bleibt unberührt.
      </p>

      <h2>§ 9 Haftung</h2>
      <p>
        (1) Die Anbieterin haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden
        aus der Verletzung von Leben, Körper oder Gesundheit.
      </p>
      <p>
        (2) Bei leichter Fahrlässigkeit haftet die Anbieterin nur bei Verletzung wesentlicher
        Vertragspflichten und begrenzt auf den vertragstypischen, vorhersehbaren Schaden, soweit
        gesetzlich gegenüber Verbrauchern zulässig. Zwingende gesetzliche Haftung (z.&nbsp;B.
        Produkthaftung) bleibt unberührt.
      </p>

      <h2>§ 10 Änderungen</h2>
      <p>
        Die Anbieterin kann diese AGB mit Wirkung für die Zukunft anpassen, soweit triftige Gründe
        (z.&nbsp;B. Gesetz, Rechtsprechung, Funktionserweiterung) vorliegen. Bei laufenden
        entgeltlichen Verträgen erfolgt eine Ankündigung in Textform mit angemessenem Vorlauf und
        Hinweis auf Widerspruchsmöglichkeiten, soweit gesetzlich erforderlich.
      </p>

      <h2>§ 11 Schlussbestimmungen</h2>
      <p>
        (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei
        Verbrauchern mit Wohnsitz in einem anderen EU-Staat bleiben zwingende Verbraucherschutzvorschriften
        dieses Staates unberührt.
      </p>
      <p>
        (2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen
        Bestimmungen unberührt.
      </p>
    </LegalShell>
  )
}

export function WiderrufPage() {
  return (
    <LegalShell
      title="Widerrufsbelehrung"
      description={`Widerrufsbelehrung und Muster-Widerrufsformular für ${SITE.name}.`}
    >
      <h2>Widerrufsrecht</h2>
      <p>
        Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
        widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
      </p>
      <p>
        Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (
        {PROVIDER.name}, {PROVIDER.street}, {PROVIDER.zipCity}, E-Mail:{' '}
        <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>) mittels einer eindeutigen Erklärung
        (z.&nbsp;B. Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
        Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht
        vorgeschrieben ist.
      </p>
      <p>
        Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
        Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
      </p>

      <h2>Folgen des Widerrufs</h2>
      <p>
        Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten
        haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die
        Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung
        verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt
        haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall
        werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
      </p>

      <h2>Besondere Hinweise zu digitalen Inhalten / Diensten</h2>
      <p>
        Das Widerrufsrecht erlischt bei einem Vertrag zur Erbringung von Dienstleistungen, wenn der
        Unternehmer die Dienstleistung vollständig erbracht hat und mit der Ausführung der Dienstleistung
        erst begonnen hat, nachdem der Verbraucher dazu seine ausdrückliche Zustimmung gegeben hat und
        gleichzeitig seine Kenntnis davon bestätigt hat, dass er sein Widerrufsrecht bei vollständiger
        Vertragserfüllung durch den Unternehmer verliert.
      </p>
      <p>
        Bei einem Vertrag über die Lieferung von nicht auf einem körperlichen Datenträger
        bereitgestellten digitalen Inhalten erlischt das Widerrufsrecht, wenn der Unternehmer mit der
        Ausführung des Vertrags begonnen hat, nachdem der Verbraucher dazu seine ausdrückliche
        Zustimmung gegeben und gleichzeitig seine Kenntnis davon bestätigt hat, dass er mit Beginn der
        Ausführung des Vertrags sein Widerrufsrecht verliert.
      </p>
      <p>
        Solange kein entgeltlicher Vertrag geschlossen wurde (kostenlose Testnutzung), entsteht kein
        Widerrufsverhältnis aus einem Kauf.
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
      <div className="mkt-widerruf-box">
        <p>
          An {PROVIDER.name}, {PROVIDER.street}, {PROVIDER.zipCity}, E-Mail:{' '}
          {PROVIDER.email}:
        </p>
        <p>
          Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf
          der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)
        </p>
        <p>Bestellt am (*)/erhalten am (*)</p>
        <p>Name des/der Verbraucher(s)</p>
        <p>Anschrift des/der Verbraucher(s)</p>
        <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
        <p>Datum</p>
        <p>(*) Unzutreffendes streichen.</p>
      </div>
    </LegalShell>
  )
}
