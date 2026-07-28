import { useEffect, useState } from 'react'

const SENSE_PROMPTS = [
  'Nenne 5 Dinge um dich herum, die du sehen kannst.',
  'Nenne 4 Dinge, die du anfassen kannst.',
  'Nenne 3 Geräusche, die du hören kannst.',
  'Nenne 2 Dinge, die du riechen kannst — oder dir vorstellst.',
  'Nenne 1 Ding, das du schmecken kannst — oder ein Schluck Wasser.',
] as const

const BODY_ACTIONS = [
  {
    id: 'ice',
    title: 'Kühle ins Gesicht',
    text: 'Kaltes Wasser, kühler Lappen oder kurz ans geöffnete Fenster.',
  },
  {
    id: 'water',
    title: 'Glas Wasser trinken',
    text: 'Langsam. Nicht leisten — nur trinken.',
  },
  {
    id: 'chest',
    title: 'Hand auf die Brust',
    text: 'Leicht drücken. Spüren, dass du hier bist.',
  },
] as const

type Tab = 'breathe' | 'senses' | 'body'

type Props = {
  onClose: () => void
}

export function RegulateDown({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('breathe')
  const [senseIdx, setSenseIdx] = useState(0)
  const [bodyDone, setBodyDone] = useState<Record<string, boolean>>({})
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    if (tab !== 'breathe') return
    let cancelled = false
    let timeoutId = 0

    const loop = (next: 'in' | 'out') => {
      if (cancelled) return
      setPhase(next)
      const ms = next === 'in' ? 4000 : 6000
      timeoutId = window.setTimeout(() => {
        loop(next === 'in' ? 'out' : 'in')
      }, ms)
    }

    loop('in')
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [tab])

  return (
    <div
      className="regulate-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Runterregeln"
    >
      <div className="regulate-panel">
        <p className="regulate-kicker">Sicherheitsventil</p>
        <h2 className="regulate-title">Nur atmen. Nichts leisten.</h2>
        <p className="regulate-lead">
          Timer und Aufgaben sind ausgeblendet. Du kannst jederzeit zurück —
          ohne Bewertung.
        </p>

        <div className="regulate-tabs" role="tablist" aria-label="Impulse">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'breathe'}
            className={tab === 'breathe' ? 'on' : ''}
            onClick={() => setTab('breathe')}
          >
            Atmen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'senses'}
            className={tab === 'senses' ? 'on' : ''}
            onClick={() => setTab('senses')}
          >
            Sinne
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'body'}
            className={tab === 'body' ? 'on' : ''}
            onClick={() => setTab('body')}
          >
            Körper
          </button>
        </div>

        {tab === 'breathe' && (
          <div className="regulate-breathe" aria-live="polite">
            <div
              className={`regulate-circle ${phase === 'in' ? 'in' : 'out'}`}
              aria-hidden
            />
            <p className="regulate-phase">
              {phase === 'in' ? 'Einatmen … (4 Sek.)' : 'Ausatmen … (6 Sek.)'}
            </p>
            <p className="regulate-hint">
              Dem Kreis folgen — so gut es gerade geht. Unperfekt reicht.
            </p>
          </div>
        )}

        {tab === 'senses' && (
          <div className="regulate-senses" aria-live="polite">
            <p className="regulate-buddy-label">Buddy</p>
            <p className="regulate-prompt">{SENSE_PROMPTS[senseIdx]}</p>
            <p className="regulate-hint regulate-hint--left">
              Laut oder nur im Kopf. Kein Aufschreiben nötig.
            </p>
            <button
              type="button"
              className="regulate-soft-btn"
              onClick={() =>
                setSenseIdx((i) => (i + 1) % SENSE_PROMPTS.length)
              }
            >
              {senseIdx < SENSE_PROMPTS.length - 1
                ? 'Nächster Impuls'
                : 'Von vorn'}
            </button>
          </div>
        )}

        {tab === 'body' && (
          <div className="regulate-body">
            <p className="regulate-hint regulate-hint--left" style={{ marginBottom: '0.75rem' }}>
              Das Allerwerteste — tippe, was du tust oder schon getan hast.
            </p>
            <div className="regulate-body-actions">
              {BODY_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`regulate-body-btn${bodyDone[a.id] ? ' done' : ''}`}
                  onClick={() =>
                    setBodyDone((d) => ({ ...d, [a.id]: true }))
                  }
                >
                  <strong>{a.title}</strong>
                  <span>{a.text}</span>
                  {bodyDone[a.id] && (
                    <em className="regulate-body-ok">Okay — gut so.</em>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" className="regulate-return" onClick={onClose}>
          Ich bin wieder da
        </button>
      </div>
    </div>
  )
}

/** Klar benannt — im Stress muss man den Einstieg finden */
export function RegulateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="regulate-fab"
      onClick={onClick}
      aria-label="Ruhe: Runterregeln, wenn es zu viel wird"
      title="Wenn es zu viel wird — hier tippen"
    >
      <span className="regulate-fab-icon" aria-hidden />
      <span className="regulate-fab-label">Ruhe</span>
    </button>
  )
}
