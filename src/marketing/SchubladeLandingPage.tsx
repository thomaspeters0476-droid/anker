import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SCHUBLADE, SITE, setPageMeta } from './site'

/** public/-Pfad: nicht als data-URL inlinen (url(#…) bricht sonst im Browser) */
const shotSchublade = '/marketing/shot-schublade.svg'

const SCHUBLADE_POSTS = [
  {
    slug: 'schublade-statt-zweiter-liste',
    title: 'Schublade statt zweiter Liste',
  },
  {
    slug: 'grosse-aufgaben-zerlegen',
    title: 'Zu groß zum Anfangen',
  },
  {
    slug: 'bereit-ohne-berg',
    title: 'Bereit ohne Berg',
  },
] as const

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
                Preise
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

      <section className="mkt-section">
        <h2>Im Blog</h2>
        <p className="mkt-section-lead">
          Drei kurze Texte zum Vorrat, zum Zerlegen und dazu, warum „bereit“ nicht zum Berg werden
          darf.
        </p>
        <ul className="mkt-post-list mkt-drawer-blog-list">
          {SCHUBLADE_POSTS.map((post) => (
            <li key={post.slug}>
              <Link to={`/blog/${post.slug}`}>
                <strong>{post.title}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section mkt-cta-band">
        <h2>Schublade ausprobieren</h2>
        <p>
          Offene Beta — gerade kostenlos. Später: 7 Tage Trial (ohne Zahlungsdaten
          kein Trial), dann Abo — auch ohne Sync. Kein Free.
        </p>
        <Link to={SCHUBLADE.appPath} className="mkt-btn mkt-btn-primary">
          Zur App
        </Link>
      </section>
    </main>
  )
}
