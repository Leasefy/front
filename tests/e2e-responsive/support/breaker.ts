import fs from 'node:fs';
import path from 'node:path';

/**
 * Circuit breaker for a dead target server (T-0173 WU-7).
 *
 * Every navigation outcome is appended to a small shared file (workers are separate processes):
 *   S = the server answered, F = connection refused / reset / navigation timeout, T = tripped.
 * N consecutive F (default 6, RESPONSIVE_BREAKER_N) trip the breaker for good: a later success
 * does not reset it, because a server that flaps is not one a sweep can be trusted against.
 *
 * Once tripped, `openAndSettle` stops navigating (no more 75 s waits) and the launcher
 * (scripts/run-responsive.mjs) kills the run and prints BREAKER_BANNER.
 */

export const DEFAULT_BREAKER_N = 6;

export function breakerFile(): string {
  return path.resolve(
    process.env.RESPONSIVE_BREAKER_FILE ?? path.join('tests', 'e2e-responsive', '.auth', 'breaker.log'),
  );
}

export function breakerThreshold(): number {
  const n = Number(process.env.RESPONSIVE_BREAKER_N ?? DEFAULT_BREAKER_N);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_BREAKER_N;
}

const DEAD_SERVER = /ERR_CONNECTION_(REFUSED|RESET|CLOSED|TIMED_OUT)|ERR_EMPTY_RESPONSE|ECONNREFUSED|ECONNRESET|NS_ERROR_CONNECTION_REFUSED|Could not connect to the server|Timeout \d+ms exceeded/i;

/** True for navigation errors that mean "the server is not answering" (not an app-level failure). */
export function isDeadServerError(message: string): boolean {
  return DEAD_SERVER.test(message);
}

/** Pure: given the recorded history, is the breaker tripped? */
export function isTripped(history: string, threshold: number): boolean {
  if (history.includes('T')) return true;
  let run = 0;
  for (let i = history.length - 1; i >= 0 && history[i] === 'F'; i--) run++;
  return run >= threshold;
}

function read(): string {
  try {
    return fs.readFileSync(breakerFile(), 'utf8');
  } catch {
    return '';
  }
}

export function resetBreaker(): void {
  const file = breakerFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '');
}

export function breakerTripped(): boolean {
  return isTripped(read(), breakerThreshold());
}

/** Records one navigation outcome and returns whether the breaker is now tripped. */
export function recordNavigation(outcome: 'ok' | 'dead'): boolean {
  const file = breakerFile();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, outcome === 'ok' ? 'S' : 'F');
    if (isTripped(read(), breakerThreshold())) {
      fs.appendFileSync(file, 'T');
      return true;
    }
  } catch {
    // The breaker must never break a test on its own I/O.
  }
  return false;
}

export function breakerBanner(baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'): string {
  const bar = '!'.repeat(72);
  return [
    '',
    bar,
    'RESPONSIVE SWEEP ABORTED: THE TARGET SERVER STOPPED ANSWERING',
    `${breakerThreshold()} consecutive navigations to ${baseURL} were refused, reset or timed out.`,
    'Everything measured after that point would be noise, so the run was stopped.',
    'The report holds only the tests that finished BEFORE the failure. Restart the server and',
    're-run (RESPONSIVE_REUSE_AUTH=1 RESPONSIVE_REUSE_RESOLVED=1 skips login and crawl).',
    bar,
    '',
  ].join('\n');
}
