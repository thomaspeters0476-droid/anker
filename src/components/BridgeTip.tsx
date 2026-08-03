import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { BridgeTipSide } from '../bridge/bridgeTip'
import { markBridgeTipSeen } from '../bridge/bridgeTip'

type Props = {
  side: BridgeTipSide
  onDismiss: () => void
}

/** Einmal-Hinweis beim Verbinden — keine volle Intro der anderen App. */
export function BridgeTip({ side, onDismiss }: Props) {
  const { t } = useTranslation()

  function dismiss() {
    markBridgeTipSeen(side)
    onDismiss()
  }

  const title =
    side === 'anker'
      ? t('bridgeTip.anker.title')
      : t('bridgeTip.schublade.title')
  const body =
    side === 'anker' ? t('bridgeTip.anker.body') : t('bridgeTip.schublade.body')
  const cta =
    side === 'anker'
      ? t('bridgeTip.anker.cta')
      : t('bridgeTip.schublade.cta')
  const href = side === 'anker' ? '/schublade' : '/app'

  return (
    <div className="bridge-tip" role="status">
      <p>
        <strong>{title}</strong> {body}
      </p>
      <div className="bridge-tip-actions">
        <Link to={href} className="secondary sm" onClick={dismiss}>
          {cta}
        </Link>
        <button type="button" className="ghost sm" onClick={dismiss}>
          {t('bridgeTip.dismiss')}
        </button>
      </div>
    </div>
  )
}
