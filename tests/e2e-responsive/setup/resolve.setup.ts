import fs from 'node:fs';

import { test as setup } from '@playwright/test';

import { installReadOnlyGuard } from '../support/guard';
import { waitForSettled } from '../support/page-ready';
import { AUTH_DIR, PERSONAS, authFile, resolvedPartFile } from '../support/personas';
import {
  isDynamic,
  pathnameOf,
  resolvePattern,
  type Resolution,
  type ResolveContext,
} from '../support/resolve';
import { LIST_SOURCES, ROUTES, SHARES_RESOLVED_IDS_WITH } from '../support/routes';

/**
 * Resolves every `[param]` route to a real path with the persona's own session, never from a
 * hardcoded id: first by following the first matching `<a href>` on the parent list page, then
 * (rows that navigate on click) by clicking the first rows of that list and reading where the
 * app went. Output: .auth/resolved-<persona>.part<k>.json -> { "<pattern>": { path | null, reason? } }
 *
 * Big personas are split into shards that run on parallel workers. A pattern and all patterns
 * that extend it (`/x/[id]`, `/x/[id]/editar`) always land in the same shard.
 *
 * Read-only: pages are only navigated (and, for the click fallback, table rows are clicked);
 * the network guard aborts anything that is not a read.
 *
 * RESPONSIVE_REUSE_RESOLVED=1 keeps an existing shard file instead of crawling again.
 */
setup.describe.configure({ mode: 'parallel' });
setup.setTimeout(25 * 60_000);

const SHARD_SIZE = 12;

/** `/a/[x]/b/[y]/c` -> `/a/[x]`: the part that decides which shard a pattern belongs to. */
const rootOf = (pattern: string): string => {
  const segs = pathnameOf(pattern).split('/').filter(Boolean);
  const first = segs.findIndex((s) => /^\[.+\]$/.test(s));
  return '/' + segs.slice(0, first + 1).join('/');
};

const pathOf = (u: string): string => new URL(u).pathname.replace(/\/+$/, '') || '/';

for (const persona of PERSONAS) {
  if (SHARES_RESOLVED_IDS_WITH[persona.id]) continue;
  const dynamic = [...new Set(ROUTES[persona.id].filter(isDynamic).map(pathnameOf))];
  if (!dynamic.length) continue;

  const roots = [...new Set(dynamic.map(rootOf))];
  const shardCount = Math.max(1, Math.ceil(dynamic.length / SHARD_SIZE));
  const shards: string[][] = Array.from({ length: shardCount }, () => []);
  roots.forEach((root, i) => {
    shards[i % shardCount].push(...dynamic.filter((p) => rootOf(p) === root));
  });

  shards.forEach((patterns, shardIndex) => {
    if (!patterns.length) return;
    setup(`resolve ids: ${persona.id} #${shardIndex + 1}/${shardCount}`, async ({ browser, baseURL }) => {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      const outFile = resolvedPartFile(persona.id, shardIndex);
      if (process.env.RESPONSIVE_REUSE_RESOLVED === '1' && fs.existsSync(outFile)) return;

      const state = authFile(persona.id);
      const output: Record<string, Resolution> = {};

      if (persona.envPrefix && !fs.existsSync(state)) {
        for (const pattern of patterns) {
          output[pattern] = { path: null, reason: 'persona has no session (login skipped or failed)' };
        }
        fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
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
      const clickCache = new Map<string, string | null>();

      const open = async (target: string) => {
        if (pathOf(page.url()) === target) return;
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 75_000 });
        await waitForSettled(page, { quick: true });
      };

      const clickThrough = async (
        source: string,
        matcher: RegExp,
        exclude: Set<string>,
      ): Promise<string | null> => {
        await open(source);
        // Rows that navigate on click: open at most a couple, read where the app went, come back.
        for (const selector of ['tbody tr', '[role=row]:not(:first-child)', '[data-row-id]']) {
          const candidates = page.locator(selector);
          const total = Math.min(await candidates.count(), 2);
          for (let i = 0; i < total; i++) {
            const row = candidates.nth(i);
            const cell = row.locator('td').nth(1);
            const target = (await cell.count()) ? cell : row;
            try {
              await target.click({ timeout: 3000 });
            } catch {
              continue;
            }
            await page.waitForTimeout(1800);
            const here = pathOf(page.url());
            if (here !== source && matcher.test(here) && !exclude.has(here)) return here;
            if (here !== source) {
              await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
              await waitForSettled(page, { quick: true });
            } else {
              await page.keyboard.press('Escape').catch(() => {});
            }
          }
        }
        return null;
      };

      const ctx: ResolveContext = {
        listSources: LIST_SOURCES,
        staticRoutes: new Set(ROUTES[persona.id].filter((r) => !isDynamic(r)).map(pathnameOf)),
        memo: new Map(),
        discoverByClick: async (source, matcher, exclude) => {
          const key = source + '|' + matcher.source;
          if (clickCache.has(key)) return clickCache.get(key) ?? null;
          const found = await clickThrough(source, matcher, exclude);
          clickCache.set(key, found);
          return found;
        },
        getLinks: async (target: string) => {
          const cached = linkCache.get(target);
          if (cached) return cached;
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 75_000 });
          await waitForSettled(page, { quick: true });
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
          linkCache.set(target, unique);
          return unique;
        },
      };

      for (const pattern of patterns) {
        try {
          output[pattern] = await resolvePattern(pattern, ctx);
        } catch (error) {
          output[pattern] = { path: null, reason: `resolver error: ${String(error).slice(0, 160)}` };
        }
      }
      await context.close();

      fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
      const ok = Object.values(output).filter((r) => r.path).length;
      console.log(`[resolve] ${persona.id} #${shardIndex + 1}: ${ok}/${patterns.length} dynamic routes resolved`);
    });
  });
}
