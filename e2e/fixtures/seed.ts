import type { Page } from '@playwright/test'

/** Intros/Tips aus, Schublade-Brücke an — stabiler App-Smoke. */
export async function seedAppReady(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('anker-intro-seen', '1')
    localStorage.setItem('anker-schublade-intro-seen', '1')
    localStorage.setItem('anker-regulate-tip-seen', '1')
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
