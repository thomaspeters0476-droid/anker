import { Suspense, lazy, useEffect, useState } from 'react'
import { bootI18n, ensureNs } from '../i18n'
import { loadStoredLocale } from '../prefsLocale'

const App = lazy(() => import('../App.tsx'))

function Fallback() {
  return <div className="app-route-fallback" aria-busy="true" />
}

/** Eigenes Chunk: i18n + App — nicht im Marketing-Entry. */
export default function AppEntry() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const locale = loadStoredLocale()
    let cancelled = false
    void Promise.all([
      bootI18n(locale),
      import('../billing/entitlements').then((m) => m.refreshEntitlements()),
    ]).then(() => {
      if (cancelled) return
      setReady(true)
      void ensureNs('buddy', locale)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return <Fallback />

  return (
    <div className="app-route">
      <Suspense fallback={<Fallback />}>
        <App />
      </Suspense>
    </div>
  )
}
