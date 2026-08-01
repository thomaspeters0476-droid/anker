import { useTranslation } from 'react-i18next'

/** Einstellungen in der Topbar — nicht im Morgen-Flow verstecken */
export function SettingsGear({
  onClick,
  open,
}: {
  onClick: () => void
  open?: boolean
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={`settings-gear${open ? ' on' : ''}`}
      onClick={onClick}
      aria-label={t('settings.summary')}
      aria-expanded={open}
      title={t('settings.summary')}
    >
      <span className="settings-gear-icon" aria-hidden />
      <span className="settings-gear-label">{t('settings.summary')}</span>
    </button>
  )
}
