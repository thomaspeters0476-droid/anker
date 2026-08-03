import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PreiseBuy } from './PreiseBuy'
import { SCHUBLADE, SITE, setPageMeta } from './site'

export function PreisePage() {
  useEffect(() => {
    setPageMeta(
      `Preise — ${SITE.name}`,
      'Offene Beta kostenlos. Später: 7 Tage Trial mit Zahlungsdaten, dann Abo — auch ohne Sync. Kein Free.',
    )
  }, [])

  return (
    <main className="mkt-main mkt-narrow">
      <header className="mkt-page-head">
        <h1>Preise</h1>
        <p>
          Gerade läuft eine <strong>offene Beta</strong>: {SITE.name} und{' '}
          {SCHUBLADE.name} sind kostenlos nutzbar. Wenn der Verkauf startet, kostet
          die App immer — auch nur lokal, auch ohne Sync. Es gibt{' '}
          <strong>kein Free</strong>, nur <strong>7 Tage Trial</strong> — ohne
          Zahlungsdaten startet keiner —, danach Abo.
        </p>
      </header>

      <PreiseBuy />

      <div className="mkt-soon">
        <h2>Beta noch offen</h2>
        <p>
          Solange die Beta läuft, kannst du die Apps ohne Kauf nutzen. Die
          Trial-Buttons oben führen zu Stripe, sobald Checkout freigeschaltet
          ist — dann: ohne Zahlungsdaten kein Trial, erste Abbuchung nach 7 Tagen.
        </p>
        <div className="mkt-hero-actions">
          <Link to="/app" className="mkt-btn mkt-btn-primary">
            Tagesanker (Beta)
          </Link>
          <Link to={SCHUBLADE.appPath} className="mkt-btn mkt-btn-ghost">
            Schublade (Beta)
          </Link>
        </div>
      </div>
    </main>
  )
}
