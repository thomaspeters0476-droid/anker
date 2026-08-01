import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SCHUBLADE, SITE, setPageMeta } from './site'

export function PreisePage() {
  useEffect(() => {
    setPageMeta(
      `Preise — ${SITE.name}`,
      'Verkauf startet bald. Tagesanker und Die Schublade kannst du jetzt kostenlos testen.',
    )
  }, [])

  return (
    <main className="mkt-main mkt-narrow">
      <header className="mkt-page-head">
        <h1>Preise</h1>
        <p>
          Der Verkauf startet bald. Bis dahin kannst du {SITE.name} und {SCHUBLADE.name} kostenlos
          nutzen.
        </p>
      </header>

      <div className="mkt-price-slots">
        <div className="mkt-price-slot">
          <h2>{SITE.name}</h2>
          <p>Fokus für den Tag — eine Sache nach der anderen.</p>
          <Link to="/app" className="mkt-btn mkt-btn-ghost">
            App öffnen
          </Link>
        </div>
        <div className="mkt-price-slot">
          <h2>{SCHUBLADE.name}</h2>
          <p>Vorrat ablegen, zerlegen, Schritte holen — separat erwerbbar.</p>
          <Link to={SCHUBLADE.path} className="mkt-btn mkt-btn-ghost">
            Mehr erfahren
          </Link>
        </div>
        <div className="mkt-price-slot">
          <h2>Bundle</h2>
          <p>Beides zusammen — günstiger als einzeln. Beträge folgen.</p>
        </div>
      </div>

      <div className="mkt-soon">
        <h2>Bald verfügbar</h2>
        <p>
          Einfache Abos mit Testphase sind in Vorbereitung. Sobald es live ist, stehen hier klare
          Beträge und Checkout — ohne Kleingedrucktes-Chaos. Bis dahin keine Preise und kein Kauf auf
          dieser Seite.
        </p>
        <div className="mkt-hero-actions">
          <Link to="/app" className="mkt-btn mkt-btn-primary">
            Tagesanker testen
          </Link>
          <Link to={SCHUBLADE.appPath} className="mkt-btn mkt-btn-ghost">
            Schublade testen
          </Link>
        </div>
      </div>
    </main>
  )
}
