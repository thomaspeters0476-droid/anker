import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { blogPosts, formatPostDate } from './blog'
import { setPageMeta, SITE } from './site'

const SHOTS = [
  {
    src: '/marketing/shot-plan.svg',
    label: 'Plan',
    alt: 'Tagesanker Plan: Kapazität und wenige Aufgaben',
  },
  {
    src: '/marketing/shot-focus.svg',
    label: 'Fokus',
    alt: 'Tagesanker Fokus: eine Sache im Vordergrund',
  },
  {
    src: '/marketing/shot-done.svg',
    label: 'Feierabend',
    alt: 'Tagesanker Feierabend: Tag abschließen',
  },
] as const

export function LandingPage() {
  useEffect(() => {
    setPageMeta(`${SITE.name} — ${SITE.tagline}`, SITE.description)
  }, [])

  const teaser = blogPosts.slice(0, 3)

  return (
    <main className="mkt-main">
      <section className="mkt-hero">
        <div className="mkt-hero-glow" aria-hidden />
        <div className="mkt-hero-grid">
          <div className="mkt-hero-copy">
            <p className="mkt-hero-brand">{SITE.name}</p>
            <h1 className="mkt-hero-title">Eine Sache. Dann die nächste.</h1>
            <p className="mkt-hero-lead">
              Der Tag als Anker — realistisch planen, fokussieren, zurückfinden. Ohne Scores und ohne
              Druck.
            </p>
            <div className="mkt-hero-actions">
              <Link to="/app" className="mkt-btn mkt-btn-primary">
                Kostenlos starten
              </Link>
              <Link to="/blog" className="mkt-btn mkt-btn-ghost">
                Blog lesen
              </Link>
            </div>
          </div>
          <div className="mkt-hero-visual" aria-hidden={false}>
            <div className="mkt-phone mkt-phone-hero">
              <img src={SHOTS[0].src} alt={SHOTS[0].alt} width={390} height={780} />
            </div>
            <div className="mkt-phone mkt-phone-stack">
              <img src={SHOTS[1].src} alt="" width={390} height={780} />
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-shots">
        <h2>So sieht der Tag aus</h2>
        <p className="mkt-section-lead">
          Drei ruhige Schritte — ohne Dashboard und ohne Punktejagd.
        </p>
        <div className="mkt-shot-row">
          {SHOTS.map((shot) => (
            <figure key={shot.label} className="mkt-shot">
              <div className="mkt-phone">
                <img src={shot.src} alt={shot.alt} width={390} height={780} loading="lazy" />
              </div>
              <figcaption>{shot.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <h2>Halt statt Optimierung</h2>
        <p className="mkt-section-lead">
          Tagesanker ist für Tage, an denen die Liste zu laut ist. Weniger planen. Klarer anfangen.
        </p>
      </section>

      <section className="mkt-section mkt-flow">
        <h2>So läuft der Tag</h2>
        <ol className="mkt-steps">
          <li>
            <span>Plan</span>
            <p>Kapazität wählen, wenige Dinge setzen — Alltagsanker inklusive.</p>
          </li>
          <li>
            <span>Fokus</span>
            <p>Eine Sache. Geistesblitze parken. Bei Bedarf kurz runterfahren.</p>
          </li>
          <li>
            <span>Feierabend</span>
            <p>Abschließen. Offenes darf morgen wieder auftauchen.</p>
          </li>
        </ol>
      </section>

      <section className="mkt-section">
        <h2>Für wen</h2>
        <p className="mkt-section-lead">
          Für Menschen mit ADHS oder overloadetem Alltag, die Orientierung wollen — keine weitere
          Bewertungsmaschine.
        </p>
      </section>

      <section className="mkt-section mkt-blog-teaser">
        <div className="mkt-section-head">
          <h2>Aus dem Blog</h2>
          <Link to="/blog">Alle Beiträge</Link>
        </div>
        <ul className="mkt-post-list">
          {teaser.map((post) => (
            <li key={post.slug}>
              <Link to={`/blog/${post.slug}`}>
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <strong>{post.title}</strong>
                <span>{post.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section mkt-cta-band">
        <h2>Bereit für einen ruhigeren Start?</h2>
        <p>Die App ist in der Testphase kostenlos nutzbar.</p>
        <Link to="/app" className="mkt-btn mkt-btn-primary">
          App öffnen
        </Link>
      </section>
    </main>
  )
}
