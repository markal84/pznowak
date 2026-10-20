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

/**
 * See https://playwright.dev/docs/test-configuration.
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
      testMatch: /frontend\.e2e\.spec\.ts/,
      use: { ...devices['Pixel 7'], channel },
    },
  ],
  webServer: baseURL
    ? undefined
    : {
        command: 'pnpm dev',
        reuseExistingServer: true,
        url: 'http://localhost:3000',
      },
})
