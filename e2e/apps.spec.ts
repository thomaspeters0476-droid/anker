import { test, expect } from '@playwright/test'
import { seedAppReady } from './fixtures/seed'

test.describe('Apps (mit Seed)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAppReady(page)
  })

  test('Tagesanker /app — Shell ohne Intro', async ({ page }) => {
    await page.goto('/app')
    await expect(page.locator('.brand-name')).toContainText(/Tagesanker/i)
    await expect(page.getByRole('button', { name: /Ruhe|Calm/i })).toBeVisible()
    // Intro-Tour weg (Text „Einführung“ kann in Einstellungen noch vorkommen)
    await expect(
      page.getByRole('region', { name: /Einführung|Introduction/i }),
    ).toHaveCount(0)
  })

  test('Schublade /schublade — Shell ohne Intro', async ({ page }) => {
    await page.goto('/schublade')
    await expect(page.locator('.brand-name')).toContainText(/Schublade/i)
    await expect(
      page.getByRole('heading', { name: /Jetzt dran|Now/i }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('Schublade — Einführung nochmal aus Einstellungen', async ({
    page,
  }) => {
    await page.goto('/schublade')
    await page.getByRole('button', { name: /Einstellungen|Settings/i }).click()
    await page
      .getByText(/Hilfe & Oberfläche|Help & surface/i)
      .first()
      .click()
    await page
      .getByRole('button', {
        name: /Einführung nochmal|Show introduction again/i,
      })
      .click()
    await expect(
      page.getByRole('region', { name: /Einführung Schublade|Drawer introduction/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Eigene App|Its own app/i }),
    ).toBeVisible()
  })

  test('Produkt-Nav — Wechsel Anker ↔ Schublade', async ({ page }) => {
    await page.goto('/app')
    const nav = page.getByRole('navigation', { name: /Apps/i })
    await expect(nav).toBeVisible()
    await nav.getByRole('link', { name: /Schublade|Drawer/i }).click()
    await expect(page).toHaveURL(/\/schublade/)
    await expect(page.locator('.brand-name')).toContainText(/Schublade/i)

    await page
      .getByRole('navigation', { name: /Apps/i })
      .getByRole('link', { name: /Heute|Today|Tagesanker/i })
      .click()
    await expect(page).toHaveURL(/\/app/)
    await expect(page.locator('.brand-name')).toContainText(/Tagesanker/i)
  })
})

test.describe('Apps (frisch)', () => {
  test('Erste Intro-Tour erscheint ohne Seed', async ({ page }) => {
    await page.goto('/app')
    await expect(
      page.getByRole('region', { name: /Einführung|Introduction/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Weiter|Next|Loslegen|Get started/i }),
    ).toBeVisible()
  })
})
