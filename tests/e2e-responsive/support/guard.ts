import type { BrowserContext } from '@playwright/test';

/**
 * READ-ONLY GUARD. The responsive suite only navigates, scrolls and opens/closes UI. As a
 * second line of defence (the first is the interaction allowlist in `interactions.ts`) every
 * request that is not a read is aborted at the network layer, so an accidental click can
 * never mutate dev data.
 *
 * Aborted requests are recorded and surfaced as informational `blocked-mutation` findings, so
 * a page that legitimately POSTs on load (e.g. a read-only search over POST) is visible in
 * the report instead of silently half-working.
 *
 * `RESPONSIVE_ALLOW_POST` is an optional regular expression of URLs that may be sent anyway
 * (use only for endpoints known to be read-only).
 */

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Supabase access-token refresh (`POST /auth/v1/token?grant_type=refresh_token`). It only
 * renews the session already in use and writes no application data; blocking it would log the
 * persona out after the first hour of a long run.
 */
const SESSION_REFRESH = /\/auth\/v1\/token\?grant_type=refresh_token/;

export interface BlockedRequest {
  method: string;
  url: string;
}

export interface Guard {
  blocked: BlockedRequest[];
}

export async function installReadOnlyGuard(context: BrowserContext): Promise<Guard> {
  const guard: Guard = { blocked: [] };
  const allow = process.env.RESPONSIVE_ALLOW_POST ? new RegExp(process.env.RESPONSIVE_ALLOW_POST) : null;
  await context.route('**/*', async (route) => {
    const request = route.request();
    const method = request.method();
    if (READ_METHODS.has(method) || SESSION_REFRESH.test(request.url()) || (allow && allow.test(request.url()))) {
      await route.continue();
      return;
    }
    guard.blocked.push({ method, url: request.url().slice(0, 200) });
    await route.abort('blockedbyclient');
  });
  return guard;
}
