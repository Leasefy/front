import { expect, test } from '@playwright/test';

import { pageSweep } from '../support/measure';

/**
 * Self-test of the occlusion sweep (T-0173 WU-7). Runs on inline pages, no app needed:
 *   npx playwright test -c playwright.responsive.selftest.config.ts
 */
const SHELL = (aside: string, extra = '') => `<!doctype html><html><body style="margin:0">
<aside style="position:fixed;left:0;top:0;bottom:0;width:240px;display:flex;flex-direction:column;background:#fff">
  <nav style="flex:1;overflow-y:auto">${aside}</nav>
  <footer style="height:56px;background:#eee"><a href="#help" style="display:block;height:40px">Ayuda</a></footer>
</aside>
<main style="margin-left:240px;height:600px">content</main>${extra}</body></html>`;
const items = (n: number) =>
  Array.from({ length: n }, (_, i) => `<a href="#i${i}" style="display:block;height:40px">Item ${i}</a>`).join('');

async function occluded(page: import('@playwright/test').Page, html: string): Promise<string[]> {
  await page.setContent(html);
  const sweep = await page.evaluate(pageSweep, { tapTargets: false, maxPositions: 6 });
  return sweep.occluded.map((o) => o.selector);
}

test.use({ viewport: { width: 1280, height: 400 } });

test('last items of a scrolling sidebar nav are NOT reported as covered by the footer', async ({ page }) => {
  const found = await occluded(page, SHELL(items(30)));
  expect(found.filter((s) => /Item/.test(s))).toEqual([]);
});

test('a fixed element that really covers an item after scrolling IS still reported', async ({ page }) => {
  const cover = '<div style="position:fixed;left:0;top:150px;width:240px;height:100px;z-index:9;background:red"></div>';
  const found = await occluded(page, SHELL(items(30), cover));
  expect(found.length).toBeGreaterThan(0);
});

// ---- blocking modals (WU-9 item 1) -----------------------------------------------------------

const MODAL_PAGE = (attrs: string) => `<!doctype html><html><body style="margin:0">
<main style="height:1200px;padding:8px"><h1>Panel</h1><p>Some content under the bar</p><a href="#a" style="display:block;height:48px">Link A</a></main>
<div ${attrs} style="position:fixed;left:0;right:0;top:0;height:148px;z-index:50;background:#fff">
  <p>Accept the terms</p><button style="height:48px;width:200px">Accept</button>
</div></body></html>`;

async function sweepOf(page: import('@playwright/test').Page, html: string) {
  await page.setContent(html);
  return page.evaluate(pageSweep, { tapTargets: false, maxPositions: 6 });
}

test('a fixed bar that is NOT a dialog still reports content hidden under it (control)', async ({ page }) => {
  const sweep = await sweepOf(page, MODAL_PAGE(''));
  expect(sweep.covered.length).toBeGreaterThan(0);
  expect(sweep.blockingModal).toBe('');
});

test('a role=dialog aria-modal layer is not a content-under-fixed bar, and is reported as the blocker', async ({ page }) => {
  const sweep = await sweepOf(page, MODAL_PAGE('role="dialog" aria-modal="true" data-testid="aceptar-legales"'));
  expect(sweep.covered).toEqual([]);
  expect(sweep.fixedOverlap).toEqual([]);
  expect(sweep.occluded).toEqual([]);
  expect(sweep.blockingModal).toContain('aceptar-legales');
});

test('a modal marked only with aria-modal=true is also ignored', async ({ page }) => {
  const sweep = await sweepOf(page, MODAL_PAGE('aria-modal="true"'));
  expect(sweep.covered).toEqual([]);
  expect(sweep.blockingModal).not.toBe('');
});

test('content inside an open dialog is not judged as hidden under a fixed bar', async ({ page }) => {
  const html = `<!doctype html><html><body style="margin:0"><main style="height:1200px">x</main>
  <div role="dialog" aria-modal="true" style="position:fixed;inset:0;display:flex;align-items:flex-end">
    <div style="position:fixed;left:0;right:0;bottom:0;height:120px;background:#fff"><button style="height:48px">Ok</button></div>
  </div></body></html>`;
  const sweep = await sweepOf(page, html);
  expect(sweep.covered).toEqual([]);
  expect(sweep.fixedOverlap).toEqual([]);
});

test('elements behind a modal are not reported as occluded by it', async ({ page }) => {
  const sweep = await sweepOf(page, MODAL_PAGE('role="dialog" aria-modal="true"'));
  expect(sweep.occluded.map((o) => o.selector).filter((s) => /Link A/.test(s))).toEqual([]);
});
