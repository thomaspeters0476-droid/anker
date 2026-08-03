import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const KEY = 'anker-schublade-intro-seen'

/** Ausführlich: Schublade allein nutzbar — nicht nur als Anker-Anhang. */
const STEPS = [
  'alone',
  'park',
  'chop',
  'ready',
  'today',
  'calmSparks',
  'syncSettings',
] as const

type Props = { onDone: () => void }

export function SchubladeIntro({ onDone }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const key = STEPS[step]
  const last = step === STEPS.length - 1

  function finish() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    onDone()
  }

  function next() {
    if (last) finish()
    else setStep((s) => s + 1)
  }

  return (
    <section className="screen intro-screen" aria-label={t('drawer.intro.aria')}>
      <p className="intro-progress">
        {t('intro.progress', { current: step + 1, total: STEPS.length })}
      </p>
      <h2 className="intro-title">{t(`drawer.intro.steps.${key}.title`)}</h2>
      <p className="intro-text">{t(`drawer.intro.steps.${key}.text`)}</p>
      <div className="intro-dots" aria-hidden>
        {STEPS.map((_, i) => (
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
          {last ? t('drawer.intro.start') : t('intro.next')}
        </button>
      </div>
    </section>
  )
}

export function hasSeenSchubladeIntro(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
