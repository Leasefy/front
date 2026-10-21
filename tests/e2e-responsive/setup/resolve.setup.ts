import fs from 'node:fs';

import { test as setup } from '@playwright/test';

import { installReadOnlyGuard } from '../support/guard';
import { AUTH_DIR, PERSONAS, authFile, resolvedFile } from '../support/personas';
import { waitForSettled } from '../support/page-ready';
import {
  isDynamic,
  pathnameOf,
  resolvePattern,
  type Resolution,
  type ResolveContext,
} from '../support/resolve';
import { LIST_SOURCES, ROUTES, SHARES_RESOLVED_IDS_WITH } from '../support/routes';

/**
 * Resolves every `[param]` route to a real path by following the first matching link on the
 * parent list page, with the persona's own session. No id is ever hardcoded. Output:
 * .auth/resolved-<persona>.json  ->  { "<pattern>": { path | null, reason? } }
 *
 * Read-only: pages are only navigated.
 */
setup.describe.configure({ mode: 'parallel' });
setup.setTimeout(30 * 60_000);

for (const persona of PERSONAS) {
  if (SHARES_RESOLVED_IDS_WITH[persona.id]) continue;
  const dynamic = [...new Set(ROUTES[persona.id].filter(isDynamic).map(pathnameOf))];
  if (!dynamic.length) continue;

  setup(`resolve ids: ${persona.id}`, async ({ browser, baseURL }) => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const state = authFile(persona.id);
    const output: Record<string, Resolution> = {};

    if (persona.envPrefix && !fs.existsSync(state)) {
      for (const pattern of dynamic) output[pattern] = { path: null, reason: 'persona has no session (login skipped or failed)' };
      fs.writeFileSync(resolvedFile(persona.id), JSON.stringify(output, null, 2));
      return;
    }

    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
      ...(persona.envPrefix ? { storageState: state } : {}),
    });
    await installReadOnlyGuard(context);
    const page = await context.newPage();
    const linkCache = new Map<string, string[]>();

    const ctx: ResolveContext = {
      listSources: LIST_SOURCES,
      staticRoutes: new Set(ROUTES[persona.id].filter((r) => !isDynamic(r)).map(pathnameOf)),
      memo: new Map(),
      getLinks: async (p: string) => {
        const cached = linkCache.get(p);
        if (cached) return cached;
        await page.goto(p, { waitUntil: 'domcontentloaded', timeout: 75_000 });
        await waitForSettled(page);
        const hrefs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]'))
            .map((a) => {
              try {
                const u = new URL((a as HTMLAnchorElement).href, location.href);
                return u.origin === location.origin ? u.pathname.replace(/\/+$/, '') || '/' : '';
              } catch {
                return '';
              }
            })
            .filter(Boolean),
        );
        const unique = [...new Set(hrefs)];
        linkCache.set(p, unique);
        return unique;
      },
    };

    for (const pattern of dynamic) {
      try {
        output[pattern] = await resolvePattern(pattern, ctx);
      } catch (error) {
        output[pattern] = { path: null, reason: `resolver error: ${String(error).slice(0, 160)}` };
      }
    }
    await context.close();

    fs.writeFileSync(resolvedFile(persona.id), JSON.stringify(output, null, 2));
    const ok = Object.values(output).filter((r) => r.path).length;
    console.log(`[resolve] ${persona.id}: ${ok}/${dynamic.length} dynamic routes resolved`);
  });
}
