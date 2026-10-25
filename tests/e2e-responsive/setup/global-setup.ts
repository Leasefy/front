import type { FullConfig } from '@playwright/test';

import { resetBreaker } from '../support/breaker';
import { preflight } from '../support/preflight';

/** Fail fast on a dead server and start every run with a clean circuit breaker. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  resetBreaker();
  if (process.env.RESPONSIVE_PREFLIGHT === '0') return;
  const baseURL = config.projects[0]?.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
  const { status } = await preflight(baseURL);
  console.log(`Preflight OK: ${baseURL} answered HTTP ${status}`);
}
