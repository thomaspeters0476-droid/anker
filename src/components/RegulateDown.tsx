import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const SENSE_KEYS = [
  'see5',
  'touch4',
  'hear3',
  'smell2',
  'taste1',
] as const

const BODY_IDS = ['ice', 'water', 'chest'] as const

type Tab = 'breathe' | 'senses' | 'body'

type Props = {
  onClose: () => void
}

export function RegulateDown({ onClose }: Props) {
  const { t } = useTranslation()
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
      aria-label={t('regulate.ariaLabel')}
    >
      <div className="regulate-panel">
        <p className="regulate-kicker">{t('regulate.kicker')}</p>
        <h2 className="regulate-title">{t('regulate.title')}</h2>
        <p className="regulate-lead">{t('regulate.lead')}</p>

        <div
          className="regulate-tabs"
          role="tablist"
          aria-label={t('regulate.tabsAria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'breathe'}
            className={tab === 'breathe' ? 'on' : ''}
            onClick={() => setTab('breathe')}
          >
            {t('regulate.tabs.breathe')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'senses'}
            className={tab === 'senses' ? 'on' : ''}
            onClick={() => setTab('senses')}
          >
            {t('regulate.tabs.senses')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'body'}
            className={tab === 'body' ? 'on' : ''}
            onClick={() => setTab('body')}
          >
            {t('regulate.tabs.body')}
          </button>
        </div>

        {tab === 'breathe' && (
          <div className="regulate-breathe" aria-live="polite">
            <div
              className={`regulate-circle ${phase === 'in' ? 'in' : 'out'}`}
              aria-hidden
            />
            <p className="regulate-phase">
              {phase === 'in' ? t('regulate.breathe.in') : t('regulate.breathe.out')}
            </p>
            <p className="regulate-hint">{t('regulate.breathe.hint')}</p>
          </div>
        )}

        {tab === 'senses' && (
          <div className="regulate-senses" aria-live="polite">
            <p className="regulate-buddy-label">{t('regulate.senses.buddyLabel')}</p>
            <p className="regulate-prompt">
              {t(`regulate.senses.prompts.${SENSE_KEYS[senseIdx]}`)}
            </p>
            <p className="regulate-hint regulate-hint--left">
              {t('regulate.senses.hint')}
            </p>
            <button
              type="button"
              className="regulate-soft-btn"
              onClick={() =>
                setSenseIdx((i) => (i + 1) % SENSE_KEYS.length)
              }
            >
              {senseIdx < SENSE_KEYS.length - 1
                ? t('regulate.senses.next')
                : t('regulate.senses.restart')}
            </button>
          </div>
        )}

        {tab === 'body' && (
          <div className="regulate-body">
            <p
              className="regulate-hint regulate-hint--left"
              style={{ marginBottom: '0.75rem' }}
            >
              {t('regulate.body.hint')}
            </p>
            <div className="regulate-body-actions">
              {BODY_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`regulate-body-btn${bodyDone[id] ? ' done' : ''}`}
                  onClick={() =>
                    setBodyDone((d) => ({ ...d, [id]: true }))
                  }
                >
                  <strong>{t(`regulate.body.actions.${id}.title`)}</strong>
                  <span>{t(`regulate.body.actions.${id}.text`)}</span>
                  {bodyDone[id] && (
                    <em className="regulate-body-ok">{t('regulate.body.done')}</em>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" className="regulate-return" onClick={onClose}>
          {t('regulate.return')}
        </button>
      </div>
    </div>
  )
}

/** Klar benannt — im Stress muss man den Einstieg finden */
export function RegulateButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="regulate-fab"
      onClick={onClick}
      aria-label={t('regulate.buttonAria')}
      title={t('regulate.buttonTitle')}
    >
      <span className="regulate-fab-icon" aria-hidden />
      <span className="regulate-fab-label">{t('regulate.button')}</span>
    </button>
  )
}
