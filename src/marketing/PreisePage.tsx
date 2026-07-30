import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta, SITE } from './site'

export function PreisePage() {
  useEffect(() => {
    setPageMeta(`Preise — ${SITE.name}`, 'Verkauf startet bald. Die App kannst du jetzt kostenlos testen.')
  }, [])

  return (
    <main className="mkt-main mkt-narrow">
      <header className="mkt-page-head">
        <h1>Preise</h1>
        <p>Der Verkauf startet bald. Bis dahin kannst du Tagesanker kostenlos nutzen.</p>
      </header>
      <div className="mkt-soon">
        <h2>Bald verfügbar</h2>
        <p>
          Ein einfaches Abo mit Testphase ist in Vorbereitung. Sobald es live ist, findest du hier die
          Details — klar und ohne Kleingedrucktes-Chaos. Bis dahin keine Preise und kein Checkout auf
          dieser Seite.
        </p>
        <Link to="/app" className="mkt-btn mkt-btn-primary">
          Jetzt gratis testen
        </Link>
      </div>
    </main>
  )
}
