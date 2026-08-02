import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PROVIDER, SCHUBLADE, setPageMeta, SITE } from './site'

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
          <p className="mkt-legal-stand">Stand: 2. August 2026</p>
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
      description={`Datenschutzerklärung für Website und Apps ${SITE.name} / ${SCHUBLADE.name}.`}
    >
      <p>
        Hinweise der Anbieterin zur Verarbeitung personenbezogener Daten bei Nutzung der Website und
        der Anwendungen „{SITE.name}“ und „{SCHUBLADE.name}“.
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
        Diese Erklärung gilt für die Website unter {SITE.url} sowie die browserbasierten Progressive
        Web Apps (PWA) „{SITE.name}“ (z.&nbsp;B. unter /app) und „{SCHUBLADE.name}“ (z.&nbsp;B.
        unter /schublade) für Endnutzerinnen und Endnutzer (Verbraucher). Beide Apps gehören zum
        selben Angebot der Anbieterin und können gemeinsam oder getrennt genutzt werden.
      </p>

      <h2>3. Welche Daten wir verarbeiten</h2>
      <h3>a) Website / Marketingseiten</h3>
      <p>
        Beim Aufruf der Seiten verarbeitet der Hostinganbieter technisch notwendige Server-Logdaten
        (z.&nbsp;B. IP-Adresse in gekürzter/technischer Form, Zeitpunkt, angeforderte Ressource,
        User-Agent), soweit dies für Betrieb und Sicherheit erforderlich ist. Wir setzen{' '}
        <strong>keine Werbe-Cookies</strong> und kein nutzerübergreifendes Tracking-Profil ein.
        Rechtsgrundlage: berechtigtes Interesse an sicherem Betrieb (Art.&nbsp;6 Abs.&nbsp;1
        lit.&nbsp;f DSGVO).
      </p>

      <h3>b) App-Nutzung (lokal auf Ihrem Gerät)</h3>
      <p>
        Die Apps speichern Tagespläne, Schubladen-Inhalte, Einstellungen, Geistesblitze und ähnliche
        Inhalte vorrangig <strong>lokal</strong> im Speicher Ihres Browsers bzw. Geräts (z.&nbsp;B.
        localStorage). Ohne Sync-Anmeldung und ohne Zahlungs-/KI-Cloudfunktionen werden diese Inhalte
        in der Regel nicht auf unseren Servern abgelegt. Wer Zugriff auf Ihr Gerät hat, kann auf
        diese lokalen Daten zugreifen.
      </p>

      <h3>c) Optionaler Geräte-Sync (Konto per E-Mail-Code)</h3>
      <p>
        Wenn Sie den Geräte-Sync aktivieren, melden Sie sich per E-Mail-Code an und legen ein
        Sync-Passwort fest. Für den Login-Code werden E-Mail-Adresse und der Code über unseren
        Mail-Dienstleister zugestellt. Tagesstand, Schublade, Einstellungen und Geistesblitze werden{' '}
        <strong>auf Ihrem Gerät Ende-zu-Ende verschlüsselt</strong> und erst dann an unseren
        Sync-Dienst (Supabase) übertragen. Wir (Tagesanker) können den Inhalt nicht mitlesen — nur
        Ciphertext liegt in der Cloud. Geistesblitz-Medien werden einzeln verschlüsselt gespeichert
        und möglichst sofort synchronisiert. Rechtsgrundlage: Einwilligung bzw. Vertragserfüllung auf
        Ihre Anforderung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a bzw. lit.&nbsp;b DSGVO). Ohne Anmeldung
        findet kein Sync statt. Abmelden beendet die Cloud-Synchronisation; lokale Daten bleiben auf
        dem Gerät.
      </p>
      <p>
        Wiederherstellung bei vergessenem Sync-Passwort erfolgt nur über Mittel auf Ihrem Gerät
        (entsperrter Tresor, lokale Kopie oder Recovery-Code). Ein Recovery-Code kann auf Wunsch über
        die Mail-App Ihres Geräts an Sie geschickt werden — nicht über unsere Server.
      </p>

      <h3>d) Optionale E-Mail bei ablaufenden Geistesblitzen</h3>
      <p>
        Wenn Sie in der App eine E-Mail-Adresse hinterlegen und den Versand ablaufender Geistesblitze
        nutzen, übermitteln wir die angegebene Adresse sowie die zu sichernden Inhalte an unseren
        E-Mail-Dienstleister, damit die Nachricht zugestellt werden kann. Rechtsgrundlage:
        Einwilligung bzw. Vertragserfüllung auf Ihre Anforderung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a
        bzw. lit.&nbsp;b DSGVO).
      </p>

      <h3>e) Zahlung, Abo und Kundenportal (Stripe)</h3>
      <p>
        Wenn Sie ein Abo (Tagesanker, Schublade oder Bundle), eine freiwillige Mehrzahlung
        (Spendentopf) oder ein KI-Paket kaufen bzw. das Kundenportal nutzen, werden Zahlungs- und
        Vertragsdaten über den Zahlungsdienstleister <strong>Stripe</strong> verarbeitet (z.&nbsp;B.
        E-Mail, Zahlungsdaten, Rechnungs-/Kundenkennung, Abo-Status). Wir speichern zu Ihrem
        Sync-Konto die für Freischaltung und Abrechnung nötigen Stammdaten (z.&nbsp;B.
        Stripe-Kunden- und Abo-Kennung, Produkt/Tier, Status, Periodenende) in unserer Datenbank
        (Supabase). Kartendaten liegen bei Stripe, nicht bei uns. Rechtsgrundlage: Vertragserfüllung
        und vorvertragliche Maßnahmen (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO) sowie gesetzliche
        Aufbewahrungspflichten (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;c DSGVO), soweit einschlägig.
      </p>

      <h3>f) Optionale KI-Hilfe in der Schublade</h3>
      <p>
        Wenn Sie die KI-Zerlegung (Häppchen) nutzen, werden die dafür erforderlichen Eingaben
        (z.&nbsp;B. Aufgabentitel und ggf. kurzer Kontext) an unseren KI-Anbieter{' '}
        <strong>Microsoft Azure OpenAI</strong> übermittelt, um Vorschläge zu erzeugen. Die Nutzung
        ist optional und kann in den Einstellungen ausgeschaltet werden. Für Kontingente (Free/Trial,
        Abo-Guthaben, Nachkauf) speichern wir Guthabenstand und Buchungen an Ihrem Sync-Konto
        (Supabase). Rechtsgrundlage: Vertragserfüllung bzw. Einwilligung durch Nutzung der Funktion
        (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b bzw. lit.&nbsp;a DSGVO). Bitte keine besonders
        sensiblen Gesundheits- oder Geheimnisdaten in KI-Eingaben eingeben.
      </p>

      <h2>4. Empfänger / Auftragsverarbeitung</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> — Hosting der Website und API (Verarbeitung u.&nbsp;a. in der
          EU, u.&nbsp;a. Frankfurt), soweit technisch für die Auslieferung erforderlich.
        </li>
        <li>
          <strong>Resend</strong> — Versand von E-Mails (Sync-Code, optionale Geistesblitz-Mails),
          nur soweit die jeweilige Funktion genutzt wird.
        </li>
        <li>
          <strong>Supabase</strong> — Authentifizierung, verschlüsselter Sync-Stand sowie
          abrechnungsbezogene Stammdaten (Abo-Status, KI-Guthaben), soweit Sie Sync bzw. Kauf-/KI-
          Cloudfunktionen nutzen.
        </li>
        <li>
          <strong>Stripe Payments Europe / Stripe</strong> — Zahlungsabwicklung, Abo-Verwaltung und
          Kundenportal bei entgeltlichen Angeboten.
        </li>
        <li>
          <strong>Microsoft Azure OpenAI</strong> — optionale KI-Vorschläge in der Schublade, nur bei
          Nutzung der KI-Funktion.
        </li>
      </ul>
      <p>
        Mit den eingesetzten Dienstleistern bestehen soweit erforderlich Vereinbarungen zur
        Auftragsverarbeitung bzw. passende Garantien für Drittlandtransfers (z.&nbsp;B.
        EU-Standardvertragsklauseln / Data Privacy Framework, soweit anwendbar).
      </p>

      <h2>5. Speicherdauer</h2>
      <p>
        Lokale App-Daten bleiben, bis Sie sie in der App löschen oder den Browser-/App-Speicher
        leeren. Bei aktivem Geräte-Sync bleiben Cloud-Kopien, bis Sie sie löschen bzw. das Konto
        entfernen oder den Sync beenden und Daten beim Anbieter löschen lassen. Abo- und
        Zahlungsstammdaten sowie KI-Guthabenbuchungen speichern wir, solange das Konto bzw. der
        Vertrag besteht und darüber hinaus nach gesetzlichen Aufbewahrungsfristen (z.&nbsp;B.
        handels-/steuerrechtlich). Server-Logs werden nach den üblichen Fristen des Hosters gelöscht
        oder anonymisiert. E-Mail-Inhalte beim optionalen Versand werden beim Dienstleister nach
        dessen Betriebsprozessen und gesetzlichen Pflichten behandelt; die App löscht abgelaufene
        Geistesblitze nach dem dokumentierten Ablauf (derzeit typischerweise sieben Tage), sofern
        nicht anders angegeben.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben nach der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen Verarbeitungen
        auf Grundlage von Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO. Einwilligungen können Sie mit
        Wirkung für die Zukunft widerrufen. Außerdem besteht ein Beschwerderecht bei einer
        Datenschutzaufsichtsbehörde (für NRW u.&nbsp;a. die Landesbeauftragte für Datenschutz und
        Informationsfreiheit Nordrhein-Westfalen).
      </p>

      <h3>Sicherung und Datenmitnahme</h3>
      <p>
        In den App-Einstellungen (Sync) können Sie Tag, Schublade und Geistesblitze als
        Markdown-Datei (.md) exportieren und wieder importieren (Datenübertragbarkeit,
        Art.&nbsp;20 DSGVO).
      </p>

      <h3>Löschung Ihrer Daten</h3>
      <p>
        <strong>Lokal:</strong> In den App-Einstellungen (Sync) können Sie die Daten{' '}
        <em>nur auf diesem Gerät</em> leeren.
      </p>
      <p>
        <strong>Konto / Cloud:</strong> Wenn Sie angemeldet sind, können Sie unter Sync „Konto und
        Cloud-Daten löschen“ wählen. Dabei werden Sync-Konto, verschlüsselte Cloud-Kopie,
        Abo-Stammdaten und KI-Guthaben entfernt; laufende Abos werden beendet. Alternativ genügt eine
        formlose E-Mail an{' '}
        <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a> mit dem Betreff „Datenlöschung“ und
        der Sync-E-Mail-Adresse. Gesetzlich aufzubewahrende Zahlungs-/Rechnungsdaten bei Stripe bzw.
        der Anbieterin können nach Ablauf der Fristen gelöscht oder eingeschränkt werden.
      </p>
      <p>
        Kontakt zu allen Betroffenenrechten:{' '}
        <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
      </p>

      <h2>7. Sicherheit</h2>
      <p>
        Die Übertragung erfolgt über HTTPS. Bei aktivem Geräte-Sync werden App-Inhalte zusätzlich
        clientseitig Ende-zu-Ende verschlüsselt, bevor sie den Sync-Dienst erreichen. Zahlungs-,
        Abo- und KI-Kontingentdaten in der Cloud sowie KI-Eingaben sind kein Ende-zu-Ende-Pfad
        gegenüber uns bzw. den jeweiligen Dienstleistern. Absolute Sicherheit bei Browsern und
        Netzen kann nicht gewährleistet werden. Schützen Sie Ihr Gerät und führen Sie Backups
        wichtiger Inhalte selbst durch, soweit Sie das möchten.
      </p>

      <h2>8. Keine medizinische oder therapeutische Leistung</h2>
      <p>
        Tagesanker und Die Schublade sind digitale Alltagswerkzeuge und ersetzen keine ärztliche,
        psychotherapeutische oder sonstige fachliche Beratung.
      </p>
    </LegalShell>
  )
}

export function AgbPage() {
  return (
    <LegalShell
      title="Allgemeine Geschäftsbedingungen (AGB)"
      description={`AGB für ${SITE.name} und ${SCHUBLADE.name} (B2C).`}
    >
      <p>
        für die Nutzung der digitalen Anwendungen „{SITE.name}“ und „{SCHUBLADE.name}“ gegenüber
        Verbraucherinnen und Verbrauchern (§&nbsp;13 BGB)
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
        (1) Diese AGB gelten für die Nutzung der Website und der browserbasierten Anwendungen
        „{SITE.name}“ und „{SCHUBLADE.name}“ (PWA) sowie für entgeltliche Digitale-Dienste-, Abo- und
        Einmalkäufe zwischen der Anbieterin und Verbraucherinnen/Verbrauchern.
      </p>
      <p>
        (2) Abweichende Bedingungen der Nutzerin/des Nutzers werden nicht Vertragsbestandteil, es sei
        denn, die Anbieterin stimmt ausdrücklich zu.
      </p>

      <h2>§ 2 Unverbindliche Darstellung und kostenlose Nutzung</h2>
      <p>
        (1) Die Darstellung von Leistungen und Preisen auf der Website ist unverbindlich, solange kein
        Bestellvorgang (Checkout) abgeschlossen ist. Solange der Verkauf auf der Preise-Seite nicht
        freigeschaltet ist, kommt kein entgeltlicher Vertrag über die bloße Darstellung zustande.
      </p>
      <p>
        (2) Die Anwendungen können ohne Entgelt und ohne Kaufvertrag genutzt werden (lokal auf dem
        Gerät), solange die Anbieterin dies anbietet (Testphase). Daraus entsteht kein Anspruch auf
        unbegrenzte oder unveränderte Weiterführung. Sobald entgeltliche Angebote freigeschaltet
        sind, kann der Zugang zu einzelnen Modulen an ein gültiges Abo gebunden sein. Optionale
        Cloud-Funktionen (z.&nbsp;B. Geräte-Sync, KI-Hilfe) können eine Anmeldung erfordern.
      </p>

      <h2>§ 3 Vertragsschluss bei entgeltlichen Angeboten</h2>
      <p>
        (1) Entgeltliche Abos und Einmalkäufe (z.&nbsp;B. KI-Pakete) werden über den Bestellprozess
        (Checkout über Stripe) geschlossen. Voraussetzung ist in der Regel eine Sync-Anmeldung, damit
        der Kauf dem Konto zugeordnet werden kann. Der Vertrag kommt zustande, indem die
        Nutzerin/der Nutzer den Bestellprozess durchläuft, diese AGB sowie die Widerrufsbelehrung
        zur Kenntnis nimmt bzw. akzeptiert und den Kauf durch die vorgesehene Schaltfläche verbindlich
        abschließt. Die Anbieterin nimmt das Angebot durch Freischaltung und/oder Bestätigung
        (z.&nbsp;B. E-Mail / Zahlungsbestätigung) an.
      </p>
      <p>
        (2) Zahlungsabwicklung und Kundenportal (Abo verwalten / kündigen) erfolgen über Stripe. Die
        Anbieterin erhält die zur Vertragserfüllung und Abrechnung erforderlichen Daten vom
        Zahlungsdienstleister.
      </p>

      <h2>§ 4 Leistungen</h2>
      <p>
        (1) Gegenstand ist die Bereitstellung von „{SITE.name}“ (Alltagsplanung und Fokus) und/oder
        „{SCHUBLADE.name}“ (Ablegen und Zerlegen von Vorhaben) sowie optional dem Bundle beider
        Module. Die Speicherung erfolgt vorrangig lokal; optional gibt es Ende-zu-Ende verschlüsselten
        Geräte-Sync. In der Schublade kann optional eine KI-Hilfe zur Zerlegung genutzt werden;
        enthaltene KI-Kontingente und Nachkauf-Pakete richten sich nach der Darstellung im Checkout
        bzw. in der App.
      </p>
      <p>
        (2) Die Anwendungen ersetzen keine medizinische, therapeutische oder sonstige fachliche
        Behandlung oder Beratung. Es wird keine bestimmte therapeutische Wirkung zugesichert.
      </p>
      <p>
        (3) Die Anbieterin finanziert Betrieb und Weiterentwicklung über Abos und optionale Käufe und
        verzichtet bewusst auf Werbung sowie auf den Verkauf oder die Weitergabe von Nutzungsdaten an
        Werbe- oder Datenhändler.
      </p>
      <p>
        (4) Die Anbieterin strebt eine angemessene Verfügbarkeit an. Wartung, Störungen Dritter
        (Netz, Gerät, Browser, KI-/Zahlungsdienste) und höhere Gewalt können die Nutzung
        beeinträchtigen.
      </p>

      <h2>§ 5 Nutzungsrechte</h2>
      <p>
        Die Nutzerin/der Nutzer erhält ein einfaches, nicht übertragbares Recht zur bestimmungsgemäßen
        Nutzung der Anwendungen für eigene, nicht-gewerbliche Zwecke im Rahmen dieser AGB. Reverse
        Engineering ist nur erlaubt, soweit gesetzlich zwingend gestattet.
      </p>

      <h2>§ 6 Vergütung, Abo, Trial und Einmalkäufe</h2>
      <p>
        (1) Entgeltliche Leistungen werden mit den zum Bestellzeitpunkt im Checkout ausgewiesenen
        Preisen berechnet. Preise verstehen sich — sofern nicht anders angegeben — inklusive der
        gesetzlichen Umsatzsteuer.
      </p>
      <p>
        (2) Angeboten werden insbesondere Abos für Tagesanker, Die Schublade und Bundle (Monat/Jahr).
        Soweit im Checkout ausgewiesen, beginnt das Abo mit einer Testphase (Trial) von sieben Tagen;
        in dieser Zeit kann nach den dort genannten Bedingungen gekündigt werden, ohne dass die erste
        volle Abo-Periode berechnet wird (maßgeblich ist die Darstellung im Checkout / bei Stripe).
      </p>
      <p>
        (3) Abos verlängern sich automatisch um die gewählte Periode, wenn sie nicht rechtzeitig zum
        Periodenende gekündigt werden. Die Kündigung ist über das Stripe-Kundenportal in den
        App-Einstellungen („Abo verwalten“) oder in Textform an{' '}
        <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a> möglich. Das Recht zur
        außerordentlichen Kündigung bleibt unberührt.
      </p>
      <p>
        (4) KI-Pakete sind Einmalkäufe von Nutzungsguthaben. Sie verlängern sich nicht automatisch.
        Nicht verbrauchtes Guthaben verfällt nicht allein durch Zeitablauf, soweit nicht im Checkout
        anders ausgewiesen; bei Kontolöschung entfällt der Anspruch auf Restguthaben.
      </p>

      <h2>§ 7 Freiwillige Mehrzahlung (Spendentopf)</h2>
      <p>
        (1) Im Checkout kann – soweit angeboten – zusätzlich zum Abo eine freiwillige Mehrzahlung
        geleistet werden. Diese dient der Unterstützung des internen „Spendentopfs“ der Anbieterin
        (vorrangig Finanzierung von Sozialzugängen; ein etwaiger Überschuss kann an ADHS-Forschung
        gehen). Einzelheiten zur Selbstverpflichtung der Anbieterin sind intern dokumentiert und
        werden bei Verkaufsfreigabe auch auf der Website erläutert.
      </p>
      <p>
        (2) Die Mehrzahlung ist <strong>keine</strong> steuerbegünstigte Spende an die Nutzerin/den
        Nutzer. Es wird keine Spendenbescheinigung ausgestellt. Die Mehrzahlung ist freiwillig und
        begründet keinen Anspruch auf Gegenleistung über die vertraglich geschuldete App-Nutzung
        hinaus und keinen Anspruch auf einen Sozialzugang.
      </p>

      <h2>§ 8 Widerruf</h2>
      <p>
        Für Verbraucherinnen und Verbraucher gilt das gesetzliche Widerrufsrecht nach Maßgabe der
        Widerrufsbelehrung unter <Link to="/widerruf">/widerruf</Link>.
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
      description={`Widerrufsbelehrung und Muster-Widerrufsformular für ${SITE.name} / ${SCHUBLADE.name}.`}
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
        vorgeschrieben ist. Bei Abos können Sie ergänzend über das Stripe-Kundenportal in der App
        kündigen; das ersetzt nicht zwingend die Widerrufserklärung innerhalb der Frist.
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

      <h2>Geltung für Abos, KI-Pakete und Mehrzahlungen</h2>
      <p>
        Dieses Widerrufsrecht gilt für entgeltliche Verträge über „{SITE.name}“ und „
        {SCHUBLADE.name}“ — insbesondere Abos (Tagesanker, Schublade, Bundle), Einmalkäufe von
        KI-Paketen sowie eine im selben Bestellvorgang geleistete freiwillige Mehrzahlung zugunsten
        des Spendentopfs, soweit ein entgeltlicher Vertrag zustande gekommen ist.
      </p>
      <p>
        Solange kein entgeltlicher Vertrag geschlossen wurde (reine kostenlose Testnutzung ohne
        Checkout), entsteht kein Widerrufsverhältnis aus einem Kauf.
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
        Bei Abos mit Testphase (Trial) richten sich Beginn der Leistung und etwaige Erlöschensvoraussetzungen
        nach den im Checkout bestätigten Hinweisen und dem gesetzlichen Rahmen; die Kündigung des Abos
        zum Ende der Testphase ist zusätzlich über den Kundenweg möglich.
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
          <br />
          (z.&nbsp;B. {SITE.name}-/{SCHUBLADE.name}-Abo Monat/Jahr, Bundle, KI-Paket und ggf.
          freiwillige Mehrzahlung Spendentopf)
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
