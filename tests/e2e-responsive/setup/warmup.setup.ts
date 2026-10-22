import fs from 'node:fs';

import { test as setup } from '@playwright/test';

import { warmupEnabled } from '../support/env';
import { installReadOnlyGuard } from '../support/guard';
import { concretePath, selectRoutes } from '../support/open-path';
import { PERSONAS, statusFile, storageStateFor } from '../support/personas';
import { ROUTES } from '../support/routes';

/**
 * Warm-up pass (default ON against localhost, `RESPONSIVE_WARMUP=0` to skip, `=1` to force).
 *
 * `next dev` compiles a route on its first request, which can take 10-60 s and, under load,
 * made the measuring tests time out ("navigation failed") or catch half-rendered pages. This
 * visits every route of every persona ONCE, sequentially per persona (personas run in
 * parallel), before any measurement. Nothing is measured here and every failure is ignored:
 * a route that does not answer in time is retried once at the end and then left to the real
 * test, which reports it as a page error. Read-only like the rest of the suite (guard on).
 *
 * Against `next build && next start` there is nothing to compile: set RESPONSIVE_WARMUP=0.
 */
setup.describe.configure({ mode: 'parallel' });
setup.setTimeout(2 * 60 * 60 * 1000);

const ROUTE_TIMEOUT_MS = Number(process.env.RESPONSIVE_WARMUP_ROUTE_MS ?? 90_000);

for (const persona of PERSONAS) {
  setup(`warm-up: ${persona.id}`, async ({ browser, baseURL }, testInfo) => {
    setup.skip(!warmupEnabled(baseURL), 'warm-up disabled (RESPONSIVE_WARMUP=0 or a non-local base URL)');
    if (persona.envPrefix) {
      let ok = false;
      try {
        ok = (JSON.parse(fs.readFileSync(statusFile(persona.id), 'utf8')) as { ok: boolean }).ok;
      } catch {
        ok = false;
      }
      setup.skip(!ok, `persona ${persona.id} unavailable: nothing to warm`);
    }

    const paths = new Set<string>([persona.home]);
    for (const route of selectRoutes(persona.id, ROUTES[persona.id])) {
      const target = concretePath(persona, route);
      if (target.open) paths.add(target.open);
    }

    const context = await browser.newContext({
      baseURL: baseURL ?? 'http://localhost:3001',
      storageState: storageStateFor(persona),
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      locale: 'es-CO',
    });
    await installReadOnlyGuard(context);
    const page = await context.newPage();

    const visit = async (path: string): Promise<boolean> => {
      try {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT_MS });
        // Let the route's lazy chunks and data requests start so they compile too.
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
        return true;
      } catch (error) {
        // A client-side redirect interrupts the navigation: the route did answer.
        return /interrupted by another navigation|ERR_ABORTED/i.test(String(error));
      }
    };

    const failed: string[] = [];
    for (const path of paths) if (!(await visit(path))) failed.push(path);
    const stillFailing: string[] = [];
    for (const path of failed) if (!(await visit(path))) stillFailing.push(path);
    await context.close();

    const summary = `${persona.id}: ${paths.size} route(s) visited, ${failed.length} slow on the first pass, ${stillFailing.length} still not answering${
      stillFailing.length ? ` (${stillFailing.join(', ')})` : ''
    }`;
    testInfo.annotations.push({ type: 'warm-up', description: summary });
    console.log(`[warm-up] ${summary}`);
  });
}
