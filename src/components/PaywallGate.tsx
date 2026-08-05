import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type Props = {
  product: 'tagesanker' | 'schublade'
  signedIn: boolean
  onSignIn?: () => void
}

/** Thin paywall — one message, one path forward. Shown only when enforcement is on. */
export function PaywallGate({ product, signedIn, onSignIn }: Props) {
  const { t } = useTranslation()
  const title =
    product === 'schublade'
      ? t('billing.paywall.schubladeTitle')
      : t('billing.paywall.tagesankerTitle')
  const body =
    product === 'schublade'
      ? t('billing.paywall.schubladeBody')
      : t('billing.paywall.tagesankerBody')

  return (
    <div className="paywall-gate" role="region" aria-label={title}>
      <h2 className="paywall-gate-title">{title}</h2>
      <p className="paywall-gate-body">{body}</p>
      {!signedIn && (
        <p className="paywall-gate-hint">{t('billing.paywall.needSignIn')}</p>
      )}
      <div className="paywall-gate-actions">
        {!signedIn && onSignIn && (
          <button type="button" className="primary" onClick={onSignIn}>
            {t('billing.paywall.signInCta')}
          </button>
        )}
        <Link to="/preise" className="primary">
          {t('billing.paywall.pricesCta')}
        </Link>
      </div>
    </div>
  )
}
