import { useState } from 'react'
import type { Spark } from '../types'
import {
  copySparksText,
  exportSparksAudio,
  exportSparksPdf,
  exportSparksText,
  hasAudioSparks,
} from '../exportSparks'

type Props = {
  sparks: Spark[]
  unlocked: boolean
  onClose: () => void
}

function modeLabel(mode: Spark['mode']): string {
  if (mode === 'note') return 'Notiz'
  if (mode === 'draw') return 'Skizze'
  return 'Audio'
}

export function SparkVault({ sparks, unlocked, onClose }: Props) {
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canExport = unlocked && sparks.length > 0
  const canAudio = canExport && hasAudioSparks(sparks)

  async function onCopy() {
    const ok = await copySparksText(sparks)
    setCopyMsg(ok ? 'In Zwischenablage kopiert.' : 'Kopieren nicht möglich.')
    window.setTimeout(() => setCopyMsg(null), 2500)
  }

  async function onPdf() {
    setBusy(true)
    try {
      await exportSparksPdf(sparks)
      if (hasAudioSparks(sparks)) {
        await exportSparksAudio(sparks)
        setCopyMsg('PDF gespeichert. Audios zusätzlich heruntergeladen.')
        window.setTimeout(() => setCopyMsg(null), 3500)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="spark-overlay" role="dialog" aria-modal="true" aria-label="Geistesblitzspeicher">
      <div className="spark-panel vault">
        <div className="spark-head">
          <h2>Geistesblitzspeicher</h2>
          <p>
            {unlocked
              ? 'Arbeitsaufgaben erledigt — jetzt darfst du stöbern.'
              : 'Noch verschlossen. Erst die Arbeitsaufgaben.'}
          </p>
        </div>

        {!unlocked ? (
          <p className="vault-lock">
            {sparks.length === 0
              ? 'Noch nichts geparkt.'
              : `${sparks.length} Idee${sparks.length === 1 ? '' : 'n'} warten hier. Alltag schaltet das nicht frei.`}
          </p>
        ) : sparks.length === 0 ? (
          <p className="empty">Heute noch keine Geistesblitze.</p>
        ) : (
          <ul className="vault-list">
            {sparks.map((s) => (
              <li key={s.id} className="vault-item">
                <span className="vault-meta">
                  {modeLabel(s.mode)}
                  {' · '}
                  {new Date(s.createdAt).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {s.text && <p>{s.text}</p>}
                {s.drawingDataUrl && (
                  <img src={s.drawingDataUrl} alt="Skizze" className="vault-sketch" />
                )}
                {s.audioDataUrl && (
                  <audio controls src={s.audioDataUrl} className="spark-audio" />
                )}
              </li>
            ))}
          </ul>
        )}

        {canExport && (
          <div className="export-block">
            <p className="export-label">Exportieren</p>
            <div className={`export-actions ${canAudio ? 'four' : 'three'}`}>
              <button type="button" className="secondary" onClick={onCopy}>
                Kopieren
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => exportSparksText(sparks)}
              >
                Text
              </button>
              {canAudio && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void exportSparksAudio(sparks)}
                >
                  Audio
                </button>
              )}
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void onPdf()}
              >
                {busy ? 'PDF…' : 'PDF'}
              </button>
            </div>
            {copyMsg && <p className="export-msg">{copyMsg}</p>}
            <p className="export-hint">
              PDF: Text & Skizzen. Audio-Dateien separat (passen nicht ins PDF).
            </p>
          </div>
        )}

        <button type="button" className="primary lg" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  )
}
