import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

// E2E_BASE_URL wskazuje gotowy serwer (np. lokalny z bazą stagingową albo adres preview).
// Bez niego Playwright uruchamia `pnpm dev` na porcie 3000, jak dotychczas.
const baseURL = process.env.E2E_BASE_URL
// Domyślnie bundlowany Chromium; E2E_CHANNEL=chrome pozwala użyć zainstalowanego Google Chrome.
const channel = process.env.E2E_CHANNEL ?? 'chromium'
// Testy stron i wysyłki; testy panelu (admin.e2e) wymagają lokalnej bazy i działają tylko w projekcie chromium.
const frontendSpecs = /(frontend|zgloszenia)\.e2e\.spec\.ts/
// Edge (kanał msedge) jest dostępny na Windows (GitHub Actions); na Macu bez Edge projekt jest pomijany.
const withEdge = process.platform === 'win32' || process.env.E2E_EDGE === '1'

/**
 * Przeglądarki: WebKit to silnik Safari w wersji Playwrighta, nie prawdziwy Safari; prawdziwy Mobile Safari
 * sprawdza się osobno w symulatorze iOS (raport etapu 2).
 * Lokalnie na Macu: `npm run test:e2e:cross` (webkit, firefox, iphone). Wszystkie: workflow .github/workflows/e2e.yml.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: baseURL ?? 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel },
    },
    {
      name: 'telefon',
      testMatch: frontendSpecs,
      use: { ...devices['Pixel 7'], channel },
    },
    {
      name: 'webkit',
      testMatch: frontendSpecs,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'firefox',
      testMatch: frontendSpecs,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'iphone',
      testMatch: frontendSpecs,
      use: { ...devices['iPhone 15'] },
    },
    ...(withEdge
      ? [
          {
            name: 'msedge',
            testMatch: frontendSpecs,
            use: { ...devices['Desktop Edge'], channel: 'msedge' },
          },
        ]
      : []),
  ],
  webServer: baseURL
    ? undefined
    : {
        command: 'pnpm dev',
        reuseExistingServer: true,
        url: 'http://localhost:3000',
      },
})
