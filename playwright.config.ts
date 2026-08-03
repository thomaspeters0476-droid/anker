import { defineConfig, devices } from '@playwright/test'

/**
 * E2E gegen lokalen Preview-Build (analog Schwundbuch-Playwright, ohne Staging-Auth).
 *
 *   npm run build
 *   npm run test:e2e
 *
 * Optional gegen Live: E2E_BASE_URL=https://tagesanker.de npm run test:e2e
 */
const port = Number(process.env.E2E_PORT || 4173)
const localBase = `http://127.0.0.1:${port}`
const baseURL = process.env.E2E_BASE_URL?.trim() || localBase
const againstLocal = !process.env.E2E_BASE_URL?.trim()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /marketing\.spec\.ts/,
    },
  ],
  webServer: againstLocal
    ? {
        command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
        url: localBase,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
})
