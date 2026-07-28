type Section = {
  id: string
  title: string
  blocks: Array<
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'h'; text: string }
    | { type: 'rows'; rows: Array<{ label: string; text: string }> }
  >
}

export const HANDBOOK_SECTIONS: Section[] = [
  {
    id: 'screens',
    title: '1. Bildschirme',
    blocks: [
      {
        type: 'rows',
        rows: [
          { label: 'Einführung', text: 'Erster Start oder manuell erneut' },
          { label: 'Plan', text: 'Tag noch nicht gestartet / nach Reset' },
          { label: 'Fokus', text: 'Tag gestartet, Aufgaben laufen' },
          { label: 'Done', text: 'Alles erledigt oder übersprungen' },
        ],
      },
    ],
  },
  {
    id: 'plan',
    title: '2. Plan',
    blocks: [
      {
        type: 'h',
        text: 'Buddy-Karte',
      },
      {
        type: 'p',
        text: 'Kurzer Text oben: Gruß, Stimmungshinweis, Hinweis auf offene Aufgaben vom letzten Durchgang.',
      },
      { type: 'h', text: 'Tagesgefühl' },
      {
        type: 'ul',
        items: [
          'Ziemlich gut — normale Menge und Zeiten',
          'Geht so — weniger Punkte, etwas längere Boxen',
          'Heute eher schwer — deutlich weniger, mehr Zeit',
        ],
      },
      {
        type: 'p',
        text: 'Nur für heute. Keine Bewertung über Tage.',
      },
      { type: 'h', text: 'Arbeit' },
      {
        type: 'ul',
        items: [
          'Titel + Größe (Klein / Mittel / Groß)',
          'Entfernen mit ✕ an der Zeile',
          'Wenn Kapazität voll: Buddy warnt, Hinzufügen blockiert',
        ],
      },
      { type: 'h', text: 'Alltag' },
      {
        type: 'ul',
        items: [
          '✕ an der Zeile: nur vom heutigen Plan nehmen',
          '× am Chip: Vorschlag dauerhaft ausblenden',
          'Eigene Anker bleiben als Vorschlag gespeichert',
          'Limit einstellbar (max. 5)',
        ],
      },
      { type: 'h', text: 'Noch offen' },
      {
        type: 'p',
        text: 'Offene Aufgaben vom letzten Tag oder „Neuen Tag planen“. Übernehmen (Kapazität beachten) oder Verwerfen.',
      },
      { type: 'h', text: 'Tag starten' },
      {
        type: 'p',
        text: 'Nur mit mindestens einer Aufgabe. Danach Fokus-Screen.',
      },
    ],
  },
  {
    id: 'fokus',
    title: '3. Fokus',
    blocks: [
      { type: 'h', text: 'Aktive Aufgabe' },
      {
        type: 'ul',
        items: [
          'Timer, Pause / Weiter, Fertig, Später / überspringen',
          'Warteschlange sichtbar, aber „nicht jetzt“',
          'Zuerst Arbeit, dann Alltag',
        ],
      },
      { type: 'h', text: 'Check-in' },
      {
        type: 'p',
        text: 'In einstellbaren Abständen: noch dabei, abgeschweift, oder Pause.',
      },
      { type: 'h', text: 'Feierabend' },
      {
        type: 'p',
        text: 'Wenn die Arbeit durch ist: Geistesblitze frei. Alltag kann noch folgen.',
      },
      { type: 'h', text: 'Weicher Freeze' },
      {
        type: 'p',
        text: 'App verlassen → Timer pausiert. Optional sanfte Mitteilungen. Einstellbar unten.',
      },
      { type: 'h', text: 'Tag beenden' },
      {
        type: 'p',
        text: 'Offenes wird als übersprungen markiert → Abschluss.',
      },
    ],
  },
  {
    id: 'done',
    title: '4. Abschluss',
    blocks: [
      {
        type: 'ul',
        items: [
          'Buddy-Zusammenfassung — ohne Schuld bei 0 fertig',
          'Geschafft / Offen gelassen',
          'Geistesblitze ansehen (wenn freigeschaltet)',
          '„Neuen Tag planen“ merkt Offenes für „Noch offen“',
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: '5. Einstellungen',
    blocks: [
      {
        type: 'rows',
        rows: [
          { label: 'Kapazität', text: 'Wie viele Arbeitsaufgaben welcher Größe' },
          { label: 'Alltagsanker max.', text: '1–5' },
          { label: 'Buddy-Ton', text: 'warm / kurz / klar' },
          { label: 'Check-in', text: 'Intervall 10–40 Min.' },
          { label: 'Erinnerungen', text: 'Browser-Mitteilungen' },
          { label: 'Freeze', text: 'Pause beim Verlassen; Away-Nudges' },
          { label: 'Einführung', text: 'Button auf der Startseite' },
          { label: 'PWA', text: 'Install-Hinweise' },
        ],
      },
    ],
  },
  {
    id: 'sparks',
    title: '6. Geistesblitze',
    blocks: [
      {
        type: 'rows',
        rows: [
          { label: 'Parken', text: 'Notiz, Skizze oder kurze Sprachnotiz' },
          {
            label: 'Speicher',
            text: 'Ansehen erst nach erledigter/übersprungener Arbeit',
          },
          { label: 'Haltbarkeit', text: 'max. 7 Tage, dann weg' },
          { label: 'Export', text: 'Kopieren, Text, PDF, Audio' },
        ],
      },
    ],
  },
  {
    id: 'data',
    title: '7. Daten auf dem Gerät',
    blocks: [
      {
        type: 'ul',
        items: [
          'Alles lokal in diesem Browser',
          'Anderer Browser oder Cache leeren = Daten weg (bis Sync existiert)',
          'Kein Account in der Testphase',
        ],
      },
    ],
  },
]

type Props = {
  onClose: () => void
}

export function Handbook({ onClose }: Props) {
  return (
    <div
      className="spark-overlay handbook-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Handbuch"
    >
      <div className="spark-panel handbook-panel">
        <div className="vault-head">
          <div>
            <h2>Handbuch</h2>
            <p className="block-hint" style={{ margin: '0.25rem 0 0' }}>
              Kurzer Überblick — ohne Druck, zum Nachschlagen.
            </p>
          </div>
          <button type="button" className="ghost sm" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="handbook-body">
          {HANDBOOK_SECTIONS.map((section) => (
            <details key={section.id} className="handbook-section">
              <summary>{section.title}</summary>
              <div className="handbook-section-body">
                {section.blocks.map((block, i) => {
                  if (block.type === 'p') {
                    return <p key={i}>{block.text}</p>
                  }
                  if (block.type === 'h') {
                    return (
                      <h3 key={i} className="handbook-sub">
                        {block.text}
                      </h3>
                    )
                  }
                  if (block.type === 'ul') {
                    return (
                      <ul key={i}>
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  }
                  return (
                    <dl key={i} className="handbook-dl">
                      {block.rows.map((row) => (
                        <div key={row.label} className="handbook-dl-row">
                          <dt>{row.label}</dt>
                          <dd>{row.text}</dd>
                        </div>
                      ))}
                    </dl>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
