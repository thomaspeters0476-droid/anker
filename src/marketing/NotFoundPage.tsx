import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SITE, setPageMeta } from './site'

export function NotFoundPage() {
  useEffect(() => {
    setPageMeta(`Seite nicht gefunden — ${SITE.name}`, SITE.description, {
      noIndex: true,
    })
  }, [])

  return (
    <main className="mkt-main mkt-narrow">
      <header className="mkt-page-head">
        <h1>Seite nicht gefunden</h1>
        <p>Diese Adresse gibt es hier nicht.</p>
      </header>
      <p>
        <Link to="/">Zur Startseite</Link>
      </p>
    </main>
  )
}
