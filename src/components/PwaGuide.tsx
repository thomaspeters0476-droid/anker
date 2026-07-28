import { isLikelyAndroid, isLikelyIos, isStandaloneApp } from '../pwa'

type Props = {
  compact?: boolean
}

export function PwaGuide({ compact = false }: Props) {
  const installed = isStandaloneApp()
  const ios = isLikelyIos()
  const android = isLikelyAndroid()

  if (installed) {
    return (
      <div className="pwa-guide installed">
        <p>
          <strong>Gut:</strong> Tagesanker ist als App auf dem Gerät. Erinnerungen
          funktionieren am besten so.
        </p>
      </div>
    )
  }

  return (
    <div className={`pwa-guide ${compact ? 'compact' : ''}`}>
      <h3>Erinnerungen am Handy</h3>
      <p className="pwa-lead">
        Kurz gesagt: Tagesanker einmal auf den Startbildschirm legen. Dann wie eine
        normale App öffnen — und Mitteilungen erlauben.
      </p>

      <div className={`pwa-cols ${ios ? 'prefer-ios' : ''} ${android ? 'prefer-android' : ''}`}>
        <article className="pwa-card">
          <h4>iPhone</h4>
          <ol>
            <li>Unten auf <strong>Teilen</strong> tippen (Quadrat mit Pfeil).</li>
            <li>
              Nach unten scrollen → <strong>Zum Home-Bildschirm</strong>.
            </li>
            <li>
              <strong>Hinzufügen</strong> tippen.
            </li>
            <li>
              Tagesanker vom Home-Bildschirm öffnen (nicht über Safari).
            </li>
            <li>
              Wenn gefragt: <strong>Mitteilungen erlauben</strong>.
            </li>
          </ol>
          <p className="pwa-note">
            Tipp: Am iPhone geht das nur über Safari — nicht über Chrome.
          </p>
        </article>

        <article className="pwa-card">
          <h4>Android</h4>
          <ol>
            <li>
              Oben rechts auf die <strong>drei Punkte</strong> tippen.
            </li>
            <li>
              <strong>App installieren</strong> oder{' '}
              <strong>Zum Startbildschirm</strong> wählen.
            </li>
            <li>
              <strong>Installieren</strong> / <strong>Hinzufügen</strong>.
            </li>
            <li>Tagesanker vom Startbildschirm öffnen.</li>
            <li>
              Wenn gefragt: <strong>Benachrichtigungen erlauben</strong>.
            </li>
          </ol>
          <p className="pwa-note">Am besten mit Chrome.</p>
        </article>
      </div>

      <p className="pwa-foot">
        Fertig. Du brauchst keinen App-Store — nur diese Website einmal speichern.
      </p>
    </div>
  )
}
