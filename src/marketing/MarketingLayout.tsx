import { Link, NavLink, Outlet } from 'react-router-dom'
import { SITE } from './site'
import './marketing.css'

export function MarketingLayout() {
  return (
    <div className="mkt">
      <header className="mkt-header">
        <Link to="/" className="mkt-logo">
          <span className="mkt-mark" aria-hidden />
          <span className="mkt-logo-text">{SITE.name}</span>
        </Link>
        <nav className="mkt-nav" aria-label="Hauptnavigation">
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/preise">Preise</NavLink>
          <Link to="/app" className="mkt-nav-cta">
            App öffnen
          </Link>
        </nav>
      </header>
      <Outlet />
      <footer className="mkt-footer">
        <div className="mkt-footer-brand">
          <strong>{SITE.name}</strong>
          <p>{SITE.tagline}</p>
        </div>
        <div className="mkt-footer-links">
          <Link to="/app">App</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/preise">Preise</Link>
          <Link to="/impressum">Impressum</Link>
          <Link to="/datenschutz">Datenschutz</Link>
          <Link to="/agb">AGB</Link>
          <Link to="/widerruf">Widerruf</Link>
        </div>
        <p className="mkt-footer-copy">
          © {new Date().getFullYear()} {SITE.name}
        </p>
      </footer>
    </div>
  )
}
