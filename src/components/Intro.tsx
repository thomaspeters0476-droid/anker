import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** v4: Alltagssprache, klar verständlich. */
const INTRO_KEY = 'anker-intro-seen-v4'

/**
 * Reihenfolge = Bedienfluss: Morgen → Fokus → Zwei Bereiche → Parken → Ruhe → Start.
 */
const STEP_KEYS = [
  'morning',
  'focus',
  'twoAreas',
  'park',
  'calm',
  'ready',
] as const

type Props = {
  onDone: () => void
}

export function Intro({ onDone }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const stepKey = STEP_KEYS[step]
  const last = step === STEP_KEYS.length - 1
  const detail = t(`intro.steps.${stepKey}.detail`, { defaultValue: '' })

  function finish() {
    localStorage.setItem(INTRO_KEY, '1')
    onDone()
  }

  function next() {
    if (last) finish()
    else setStep((s) => s + 1)
  }

  return (
    <section className="screen intro-screen" aria-label={t('intro.ariaLabel')}>
      <p className="intro-progress">
        {t('intro.progress', {
          current: step + 1,
          total: STEP_KEYS.length,
        })}
      </p>
      <h2 className="intro-title">{t(`intro.steps.${stepKey}.title`)}</h2>
      <p className="intro-text">{t(`intro.steps.${stepKey}.text`)}</p>
      {detail ? <p className="intro-detail">{detail}</p> : null}

      <div className="intro-dots" aria-hidden>
        {STEP_KEYS.map((_, i) => (
          <span key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>

      <div className="intro-actions">
        {!last && (
          <button type="button" className="ghost lg" onClick={finish}>
            {t('intro.skip')}
          </button>
        )}
        <button type="button" className="primary lg" onClick={next}>
          {last ? t('intro.start') : t('intro.next')}
        </button>
      </div>
    </section>
  )
}

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return false
  }
}
