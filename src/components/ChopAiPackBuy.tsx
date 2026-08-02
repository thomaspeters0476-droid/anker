import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { startChopPackCheckout } from '../drawer/chopAiQuota'
import {
  CHOP_PACK_ORDER,
  CHOP_PACKS,
  formatEuroFromCents,
  type ChopPackId,
} from '../drawer/chopPacks'
import { getSession } from '../sync/auth'

type Props = {
  compact?: boolean
}

/** Nachkauf S/M/L — braucht Sync-Login */
export function ChopAiPackBuy({ compact }: Props) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState<ChopPackId | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function buy(pack: ChopPackId) {
    setMsg(null)
    const session = await getSession()
    if (!session) {
      setMsg(t('drawer.chopAiPackNeedLogin'))
      return
    }
    setBusy(pack)
    const result = await startChopPackCheckout(pack)
    setBusy(null)
    if (!result.ok) {
      if (result.error === 'checkout_disabled') {
        setMsg(t('drawer.chopAiPackSoon'))
      } else if (result.error === 'not_signed_in') {
        setMsg(t('drawer.chopAiPackNeedLogin'))
      } else {
        setMsg(t('drawer.chopAiPackError'))
      }
      return
    }
    window.location.href = result.url
  }

  return (
    <div className={`chop-pack-buy${compact ? ' chop-pack-buy--compact' : ''}`}>
      <p className="block-hint">{t('drawer.chopAiPackLead')}</p>
      <div className="chop-pack-buy-actions">
        {CHOP_PACK_ORDER.map((id) => {
          const pack = CHOP_PACKS[id]
          const price = formatEuroFromCents(pack.priceCents, i18n.language)
          return (
            <button
              key={id}
              type="button"
              className="secondary sm"
              disabled={busy != null}
              onClick={() => void buy(id)}
            >
              {busy === id
                ? t('drawer.chopAiPackBusy')
                : t('drawer.chopAiPackButton', {
                    size: id.toUpperCase(),
                    credits: pack.credits,
                    price,
                  })}
            </button>
          )
        })}
      </div>
      {msg && (
        <p className="block-hint" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}
