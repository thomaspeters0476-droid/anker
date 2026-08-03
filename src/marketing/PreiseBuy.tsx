import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CheckoutInterval, CheckoutProduct } from '../billing/entitlements'

type BusyKey = `${CheckoutProduct}:${CheckoutInterval}` | null

const PRODUCTS: {
  id: CheckoutProduct
  title: string
  month: string
  year: string
  blurb: string
}[] = [
  {
    id: 'tagesanker',
    title: 'Tagesanker',
    month: '3,49 € / Monat',
    year: '34,90 € / Jahr',
    blurb: 'Fokus für den Tag — eine Sache nach der anderen.',
  },
  {
    id: 'schublade',
    title: 'Die Schublade',
    month: '4,99 € / Monat',
    year: '49,90 € / Jahr',
    blurb: 'Ablegen, zerlegen, Schritte holen — inkl. KI im Abo.',
  },
  {
    id: 'bundle',
    title: 'Bundle',
    month: '7,49 € / Monat',
    year: '74,90 € / Jahr',
    blurb: 'Beides zusammen — günstiger als einzeln.',
  },
]

export function PreiseBuy() {
  const [busy, setBusy] = useState<BusyKey>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    void import('../sync/auth').then(({ getSession }) =>
      getSession().then((s) => setSignedIn(Boolean(s))),
    )
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout === 'success') {
      setMsg('Checkout ok — Trial läuft, sobald Stripe bestätigt hat.')
    } else if (checkout === 'cancel') {
      setMsg('Checkout abgebrochen — nichts wurde berechnet.')
    }
    if (checkout) {
      params.delete('checkout')
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
      window.history.replaceState({}, '', next)
    }
  }, [])

  async function buy(product: CheckoutProduct, interval: CheckoutInterval) {
    setMsg(null)
    const [{ getSession }, { startSubscriptionCheckout }] = await Promise.all([
      import('../sync/auth'),
      import('../billing/entitlements'),
    ])
    const session = await getSession()
    if (!session) {
      setSignedIn(false)
      setMsg('Bitte zuerst in der App unter Sync anmelden — dann Trial starten.')
      return
    }
    setSignedIn(true)
    const key: BusyKey = `${product}:${interval}`
    setBusy(key)
    const result = await startSubscriptionCheckout({ product, interval })
    setBusy(null)
    if (!result.ok) {
      if (result.error === 'checkout_disabled') {
        setMsg(
          'Checkout ist vorbereitet, öffentlich noch aus (Beta). Sobald freigeschaltet: ohne Zahlungsdaten kein Trial, dann Abo.',
        )
      } else if (result.error === 'not_signed_in') {
        setMsg('Bitte zuerst in der App unter Sync anmelden.')
      } else {
        setMsg('Checkout hat nicht geklappt. Kurz später nochmal.')
      }
      return
    }
    window.location.href = result.url
  }

  return (
    <div className="mkt-price-buy">
      <p className="mkt-price-trial-note">
        <strong>7 Tage Trial</strong> — ohne Zahlungsdaten startet kein Trial.
        Erste Abbuchung erst danach, wenn du nicht vorher kündigst. Sync ist
        optional; Konto-Anmeldung nur für Kauf/Trial.
      </p>

      {signedIn === false && (
        <p className="mkt-price-login">
          Noch nicht angemeldet?{' '}
          <Link to="/app">App öffnen</Link> → Einstellungen → Sync, dann hierher
          zurück.
        </p>
      )}

      <div className="mkt-price-slots">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="mkt-price-slot">
            <h2>{p.title}</h2>
            <p className="mkt-price-amount">
              {p.month} · {p.year}
            </p>
            <p>{p.blurb}</p>
            <div className="mkt-price-buy-actions">
              <button
                type="button"
                className="mkt-btn mkt-btn-primary"
                disabled={busy != null}
                onClick={() => void buy(p.id, 'month')}
              >
                {busy === `${p.id}:month`
                  ? 'Weiter …'
                  : '7 Tage testen (Monat)'}
              </button>
              <button
                type="button"
                className="mkt-btn mkt-btn-ghost"
                disabled={busy != null}
                onClick={() => void buy(p.id, 'year')}
              >
                {busy === `${p.id}:year`
                  ? 'Weiter …'
                  : '7 Tage testen (Jahr)'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <p className="mkt-price-buy-msg" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}
