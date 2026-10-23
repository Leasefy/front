import { defineConfig, devices } from '@playwright/test';

import { DEVICES, metaFor } from './tests/e2e-responsive/support/devices';
import { loadE2eEnv } from './tests/e2e-responsive/support/env';

/**
 * Responsive e2e sweep (T-0173). SEPARATE from playwright.config.ts: that config and its
 * mocked specs are untouched.
 *
 *   pnpm e2e:responsive          every device in the approved matrix
 *   pnpm e2e:responsive:fast     FAST subset (iPhone 11, iPhone 12-14, Pixel 7, Galaxy S23,
 *                                Desktop Chrome 1366x768) - the one to use while fixing
 *
 * Environment:
 *   E2E_ENV_FILE            credentials file (default ./.env.e2e.local, relative to the front root)
 *   PLAYWRIGHT_BASE_URL     default http://localhost:3001
 *   RESPONSIVE_FAST=1       restrict to the FAST subset (set by the :fast script)
 *   RESPONSIVE_WORKERS      parallel workers (default 4; the dev server is the bottleneck)
 *   RESPONSIVE_REPORT_DIR   findings.json / summary.md / screenshots (default ./responsive-report)
 *   RESPONSIVE_WARMUP       0 = skip the warm-up pass, 1 = force it; default: on for localhost only
 *                           (RESPONSIVE_WARMUP_ROUTE_MS = per-route navigation cap, default 90000)
 *   RESPONSIVE_REUSE_AUTH=1 / RESPONSIVE_REUSE_RESOLVED=1   skip re-login / re-crawl when the files from
 *                           a previous run exist (iterating on the suite)
 *   RESPONSIVE_IPHONE_ENGINE=chromium  run the iPhone projects on Chromium (WebKit hangs on some Windows boxes)
 *   RESPONSIVE_PREFLIGHT=0  skip the start-up GET of the base URL (default: on; a dead server aborts the run)
 *   RESPONSIVE_BREAKER_N    consecutive refused/timed-out navigations that abort the run (default 6)
 *   RESPONSIVE_ALLOW_POST   regex of URLs the read-only guard may let through (default none)
 *
 * Recommended target: `pnpm build && npx next start -p 3001` (no dev overlay, no per-route
 * compile, far faster and steadier than `next dev`); then RESPONSIVE_WARMUP=0 is enough.
 *
 * Browsers: `npx playwright install chromium firefox webkit` and, for the Edge projects,
 * Microsoft Edge itself (`npx playwright install msedge`). A missing browser makes its
 * projects fail loudly with Playwright's "executable doesn't exist" error.
 */
loadE2eEnv();

const fastOnly = process.env.RESPONSIVE_FAST === '1';
const selected = DEVICES.filter((d) => !fastOnly || d.fast);

export default defineConfig({
  testDir: './tests/e2e-responsive',
  // Preflight GET of the base URL + circuit-breaker reset: a dead server fails in seconds, not 30 minutes.
  globalSetup: './tests/e2e-responsive/setup/global-setup.ts',
  outputDir: './test-results-responsive',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: Number(process.env.RESPONSIVE_RETRIES ?? 1),
  workers: Number(process.env.RESPONSIVE_WORKERS ?? 4),
  timeout: 180_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-responsive' }],
    ['./tests/e2e-responsive/reporter/findings-reporter.ts'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    colorScheme: 'light',
    locale: 'es-CO',
    trace: 'off',
    screenshot: 'off',
  },
  // No webServer: the stack (front :3001, back :3000, agent :4000) must already be running.
  projects: [
    {
      name: 'setup-auth',
      testMatch: /setup\/auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'setup-resolve',
      testMatch: /setup\/resolve\.setup\.ts/,
      dependencies: ['setup-auth'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Visits every route once per persona so cold `next dev` compiles do not become page
      // errors. Skips itself against non-local targets or with RESPONSIVE_WARMUP=0.
      name: 'setup-warmup',
      retries: 0,
      testMatch: /setup\/warmup\.setup\.ts/,
      dependencies: ['setup-resolve'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    ...selected.map((device) => ({
      name: device.id,
      testMatch: /responsive\.spec\.ts/,
      dependencies: ['setup-warmup'],
      metadata: metaFor(device),
      use: device.use,
    })),
  ],
});
