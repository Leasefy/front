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
