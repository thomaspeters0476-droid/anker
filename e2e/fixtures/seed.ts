import type { Page } from '@playwright/test'

/** Intros/Tips aus, Entitlements offen — stabiler App-Smoke ohne Live-Paywall. */
export async function seedAppReady(page: Page) {
  await page.route('**/api/entitlements', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        enforced: false,
        tier: null,
        status: 'none',
        canUseTagesanker: true,
        canUseSchublade: true,
        hasPortal: false,
      }),
    })
  })

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
    try {
      const raw = localStorage.getItem('anker-prefs')
      const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      localStorage.setItem(
        'anker-prefs',
        JSON.stringify({ ...prefs, drawerEnabled: true, locale: 'de' }),
      )
    } catch {
      localStorage.setItem(
        'anker-prefs',
        JSON.stringify({ drawerEnabled: true, locale: 'de' }),
      )
    }
  })
}
