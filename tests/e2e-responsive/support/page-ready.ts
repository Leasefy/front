import type { Page, Response } from '@playwright/test';

import { errorProbe, type PageErrorProbe } from './measure';

export interface OpenResult {
  status: number | null;
  finalPath: string;
  finalUrl: string;
  error: PageErrorProbe;
  /** True when the final pathname is not the requested one. */
  redirected: boolean;
}

/** Waits until network is quiet and the loading skeletons are gone (both capped). */
export async function waitForSettled(page: Page, opts: { quick?: boolean } = {}): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: opts.quick ? 4_000 : 6_000 }).catch(() => {});
  await page
    .waitForFunction(
      () => {
        const nodes = document.querySelectorAll(
          '[aria-busy="true"],.animate-pulse,[data-skeleton],[class*="skeleton" i]',
        );
        for (const n of Array.from(nodes)) {
          const r = n.getBoundingClientRect();
          if (r.width > 24 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight) return false;
        }
        return true;
      },
      undefined,
      { timeout: opts.quick ? 3_000 : 7_000 },
    )
    .catch(() => {});
  // The panel shell shows a "preparing your panel" splash while the session/permissions load;
  // measuring under it would report everything as occluded.
  await page
    .waitForFunction(() => !document.querySelector('[data-testid="muro-esperando-estado"]'), undefined, {
      timeout: opts.quick ? 4_000 : 25_000,
    })
    .catch(() => {});
  // Entrance animations (framer-motion / CSS) settle before geometry is measured.
  await page.waitForTimeout(opts.quick ? 1_200 : 450);
}

const pathnameOnly = (u: string): string => {
  try {
    return new URL(u).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return u;
  }
};

/** Navigates and waits for the page to settle. Never throws on slow pages. */
export async function openAndSettle(page: Page, route: string): Promise<OpenResult> {
  let response: Response | null = null;
  try {
    response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 75_000 });
  } catch (error) {
    // Navigation interrupted by a client-side redirect is fine; anything else is reported.
    if (!/interrupted by another navigation|NS_BINDING_ABORTED/i.test(String(error))) {
      return {
        status: null,
        finalPath: pathnameOnly(page.url()),
        finalUrl: page.url(),
        error: { isError: true, reason: `navigation failed: ${String(error).split('\n')[0].slice(0, 160)}` },
        redirected: false,
      };
    }
  }
  await waitForSettled(page);
  const requested = pathnameOnly(new URL(route, 'http://x').toString());
  const finalPath = pathnameOnly(page.url());
  let error: PageErrorProbe = { isError: false, reason: '' };
  try {
    error = await page.evaluate(errorProbe);
  } catch {
    // Context destroyed by a late redirect: settle again and retry once.
    await waitForSettled(page);
    error = await page.evaluate(errorProbe).catch(() => ({ isError: false, reason: '' }));
  }
  const status = response?.status() ?? null;
  if (!error.isError && status !== null && status >= 500) {
    error = { isError: true, reason: `HTTP ${status}` };
  }
  return {
    status,
    finalPath,
    finalUrl: page.url(),
    error,
    redirected: finalPath !== requested,
  };
}
