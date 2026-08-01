import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SCHUBLADE, SITE, setPageMeta } from './site'
import shotSchublade from './shots/shot-schublade.svg'

export function SchubladeLandingPage() {
  useEffect(() => {
    setPageMeta(`${SCHUBLADE.name} — ${SCHUBLADE.tagline}`, SCHUBLADE.description)
  }, [])

  return (
    <main className="mkt-main mkt-drawer-landing">
      <section className="mkt-hero mkt-hero--drawer">
        <div className="mkt-hero-glow mkt-hero-glow--drawer" aria-hidden />
        <div className="mkt-hero-grid">
          <div className="mkt-hero-copy">
            <p className="mkt-hero-brand">{SCHUBLADE.name}</p>
            <h1 className="mkt-hero-title">Sicher weg, nicht weg.</h1>
            <p className="mkt-hero-lead">
              Was nicht für jetzt ist: ablegen, in greifbare Schritte zerlegen, später einen holen —
              ohne den Tag zu überfüllen.
            </p>
            <div className="mkt-hero-actions">
              <Link to={SCHUBLADE.appPath} className="mkt-btn mkt-btn-primary">
                Schublade öffnen
              </Link>
              <Link to="/preise" className="mkt-btn mkt-btn-ghost">
                Preise (bald)
              </Link>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <div className="mkt-phone mkt-phone-hero">
              <img
                src={shotSchublade}
                alt="Die Schublade: Eingang, Zum Holen, einen Schritt holen"
                width={390}
                height={780}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-flow">
        <h2>So läuft’s</h2>
        <p className="mkt-section-lead">
          Drei ruhige Bewegungen — Vorrat statt zweiter To-do-Liste.
        </p>
        <ol className="mkt-steps">
          <li>
            <span>Ablegen</span>
            <p>Gedanken und Vorhaben kurz reinwerfen. Kein Datum, keine Pflichtfelder.</p>
          </li>
          <li>
            <span>Zerlegen</span>
            <p>Zu großes wird in 3–5 greifbare Schritte — mit KI-Hilfe oder von Hand.</p>
          </li>
          <li>
            <span>Holen</span>
            <p>Einen Schritt auf den heutigen Tag. Der Rest bleibt sicher in der Schublade.</p>
          </li>
        </ol>
      </section>

      <section className="mkt-section">
        <h2>Für wen</h2>
        <p className="mkt-section-lead">
          Für Tage mit zu vielen offenen Enden: Du willst nichts vergessen, aber auch nicht alles
          heute anfassen. Die Schublade hält den Vorrat — der Tagesanker den Fokus.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Eigenes Modul, gemeinsame Daten</h2>
        <p className="mkt-section-lead">
          {SCHUBLADE.name} ist separat nutz- und später einzeln erwerbbar. Zusammen mit {SITE.name}{' '}
          teilst du Sync und Stand — zwei Einstiege, eine Pflege. Bundle wird günstiger als beides
          einzeln.
        </p>
        <div className="mkt-hero-actions mkt-drawer-teaser-actions">
          <Link to="/" className="mkt-btn mkt-btn-ghost">
            Zum Tagesanker
          </Link>
        </div>
      </section>

      <section className="mkt-section mkt-cta-band">
        <h2>Schublade ausprobieren</h2>
        <p>In der Testphase kostenlos — ohne Checkout, ohne Druck.</p>
        <Link to={SCHUBLADE.appPath} className="mkt-btn mkt-btn-primary">
          Zur App
        </Link>
      </section>
    </main>
  )
}
