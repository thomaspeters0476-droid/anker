import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  onDelete?: (id: string) => void
  /** Geistesblitz in Schubladen-Eingang legen (Text nötig) */
  onSendToDrawer?: (id: string) => void
}

export function SparkVault({
  sparks,
  unlocked,
  onClose,
  onDelete,
  onSendToDrawer,
}: Props) {
  const { t, i18n } = useTranslation()
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canExport = unlocked && sparks.length > 0
  const canAudio = canExport && hasAudioSparks(sparks)

  function modeLabel(mode: Spark['mode']): string {
    if (mode === 'note') return t('sparkVault.mode.note')
    if (mode === 'draw') return t('sparkVault.mode.draw')
    return t('sparkVault.mode.audio')
  }

  async function onCopy() {
    const ok = await copySparksText(sparks)
    setCopyMsg(
      ok ? t('sparkVault.export.copied') : t('sparkVault.export.copyFailed'),
    )
    window.setTimeout(() => setCopyMsg(null), 2500)
  }

  async function onPdf() {
    setBusy(true)
    try {
      await exportSparksPdf(sparks)
      if (hasAudioSparks(sparks)) {
        await exportSparksAudio(sparks)
        setCopyMsg(t('sparkVault.export.pdfSavedWithAudio'))
        window.setTimeout(() => setCopyMsg(null), 3500)
      }
    } finally {
      setBusy(false)
    }
  }

  function removeSpark(id: string) {
    onDelete?.(id)
  }

  return (
    <div
      className="spark-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('sparkVault.ariaLabel')}
    >
      <div className="spark-panel vault">
        <div className="spark-head">
          <h2>{t('sparkVault.title')}</h2>
          <p>
            {unlocked ? t('sparkVault.unlocked') : t('sparkVault.locked')}
          </p>
          <p className="vault-retain">{t('sparkVault.retain')}</p>
        </div>

        {!unlocked ? (
          <p className="vault-lock">
            {sparks.length === 0
              ? t('sparkVault.nothingParked')
              : sparks.length === 1
                ? t('sparkVault.waitingOne', { count: sparks.length })
                : t('sparkVault.waitingMany', { count: sparks.length })}
          </p>
        ) : sparks.length === 0 ? (
          <p className="empty">{t('sparkVault.emptyToday')}</p>
        ) : (
          <ul className="vault-list">
            {sparks.map((s) => (
              <li key={s.id} className="vault-item">
                <div className="vault-item-head">
                  <span className="vault-meta">
                    {modeLabel(s.mode)}
                    {' · '}
                    {new Date(s.createdAt).toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="vault-item-actions">
                    {onSendToDrawer &&
                      unlocked &&
                      Boolean(s.text?.trim()) && (
                        <button
                          type="button"
                          className="ghost sm"
                          onClick={() => onSendToDrawer(s.id)}
                        >
                          {t('sparkVault.toDrawer')}
                        </button>
                      )}
                    {onDelete && (
                      <button
                        type="button"
                        className="ghost sm vault-delete"
                        onClick={() => removeSpark(s.id)}
                        aria-label={t('sparkVault.deleteAria')}
                      >
                        {t('sparkVault.delete')}
                      </button>
                    )}
                  </div>
                </div>
                {s.text && <p>{s.text}</p>}
                {s.drawingDataUrl && (
                  <img
                    src={s.drawingDataUrl}
                    alt={t('sparkVault.sketchAlt')}
                    className="vault-sketch"
                  />
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
            <p className="export-label">{t('sparkVault.export.label')}</p>
            <div className={`export-actions ${canAudio ? 'four' : 'three'}`}>
              <button type="button" className="secondary" onClick={onCopy}>
                {t('sparkVault.export.copy')}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => exportSparksText(sparks)}
              >
                {t('sparkVault.export.text')}
              </button>
              {canAudio && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void exportSparksAudio(sparks)}
                >
                  {t('sparkVault.export.audio')}
                </button>
              )}
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void onPdf()}
              >
                {busy
                  ? t('sparkVault.export.pdfBusy')
                  : t('sparkVault.export.pdf')}
              </button>
            </div>
            {copyMsg && <p className="export-msg">{copyMsg}</p>}
            <p className="export-hint">{t('sparkVault.export.hint')}</p>
          </div>
        )}

        <button type="button" className="primary lg" onClick={onClose}>
          {t('sparkVault.close')}
        </button>
      </div>
    </div>
  )
}
