import fs from 'node:fs';
import path from 'node:path';

import { test as base, type Page, type TestInfo } from '@playwright/test';

import { FINDINGS_ATTACHMENT, HARD_TYPES, type Finding, type TestFindings } from './support/findings';
import { installReadOnlyGuard, type Guard } from './support/guard';
import { checkMobileNavigation, checkOverlays, checkTabs } from './support/interactions';
import type { DeviceMeta } from './support/devices';
import { pageSweep, type SweepResult } from './support/measure';
import { openAndSettle, waitForSettled, type OpenResult } from './support/page-ready';
import {
  PERSONAS,
  authFile,
  readResolved,
  statusFile,
  type Persona,
  type PersonaId,
} from './support/personas';
import { isDynamic, pathnameOf, type Resolution } from './support/resolve';
import { ROUTES, SHARES_RESOLVED_IDS_WITH } from './support/routes';
import { applySharedSession, refreshSharedSession } from './support/session';

/**
 * Responsive sweep: every route of every persona, on the device of the running project.
 * READ-ONLY by construction (see support/guard.ts and support/interactions.ts).
 *
 * Hard failures (fail the test): horizontal overflow, occluded clickables, mobile-navigation
 * problems, overlays cut off / not closable. Everything else is a soft annotation. An error
 * page ("No pudimos cargar esto", 5xx, 404) is reported as its own category, not as layout.
 */

const REPORT_DIR = path.resolve(process.env.RESPONSIVE_REPORT_DIR ?? 'responsive-report');

const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ context }, use) => {
      await use(await installReadOnlyGuard(context));
    },
    { auto: true },
  ],
});

test.setTimeout(180_000);
test.use({ colorScheme: 'light', locale: 'es-CO' });

// ---- helpers -----------------------------------------------------------------------------

const slug = (s: string): string =>
  s
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 110) || 'root';

const resolvedCache = new Map<PersonaId, Record<string, Resolution>>();
function resolvedFor(id: PersonaId): Record<string, Resolution> {
  const source = SHARES_RESOLVED_IDS_WITH[id] ?? id;
  const cached = resolvedCache.get(source);
  if (cached) return cached;
  const data = readResolved(source) as Record<string, Resolution>;
  resolvedCache.set(source, data);
  return data;
}

function personaStatus(persona: Persona): { ok: boolean; reason?: string } {
  if (!persona.envPrefix) return { ok: true };
  try {
    return JSON.parse(fs.readFileSync(statusFile(persona.id), 'utf8'));
  } catch {
    return { ok: false, reason: 'auth setup did not run for this persona' };
  }
}

/** Resolves the concrete path to open, or the reason it cannot be opened. */
function concretePath(persona: Persona, route: string): { open: string | null; reason?: string } {
  if (!isDynamic(route)) return { open: route };
  const r = resolvedFor(persona.id)[pathnameOf(route)];
  if (!r) return { open: null, reason: 'dynamic route was not resolved (resolve setup did not run)' };
  if (!r.path) return { open: null, reason: r.reason ?? 'could not be resolved' };
  return { open: r.path };
}

function metaOf(testInfo: TestInfo): DeviceMeta {
  return testInfo.project.metadata as DeviceMeta;
}

function summarise(findings: Finding[]): string {
  const hard = findings.filter((f) => f.severity === 'hard');
  return hard
    .slice(0, 6)
    .map((f) => `[${f.type}] ${f.selector ? f.selector + ': ' : ''}${f.detail}`)
    .join('\n');
}

async function attach(testInfo: TestInfo, payload: TestFindings): Promise<void> {
  await testInfo.attach(FINDINGS_ATTACHMENT, {
    body: Buffer.from(JSON.stringify(payload)),
    contentType: 'application/json',
  });
  const byType = new Map<string, number>();
  for (const f of payload.findings) byType.set(`${f.severity}:${f.type}`, (byType.get(`${f.severity}:${f.type}`) ?? 0) + 1);
  for (const [k, n] of byType) testInfo.annotations.push({ type: k, description: String(n) });
}

async function sweepWithRetry(page: Page, touch: boolean): Promise<SweepResult> {
  const options = { tapTargets: touch, maxPositions: 12 };
  try {
    return await page.evaluate(pageSweep, options);
  } catch {
    // A late client-side redirect destroyed the execution context: settle and try once more.
    await waitForSettled(page);
    return page.evaluate(pageSweep, options);
  }
}

function findingsFromSweep(sweep: SweepResult, touch: boolean): Finding[] {
  const out: Finding[] = [];

  // 1. Horizontal overflow (hard). `body { overflow-x: clip }` can hide the page scrollbar,
  // so offenders are measured element by element and reported even without a scrollbar.
  for (const o of sweep.overflow.slice(0, 6)) {
    out.push({
      type: 'horizontal-overflow',
      severity: 'hard',
      selector: o.selector,
      detail: `Extends ${o.overflowBy}px beyond the ${sweep.viewport.w}px viewport (left ${o.left}, right ${o.right}, width ${o.width})${
        sweep.scrollbar ? '; the page scrolls horizontally' : '; the page does not scroll but the content is cut'
      }.`,
      data: { ...o, offendersTotal: sweep.overflowTotal, scrollbar: sweep.scrollbar },
    });
  }
  if (sweep.scrollbar && sweep.overflow.length === 0) {
    out.push({
      type: 'horizontal-overflow',
      severity: 'hard',
      selector: 'document',
      detail: `The page scrolls horizontally (scrollWidth ${sweep.docScrollWidth} > clientWidth ${sweep.docClientWidth}) but no single element was identified as the cause.`,
      data: { scrollbar: true },
    });
  }

  // 3. Occluded clickables (hard), grouped by what covers them.
  const byCover = new Map<string, typeof sweep.occluded>();
  for (const item of sweep.occluded) {
    const list = byCover.get(item.coveredBy) ?? [];
    list.push(item);
    byCover.set(item.coveredBy, list);
  }
  for (const [cover, items] of byCover) {
    out.push({
      type: 'occluded-clickable',
      severity: 'hard',
      selector: items[0].selector,
      detail: `${items.length} clickable(s) are never reachable at any scroll position because ${cover} sits on top of them${
        items.length > 1 ? ` (e.g. ${items.slice(1, 3).map((i) => i.selector).join(' ; ')})` : ''
      }.`,
      data: { coveredBy: cover, count: items.length, sizes: items.slice(0, 5).map((i) => i.size), totalAcrossPage: sweep.occludedTotal },
    });
  }

  // 2. Clipped text (soft)
  for (const c of sweep.clipped.slice(0, 8)) {
    out.push({
      type: 'clipped-text',
      severity: 'soft',
      selector: c.selector,
      detail: `Text "${c.text}" is cut off (${c.axis === 'x' ? 'width' : 'height'}: content ${c.scroll}px in a ${c.client}px box, overflow hidden, no ellipsis).`,
      data: { ...c, clippedTotal: sweep.clippedTotal },
    });
  }

  // 4. Tap targets (soft, aggregated: there can be hundreds per page)
  if (touch && sweep.tapTotal > 0) {
    const worst = [...sweep.tap].sort((a, b) => Math.min(a.width, a.height) - Math.min(b.width, b.height));
    const severe = sweep.tap.filter((t) => Math.min(t.width, t.height) < 32).length;
    out.push({
      type: 'tap-target',
      severity: 'soft',
      selector: worst[0].selector,
      detail: `${sweep.tapTotal} interactive element(s) are smaller than 44x44 CSS px (${severe} of the listed ones under 32px). Smallest: ${worst[0].width}x${worst[0].height}.`,
      data: { total: sweep.tapTotal, severeInSample: severe, sample: worst.slice(0, 10) },
    });
  }

  // 5. Fixed / sticky overlap (soft)
  for (const p of sweep.fixedOverlap) {
    out.push({
      type: 'fixed-overlap',
      severity: 'soft',
      selector: `${p.a}  x  ${p.b}`,
      detail: `Two fixed/sticky elements overlap (${p.overlapPx}px) at the ${p.at} of the page.`,
    });
  }
  for (const c of sweep.covered) {
    out.push({
      type: 'content-under-fixed',
      severity: 'soft',
      selector: c.sample,
      detail: `At the ${c.where} of the page, content is hidden under the fixed bar ${c.bar} by up to ${c.coveredPx}px (it cannot be scrolled clear).`,
      data: c as unknown as Record<string, unknown>,
    });
  }
  return out;
}

/**
 * RESPONSIVE_ROUTE_FILTER: regex tested against "<persona> <route>"; only matches run.
 * RESPONSIVE_SAMPLE=N: keep every Nth route of each persona (deterministic, always keeps the
 * first). The default is every route; both exist because a dev server needs hours for the full
 * list on several devices.
 */
function selectRoutes(persona: PersonaId, routes: string[]): string[] {
  const filter = process.env.RESPONSIVE_ROUTE_FILTER ? new RegExp(process.env.RESPONSIVE_ROUTE_FILTER) : null;
  const every = Math.max(1, Number(process.env.RESPONSIVE_SAMPLE ?? 1));
  return routes.filter((route, index) => index % every === 0 && (!filter || filter.test(`${persona} ${route}`)));
}

// ---- tests -------------------------------------------------------------------------------

for (const persona of PERSONAS) {
  test.describe(persona.id, () => {
    test.use({ storageState: persona.envPrefix ? authFile(persona.id) : { cookies: [], origins: [] } });

    for (const route of selectRoutes(persona.id, ROUTES[persona.id])) {
      test(route, async ({ page, context, browser, baseURL, guard }, testInfo) => {
        const meta = metaOf(testInfo);
        const status = personaStatus(persona);
        test.skip(!status.ok, `persona ${persona.id} unavailable: ${status.reason}`);
        const target = concretePath(persona, route);
        test.skip(target.open === null, `unresolved dynamic route: ${target.reason}`);
        const openPath = target.open as string;

        const findings: Finding[] = [];
        const payload: TestFindings = {
          persona: persona.id,
          route,
          openedPath: openPath,
          device: meta.id,
          group: meta.group,
          findings,
        };

        let opened: OpenResult = await openAndSettle(page, openPath);

        // Session lost during a long run: refresh the shared state once and retry.
        if (persona.envPrefix && opened.finalPath.startsWith('/auth') && !openPath.startsWith('/auth')) {
          await refreshSharedSession(browser, persona, baseURL ?? 'http://localhost:3001');
          await applySharedSession(context, page, persona);
          opened = await openAndSettle(page, openPath);
        }

        const screenshotRel = path.join('screenshots', persona.id, slug(meta.id), `${slug(openPath)}.jpg`);
        const screenshotAbs = path.join(REPORT_DIR, screenshotRel);
        const takeScreenshot = async () => {
          fs.mkdirSync(path.dirname(screenshotAbs), { recursive: true });
          try {
            await page.screenshot({ path: screenshotAbs, fullPage: true, type: 'jpeg', quality: 55, animations: 'disabled' });
          } catch {
            await page
              .screenshot({ path: screenshotAbs, type: 'jpeg', quality: 55 })
              .catch(() => {});
          }
          if (fs.existsSync(screenshotAbs)) payload.screenshot = screenshotRel.split(path.sep).join('/');
        };

        if (opened.redirected) {
          const lostSession = persona.envPrefix && opened.finalPath.startsWith('/auth');
          findings.push({
            type: lostSession ? 'page-error' : 'redirected',
            severity: lostSession ? 'soft' : 'info',
            detail: lostSession
              ? `Redirected to ${opened.finalPath}: the session was lost and could not be refreshed.`
              : `Redirected from ${openPath} to ${opened.finalPath} (role or state based redirect); layout checks skipped.`,
          });
          await takeScreenshot();
          await attach(testInfo, payload);
          return;
        }

        if (opened.error.isError) {
          findings.push({
            type: 'page-error',
            severity: 'soft',
            detail: `${opened.error.reason}${opened.status ? ` (HTTP ${opened.status})` : ''}. Not a layout finding: layout checks skipped.`,
            data: { status: opened.status },
          });
          await takeScreenshot();
          await attach(testInfo, payload);
          return;
        }

        const sweep = await sweepWithRetry(page, meta.touch);
        findings.push(...findingsFromSweep(sweep, meta.touch));
        if (sweep.overlayOpenOnLoad) {
          findings.push({
            type: 'note',
            severity: 'info',
            detail: 'A dialog was already open on load (cookie banner, tour or modal): occlusion was judged only inside it.',
          });
        }

        await takeScreenshot();

        // 7. Overlays and tabs, via the allowlist only.
        findings.push(...(await checkOverlays(page, { maxDialogs: 2, maxMenus: 1 })));
        findings.push(...(await checkTabs(page, 3)));

        for (const b of [...new Map(guard.blocked.map((x) => [`${x.method} ${x.url}`, x])).values()].slice(0, 5)) {
          findings.push({
            type: 'blocked-mutation',
            severity: 'info',
            detail: `A ${b.method} request was aborted by the read-only guard: ${b.url}`,
          });
        }

        await attach(testInfo, payload);

        const hard = findings.filter((f) => f.severity === 'hard' && HARD_TYPES.has(f.type));
        if (hard.length) {
          throw new Error(`${hard.length} hard responsive finding(s) on ${openPath} @ ${meta.id}:\n${summarise(findings)}`);
        }
      });
    }

    test('mobile navigation opens, lists every item and closes', async ({ page }, testInfo) => {
      const meta = metaOf(testInfo);
      test.skip(meta.width >= 1024, 'the desktop sidebar takes over from 1024px: no mobile menu to test');
      const status = personaStatus(persona);
      test.skip(!status.ok, `persona ${persona.id} unavailable: ${status.reason}`);

      const findings: Finding[] = [];
      const payload: TestFindings = {
        persona: persona.id,
        route: `(mobile navigation) ${persona.home}`,
        openedPath: persona.home,
        device: meta.id,
        group: meta.group,
        findings,
      };
      const opened = await openAndSettle(page, persona.home);
      if (opened.error.isError || opened.redirected) {
        findings.push({
          type: opened.error.isError ? 'page-error' : 'redirected',
          severity: opened.error.isError ? 'soft' : 'info',
          detail: opened.error.isError
            ? `${opened.error.reason}: mobile navigation not checked.`
            : `Redirected to ${opened.finalPath}: mobile navigation not checked.`,
        });
        await attach(testInfo, payload);
        return;
      }
      findings.push(...(await checkMobileNavigation(page)));
      await attach(testInfo, payload);
      const hard = findings.filter((f) => f.severity === 'hard');
      if (hard.length) {
        throw new Error(`${hard.length} mobile navigation problem(s) @ ${meta.id}:\n${summarise(findings)}`);
      }
    });
  });
}
