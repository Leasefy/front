import type { Locator, Page } from '@playwright/test';

import type { Finding } from './findings';
import {
  NAV_MARK,
  auditRevealedItems,
  countStillVisible,
  markVisibleInteractive,
  overflowProbe,
  overlayProbe,
} from './measure';

/**
 * ALLOWLISTED INTERACTIONS. The suite is read-only: the only things it ever clicks are
 *   - navigation toggles (hamburger / "Menú" / the bottom-bar "More" button),
 *   - dialog triggers (`aria-haspopup="dialog"`) and menu triggers (`aria-haspopup="menu"`),
 *     minus anything whose name suggests an action,
 *   - tab triggers (`[role=tab]`),
 *   - dialog close controls, and the Escape key.
 * Nothing is typed, submitted, uploaded or confirmed. The network guard (guard.ts) aborts
 * non-GET requests as a second line of defence.
 */

const NAV_TRIGGER = /^(abrir\s+)?men[uú](\s+de\s+navegaci[oó]n)?$|open\s+(the\s+)?(navigation\s+)?menu/i;

/**
 * Triggers whose label suggests navigation away, a download or a payment redirect. Opening a
 * dialog (even "Nuevo ..." or "Eliminar ...") is read-only and stays in scope: forms inside
 * dialogs are exactly where cut-off bugs live; nothing is ever submitted.
 */
const ACTION_WORDS =
  /(cerrar sesi|salir|logout|sign out|pagar|descargar|download|exportar|export|imprimir|print)/i;

async function firstVisible(locator: Locator): Promise<Locator | null> {
  const n = Math.min(await locator.count(), 8);
  for (let i = 0; i < n; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function closeOverlay(page: Page): Promise<boolean> {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(550);
  const probe = await page.evaluate(overlayProbe).catch(() => null);
  if (!probe || !probe.found) return true;
  // Escape did not close it: use the visible close control.
  const close = page
    .locator('[role=dialog],[role=alertdialog],[role=menu]')
    .last()
    .getByRole('button', { name: /cerrar|close|cancelar/i })
    .first();
  if (await close.isVisible().catch(() => false)) {
    await close.click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(550);
  }
  const after = await page.evaluate(overlayProbe).catch(() => null);
  return !after || !after.found;
}

/**
 * Mobile navigation: the menu/drawer opens, every item is reachable and visible, and it
 * closes. Runs on narrow viewports (< 1024px: the desktop sidebar takes over from `lg`).
 */
export async function checkMobileNavigation(page: Page): Promise<Finding[]> {
  const findings: Finding[] = [];
  const triggers: Array<{ name: string; locator: Locator }> = [];

  const hamburger = await firstVisible(page.getByRole('button', { name: NAV_TRIGGER }));
  if (hamburger) triggers.push({ name: 'navigation toggle', locator: hamburger });
  const more = await firstVisible(
    page.locator('nav[aria-label="Mobile navigation"] button[aria-haspopup="dialog"]'),
  );
  if (more) triggers.push({ name: 'bottom-bar "More"', locator: more });

  if (!triggers.length) {
    findings.push({
      type: 'nav-missing',
      severity: 'hard',
      detail:
        'No navigation toggle found on a narrow viewport (looked for a button named "Menú" / "Abrir menú…" and for the bottom-bar "More" button).',
    });
    return findings;
  }

  for (const { name, locator } of triggers) {
    await page.evaluate(markVisibleInteractive, NAV_MARK);
    try {
      await locator.click({ timeout: 4000 });
    } catch (error) {
      findings.push({
        type: 'nav-unreachable',
        severity: 'hard',
        selector: name,
        detail: `The ${name} cannot be clicked (covered or off-screen): ${String(error).split('\n')[0].slice(0, 140)}`,
      });
      continue;
    }
    await page.waitForTimeout(700); // drawer / sheet animation
    const report = await page.evaluate(auditRevealedItems, NAV_MARK);
    if (report.total === 0) {
      findings.push({
        type: 'nav-unreachable',
        severity: 'hard',
        selector: name,
        detail: `Clicking the ${name} revealed no links or buttons.`,
      });
    }
    for (const item of report.unreachable.slice(0, 12)) {
      findings.push({
        type: 'nav-unreachable',
        severity: 'hard',
        selector: `${name} > ${item.selector}`,
        detail: `Menu item not reachable: ${item.reason}`,
        data: { itemsInMenu: report.total, unreachable: report.unreachable.length },
      });
    }
    // The open menu is also an overlay: it must fit the viewport and have a reachable way out.
    const overlay = await page.evaluate(overlayProbe);
    if (overlay.found && overlay.closeFound && !overlay.closeReachable) {
      findings.push({
        type: 'overlay-close-unreachable',
        severity: 'hard',
        selector: `${name} > ${overlay.selector}`,
        detail: `The close control "${overlay.closeSelector}" of the open menu is off-screen or covered.`,
      });
    }
    const closed = await closeOverlay(page);
    let stillOpen = await page.evaluate(countStillVisible, NAV_MARK);
    if (!closed || stillOpen > 0) {
      // Custom menus (e.g. the landing "mmenu") are not role=dialog: try their close button.
      const closeBtn = await firstVisible(page.getByRole('button', { name: /cerrar|close/i }));
      if (closeBtn) {
        await closeBtn.click({ timeout: 2500 }).catch(() => {});
        await page.waitForTimeout(700);
        stillOpen = await page.evaluate(countStillVisible, NAV_MARK);
      }
    }
    if (stillOpen > 0) {
      findings.push({
        type: 'nav-not-closable',
        severity: 'hard',
        selector: name,
        detail: `After Escape / the close button, ${stillOpen} menu item(s) are still visible: the menu does not close.`,
      });
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(800);
    }
  }
  return findings;
}

/**
 * Opens a few allowlisted dialog / menu triggers on the current page and checks each overlay
 * fits the viewport and has a reachable close control. Returns findings.
 */
export async function checkOverlays(page: Page, opts: { maxDialogs: number; maxMenus: number }): Promise<Finding[]> {
  const findings: Finding[] = [];

  const run = async (kind: 'dialog' | 'menu', max: number) => {
    const triggers = page.locator(`[aria-haspopup="${kind}"]:not([disabled]):not([aria-disabled="true"])`);
    const total = await triggers.count();
    let opened = 0;
    for (let i = 0; i < total && opened < max; i++) {
      const trigger = triggers.nth(i);
      if (!(await trigger.isVisible().catch(() => false))) continue;
      // The bottom-bar "More" button is covered by the navigation check.
      if (await trigger.evaluate((el) => !!el.closest('nav[aria-label="Mobile navigation"]')).catch(() => false)) continue;
      const label =
        ((await trigger.getAttribute('aria-label')) ?? '') + ' ' + ((await trigger.innerText().catch(() => '')) ?? '');
      if (ACTION_WORDS.test(label)) continue;
      opened++;
      try {
        await trigger.scrollIntoViewIfNeeded({ timeout: 2000 });
        await trigger.click({ timeout: 3000 });
      } catch {
        continue; // occlusion of the trigger is reported by the sweep
      }
      await page.waitForTimeout(650);
      const probe = await page.evaluate(overlayProbe);
      if (probe.found) {
        if (!probe.insideViewport) {
          const r = probe.rect;
          findings.push({
            type: 'overlay-cut-off',
            severity: 'hard',
            selector: probe.selector,
            detail: `Opened by "${label.trim().slice(0, 40)}": ${probe.kind} extends outside the ${probe.viewport.w}x${probe.viewport.h} viewport (l=${r?.left} t=${r?.top} r=${r?.right} b=${r?.bottom}).${probe.scrollable ? ' It has an inner scroller.' : ''}`,
            data: { rect: r, viewport: probe.viewport, scrollable: probe.scrollable },
          });
        }
        if (kind === 'dialog' && probe.closeFound && !probe.closeReachable) {
          findings.push({
            type: 'overlay-close-unreachable',
            severity: 'hard',
            selector: probe.selector,
            detail: `Opened by "${label.trim().slice(0, 40)}": close control "${probe.closeSelector}" is off-screen or covered.`,
          });
        }
      }
      const closed = await closeOverlay(page);
      if (!closed) {
        findings.push({
          type: 'overlay-close-unreachable',
          severity: 'hard',
          selector: probe.selector || kind,
          detail: `Opened by "${label.trim().slice(0, 40)}": could not be closed with Escape or its close button.`,
        });
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(800);
        return;
      }
    }
  };

  await run('dialog', opts.maxDialogs);
  await run('menu', opts.maxMenus);
  return findings;
}

/** Switches through a few tabs and reports horizontal overflow introduced by a tab panel. */
export async function checkTabs(page: Page, max: number): Promise<Finding[]> {
  const findings: Finding[] = [];
  const tabs = page.locator('[role=tab][aria-selected="false"]:not([disabled])');
  const total = await tabs.count();
  let done = 0;
  for (let i = 0; i < total && done < max; i++) {
    const tab = tabs.nth(i);
    if (!(await tab.isVisible().catch(() => false))) continue;
    const label = ((await tab.innerText().catch(() => '')) ?? '').trim().slice(0, 40);
    try {
      await tab.scrollIntoViewIfNeeded({ timeout: 2000 });
      await tab.click({ timeout: 3000 });
    } catch {
      continue;
    }
    done++;
    await page.waitForTimeout(500);
    const probe = await page.evaluate(overflowProbe);
    if (probe.scrollbar) {
      findings.push({
        type: 'horizontal-overflow',
        severity: 'hard',
        selector: `tab "${label}"`,
        detail: `Switching to tab "${label}" makes the page scroll horizontally (scrollWidth ${probe.scrollWidth} > clientWidth ${probe.clientWidth}).`,
      });
    }
  }
  return findings;
}
