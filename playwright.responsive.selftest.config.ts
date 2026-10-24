import { defineConfig, devices } from '@playwright/test';

/** Self-tests of the responsive suite's own helpers (no app, no login): `pnpm e2e:responsive:selftest`. */
export default defineConfig({
  testDir: './tests/e2e-responsive/selftest',
  testMatch: /\.selftest\.ts$/,
  outputDir: './test-results-responsive-selftest',
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'] },
});
