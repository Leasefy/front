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
  // Phase 31-12: stable visual diff thresholds across font-hinting differences.
  // animations:'disabled' + maxDiffPixelRatio:0.02 mirror the Phase 29-07 +
  // Phase 30 snapshot conventions (per 31-12 plan Task 1).
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Phase 31-12 multi-viewport projects for XR-03 mobile breakpoint coverage.
    // These fan out the phase-31-cobranza-detail.spec.ts snapshots across the
    // 3 viewports the design system targets (sm / md / desktop).
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'iPad Mini',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'Desktop Chrome 1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // No webServer entry — assume dev server is already running locally
  // (cold-starting Next.js dev for every test run is too slow for smoke tests).
})
