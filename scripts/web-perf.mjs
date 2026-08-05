/**
 * Playwright Performance-Metriken für /app und /schublade (lokaler Preview).
 * Usage: node scripts/web-perf.mjs [baseUrl]
 */
import { chromium } from '@playwright/test'

const base = process.argv[2] || 'http://127.0.0.1:4173'

async function measure(path) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('anker-intro-seen-v4', '1')
    localStorage.setItem('anker-schublade-intro-seen', '1')
    localStorage.setItem('anker-regulate-tip-seen', '1')
    localStorage.setItem('anker-bridge-tip-seen-anker', '1')
    localStorage.setItem('anker-bridge-tip-seen-schublade', '1')
    localStorage.setItem(
      'anker-entitlements-v2',
      JSON.stringify({
        enforced: false,
        tier: null,
        status: 'none',
        canUseTagesanker: true,
        canUseSchublade: true,
        hasPortal: false,
        updatedAt: Date.now(),
      }),
    )
  })
  await page.route('**/api/entitlements', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        enforced: false,
        canUseTagesanker: true,
        canUseSchublade: true,
      }),
    }),
  )

  const t0 = Date.now()
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' })
  const dcl = Date.now() - t0
  const readySel =
    path === '/'
      ? 'h1, .mkt-hero, .brand-name, main'
      : '.brand-name, .intro-screen, .paywall'
  await page.waitForSelector(readySel, { timeout: 20000 })
  const toBrand = Date.now() - t0
  await page.waitForLoadState('networkidle').catch(() => {})
  const idle = Date.now() - t0

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]),
    )
    const resources = performance.getEntriesByType('resource')
    const jsBytes = resources
      .filter((r) => r.name.includes('.js'))
      .reduce((s, r) => s + (r.transferSize || 0), 0)
    const cssBytes = resources
      .filter((r) => r.name.includes('.css'))
      .reduce((s, r) => s + (r.transferSize || 0), 0)
    return {
      fcp: paints['first-contentful-paint'] ?? null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      transferJsKb: Math.round(jsBytes / 1024),
      transferCssKb: Math.round(cssBytes / 1024),
      resourceCount: resources.length,
    }
  })

  await browser.close()
  return { path, dcl, toBrand, idle, ...perf }
}

const rows = []
for (const path of ['/', '/app', '/schublade']) {
  rows.push(await measure(path))
}
console.log(JSON.stringify(rows, null, 2))
