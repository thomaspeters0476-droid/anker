import { useTranslation } from 'react-i18next'
import type { SyncConflict } from '../sync'

type Props = {
  conflict: SyncConflict | null
  notice: string | null
  onKeepLocal: () => void
  onUseCloud: () => void
  onOpenSync?: () => void
  onDismissNotice?: () => void
}

/** Visible at top — conflict/notices must not hide in nested settings. */
export function SyncConflictBanner({
  conflict,
  notice,
  onKeepLocal,
  onUseCloud,
  onOpenSync,
  onDismissNotice,
}: Props) {
  const { t } = useTranslation()
  if (!conflict && !notice) return null

  return (
    <div className="sync-top-banner" role="status">
      {conflict && (
        <div className="sync-top-banner-conflict">
          <p>{t('sync.conflict.body')}</p>
          <div className="sync-top-banner-actions">
            <button type="button" className="primary sm" onClick={onKeepLocal}>
              {t('sync.conflict.keepLocal')}
            </button>
            <button type="button" className="ghost sm" onClick={onUseCloud}>
              {t('sync.conflict.useCloud')}
            </button>
          </div>
        </div>
      )}
      {!conflict && notice && (
        <div className="sync-top-banner-notice">
          <p>{notice}</p>
          <div className="sync-top-banner-actions">
            {onOpenSync && (
              <button type="button" className="ghost sm" onClick={onOpenSync}>
                {t('sync.openSettings')}
              </button>
            )}
            {onDismissNotice && (
              <button
                type="button"
                className="ghost sm"
                onClick={onDismissNotice}
              >
                {t('common.ok')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
