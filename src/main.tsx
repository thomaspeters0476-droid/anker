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
import { applyProductShell, productShellFromPath } from './pwa'
import { MarketingLayout } from './marketing/MarketingLayout'

const LandingPage = lazy(() =>
  import('./marketing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const BlogIndexPage = lazy(() =>
  import('./marketing/BlogIndexPage').then((m) => ({
    default: m.BlogIndexPage,
  })),
)
const BlogPostPage = lazy(() =>
  import('./marketing/BlogPostPage').then((m) => ({
    default: m.BlogPostPage,
  })),
)
const PreisePage = lazy(() =>
  import('./marketing/PreisePage').then((m) => ({ default: m.PreisePage })),
)
const SchubladeLandingPage = lazy(() =>
  import('./marketing/SchubladeLandingPage').then((m) => ({
    default: m.SchubladeLandingPage,
  })),
)
const ImpressumPage = lazy(() =>
  import('./marketing/LegalPages').then((m) => ({ default: m.ImpressumPage })),
)
const DatenschutzPage = lazy(() =>
  import('./marketing/LegalPages').then((m) => ({
    default: m.DatenschutzPage,
  })),
)
const AgbPage = lazy(() =>
  import('./marketing/LegalPages').then((m) => ({ default: m.AgbPage })),
)
const WiderrufPage = lazy(() =>
  import('./marketing/LegalPages').then((m) => ({ default: m.WiderrufPage })),
)
const AppEntry = lazy(() => import('./routes/AppEntry'))
const SchubladeEntry = lazy(() => import('./routes/SchubladeEntry'))

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

function RegisterServiceWorker() {
  useEffect(() => {
    let cancelled = false
    const boot = () => {
      if (cancelled) return
      registerSW({
        immediate: true,
        onRegisteredSW(_url, registration) {
          if (!registration) return
          void registration.update()
          window.setInterval(() => {
            void registration.update()
          }, 60 * 60 * 1000)
        },
      })
    }
    // Nicht mit First-Paint um Bandbreite kämpfen
    const idleId =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(boot, { timeout: 2500 })
        : 0
    const timeoutId =
      idleId === 0 ? window.setTimeout(boot, 1200) : 0
    return () => {
      cancelled = true
      if (idleId && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId)
      }
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])
  return null
}

function PageFallback() {
  return <div className="app-route-fallback" aria-busy="true" />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <ProductShellMeta />
      <RegisterServiceWorker />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="blog" element={<BlogIndexPage />} />
            <Route path="blog/:slug" element={<BlogPostPage />} />
            <Route path="preise" element={<PreisePage />} />
            <Route path="die-schublade" element={<SchubladeLandingPage />} />
            <Route path="impressum" element={<ImpressumPage />} />
            <Route path="datenschutz" element={<DatenschutzPage />} />
            <Route path="agb" element={<AgbPage />} />
            <Route path="widerruf" element={<WiderrufPage />} />
          </Route>
          <Route path="app/*" element={<AppEntry />} />
          <Route path="schublade/*" element={<SchubladeEntry />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
