import { useState } from 'react'

const INTRO_KEY = 'anker-intro-seen'

const STEPS = [
  {
    title: 'Wenig planen',
    text: 'Morgens nur ein paar Arbeitsaufgaben und Alltagsanker. Nicht den ganzen Berg.',
  },
  {
    title: 'Eine Sache',
    text: 'Im Fokus siehst du nur die aktuelle Aufgabe. Der Rest wartet — absichtlich.',
  },
  {
    title: 'Zurückfinden',
    text: 'Der Buddy fragt zwischendurch nach. Geistesblitze kannst du kurz parken und später anschauen.',
  },
] as const

type Props = {
  onDone: () => void
}

export function Intro({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const last = step === STEPS.length - 1

  function finish() {
    localStorage.setItem(INTRO_KEY, '1')
    onDone()
  }

  function next() {
    if (last) finish()
    else setStep((s) => s + 1)
  }

  return (
    <section className="screen intro-screen" aria-label="Einführung">
      <p className="intro-progress">
        {step + 1} / {STEPS.length}
      </p>
      <h2 className="intro-title">{current.title}</h2>
      <p className="intro-text">{current.text}</p>

      <div className="intro-dots" aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>

      <div className="intro-actions">
        {!last && (
          <button type="button" className="ghost lg" onClick={finish}>
            Überspringen
          </button>
        )}
        <button type="button" className="primary lg" onClick={next}>
          {last ? 'Loslegen' : 'Weiter'}
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
