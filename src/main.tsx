import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { setAppLocale } from './i18n'
import { loadPrefs } from './storage'
import { applyProductShell, productShellFromPath } from './pwa'
import { MarketingLayout } from './marketing/MarketingLayout'
import { LandingPage } from './marketing/LandingPage'
import { BlogIndexPage } from './marketing/BlogIndexPage'
import { BlogPostPage } from './marketing/BlogPostPage'
import { PreisePage } from './marketing/PreisePage'
import {
  AgbPage,
  DatenschutzPage,
  ImpressumPage,
  WiderrufPage,
} from './marketing/LegalPages'

const App = lazy(() => import('./App.tsx'))
const SchubladeApp = lazy(() => import('./SchubladeApp.tsx'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function ProductShellMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    applyProductShell(productShellFromPath(pathname))
  }, [pathname])
  return null
}

function useAppBoot() {
  useEffect(() => {
    void setAppLocale(loadPrefs().locale)
    registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        void registration?.update()
      },
    })
  }, [])
}

function RouteFallback() {
  return <div className="app-route-fallback" aria-busy="true" />
}

function AppRoute() {
  useAppBoot()
  return (
    <div className="app-route">
      <Suspense fallback={<RouteFallback />}>
        <App />
      </Suspense>
    </div>
  )
}

function SchubladeRoute() {
  useAppBoot()
  return (
    <div className="app-route">
      <Suspense fallback={<RouteFallback />}>
        <SchubladeApp />
      </Suspense>
    </div>
  )
}

void setAppLocale(loadPrefs().locale)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <ProductShellMeta />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="blog" element={<BlogIndexPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="preise" element={<PreisePage />} />
          <Route path="impressum" element={<ImpressumPage />} />
          <Route path="datenschutz" element={<DatenschutzPage />} />
          <Route path="agb" element={<AgbPage />} />
          <Route path="widerruf" element={<WiderrufPage />} />
        </Route>
        <Route path="app/*" element={<AppRoute />} />
        <Route path="schublade/*" element={<SchubladeRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
