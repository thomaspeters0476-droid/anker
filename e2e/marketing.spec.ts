import { test, expect } from '@playwright/test'

test.describe('Marketing', () => {
  test('Tagesanker Landing — Brand und CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tagesanker', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Eine Sache/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Beta starten|App öffnen/i }).first(),
    ).toBeVisible()
  })

  test('Schublade Landing — Brand und App-Link', async ({ page }) => {
    await page.goto('/die-schublade')
    await expect(page.getByText('Die Schublade').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Sicher weg/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Schublade öffnen|Zur App/i }).first(),
    ).toBeVisible()
  })

  test('Preise — Trial-Hinweis und Produkte', async ({ page }) => {
    await page.goto('/preise')
    await expect(page.getByRole('heading', { name: 'Preise' })).toBeVisible()
    await expect(page.getByText(/ohne Zahlungsdaten/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tagesanker' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Die Schublade' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bundle' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /7 Tage testen/i }).first(),
    ).toBeVisible()
  })

  test('Rechtliches — Impressum und AGB erreichbar', async ({ page }) => {
    await page.goto('/impressum')
    await expect(page.getByRole('heading', { name: /Impressum/i })).toBeVisible()
    await page.goto('/agb')
    await expect(page.getByRole('heading', { name: /AGB|Allgemeine/i })).toBeVisible()
  })
})
