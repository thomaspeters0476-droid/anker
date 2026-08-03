import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const INTRO_KEY = 'anker-intro-seen'

/** Kurz: Nutzen zuerst — Details später in Einstellungen. */
const STEP_KEYS = ['oneThing', 'park', 'calm'] as const

type Props = {
  onDone: () => void
}

export function Intro({ onDone }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const stepKey = STEP_KEYS[step]
  const last = step === STEP_KEYS.length - 1

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
