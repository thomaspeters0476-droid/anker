import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isLikelyAndroid, isLikelyIos, isStandaloneApp } from '../pwa'

type Props = {
  compact?: boolean
}

function emphasizeParts(text: string, parts: string[]): ReactNode {
  if (parts.length === 0) return text
  const [first, ...rest] = parts
  const i = text.indexOf(first)
  if (i < 0) return emphasizeParts(text, rest)
  return (
    <>
      {text.slice(0, i)}
      <strong>{first}</strong>
      {emphasizeParts(text.slice(i + first.length), rest)}
    </>
  )
}

export function PwaGuide({ compact = false }: Props) {
  const { t } = useTranslation()
  const installed = isStandaloneApp()
  const ios = isLikelyIos()
  const android = isLikelyAndroid()

  if (installed) {
    const strong = t('pwa.installedStrong')
    const full = t('pwa.installed')
    return (
      <div className="pwa-guide installed">
        <p>
          <strong>{strong}</strong>
          {full.startsWith(strong) ? full.slice(strong.length) : ` ${full}`}
        </p>
      </div>
    )
  }

  return (
    <div className={`pwa-guide ${compact ? 'compact' : ''}`}>
      <h3>{t('pwa.title')}</h3>
      <p className="pwa-lead">{t('pwa.lead')}</p>

      <div className={`pwa-cols ${ios ? 'prefer-ios' : ''} ${android ? 'prefer-android' : ''}`}>
        <article className="pwa-card">
          <h4>{t('pwa.ios.title')}</h4>
          <ol>
            <li>
              {emphasizeParts(t('pwa.ios.step1'), [t('pwa.ios.step1Strong')])}
            </li>
            <li>
              {emphasizeParts(t('pwa.ios.step2'), [t('pwa.ios.step2Strong')])}
            </li>
            <li>
              {emphasizeParts(t('pwa.ios.step3'), [t('pwa.ios.step3Strong')])}
            </li>
            <li>{t('pwa.ios.step4')}</li>
            <li>
              {emphasizeParts(t('pwa.ios.step5'), [t('pwa.ios.step5Strong')])}
            </li>
          </ol>
          <p className="pwa-note">{t('pwa.ios.note')}</p>
        </article>

        <article className="pwa-card">
          <h4>{t('pwa.android.title')}</h4>
          <ol>
            <li>
              {emphasizeParts(t('pwa.android.step1'), [
                t('pwa.android.step1Strong'),
              ])}
            </li>
            <li>
              {emphasizeParts(t('pwa.android.step2'), [
                t('pwa.android.step2a'),
                t('pwa.android.step2b'),
              ])}
            </li>
            <li>
              {emphasizeParts(t('pwa.android.step3'), [
                t('pwa.android.step3a'),
                t('pwa.android.step3b'),
              ])}
            </li>
            <li>{t('pwa.android.step4')}</li>
            <li>
              {emphasizeParts(t('pwa.android.step5'), [
                t('pwa.android.step5Strong'),
              ])}
            </li>
          </ol>
          <p className="pwa-note">{t('pwa.android.note')}</p>
        </article>
      </div>

      <p className="pwa-foot">{t('pwa.foot')}</p>
    </div>
  )
}
