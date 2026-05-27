import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — minimal smoke-test setup.
 *
 * Specs that hit pages behind the inmobiliaria layout (panel/*) require an
 * authenticated session. Provide one via:
 *   - storageState.json fixture (preferred for CI), OR
 *   - manual login in headed mode before running specs against an already-running dev server.
 *
 * The cobranza overview spec mocks /cartera/overview at the network level, so
 * the AGENT backend does NOT need to be running for those tests — but the mvp
 * dev server + a logged-in user are still required.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer entry — assume dev server is already running locally
  // (cold-starting Next.js dev for every test run is too slow for smoke tests).
})
