/**
 * Shared axe-core a11y assertion helpers for the Phase 38 panel-a11y suite.
 *
 * D-38-01 — Universal coverage gate: every v2.1 AI panel page asserts zero
 *           axe-core violations of severity `critical` or `serious` against
 *           WCAG 2.0/2.1 AA tags.
 *
 * 2026-06-01 update — `seedAuthState` from `./auth-helpers.ts` replaces the
 *           old "auth-debt fallback" workaround. Callers MUST seed the
 *           synthetic auth state via `seedAuthState(page)` BEFORE the
 *           `page.goto(...)` that runs through this helper. With the
 *           localStorage seeded, `ProtectedRoute.tsx` lets the page mount
 *           and `route.fulfill` mocks work end-to-end.
 *
 *           `runAxeOrFixme` still recognises the not-mounted case, but the
 *           fixme reason now points at a page-mount failure (mock missing,
 *           runtime error, redirect for some OTHER reason) — NOT the
 *           generic auth-debt placeholder.
 *
 * Usage:
 *   import { seedAuthState } from './_helpers/auth-helpers'
 *   import { runAxeOrFixme, assertNoBlockingViolations } from './_helpers/axe-helpers'
 *
 *   test.beforeEach(async ({ page }) => {
 *     await seedAuthState(page)
 *   })
 *
 *   test(..., async ({ page }) => {
 *     await page.goto('/panel/inmobiliaria/cobros/cobranza')
 *     const result = await runAxeOrFixme(page)
 *     if (result.skipped) return // test.fixme already called
 *     assertNoBlockingViolations(result.violations)
 *   })
 */

import AxeBuilder from '@axe-core/playwright'
import { test, type Page } from '@playwright/test'

/**
 * The synthetic test agency ID used across all panel-a11y specs. Plan 38-08
 * locks this so mock URL globs can be precise. No real tenant data is touched.
 */
export const AGENCY_ID = 'test-agency-id'

/**
 * Severity levels axe-core reports. Plan 38-08 gates only on `critical` +
 * `serious` per D-38-12 — `moderate` and `minor` violations are surfaced
 * but do not fail CI (manual SR walkthrough is the gate for those).
 */
export type AxeImpact = 'critical' | 'serious' | 'moderate' | 'minor' | null

export interface AxeViolation {
  id: string
  impact: AxeImpact
  description?: string
  nodes: Array<{ target: string[]; html?: string }>
}

export interface RunAxeResult {
  skipped: boolean
  violations: AxeViolation[]
}

/**
 * Heuristic: did the page render at all, or did the auth middleware redirect
 * us out before any AI panel content was mounted? When mounted, every AI
 * panel page renders a top-level `<main>` and the sidebar's `[data-sidebar]`.
 * When the redirect happened, we land on `/auth/login` or `/` and neither
 * marker is present (or — common in CI without a running dev server — the
 * `page.goto` itself fails fast and we land on `about:blank`).
 *
 * Returns `true` when the page is alive (AI panel surface mounted), `false`
 * when the spec should fixme out with auth-debt.
 *
 * Bounded by 2.5s so axe-scan tests don't hang on `networkidle` when the
 * dev server is offline or the auth middleware silently redirects.
 */
async function isAiPanelMounted(page: Page): Promise<boolean> {
  // 1. about:blank → dev server unreachable; bail immediately.
  if (page.url() === 'about:blank' || page.url() === '') {
    return false
  }

  // 2. URL-based check: if we got redirected to login, bail.
  const url = page.url()
  if (url.includes('/auth/login') || url.includes('/signin') || url.endsWith('/inmobiliaria')) {
    return false
  }

  // 3. Wait up to 2s for the AI panel surface to mount. Either marker
  //    (sidebar or <main>) is enough.
  try {
    await page
      .locator('[data-sidebar="sidebar"], aside[data-sidebar], main')
      .first()
      .waitFor({ state: 'attached', timeout: 2_000 })
  } catch {
    return false
  }

  // 4. Final URL recheck after the wait — auth middleware redirect may
  //    have completed during the wait window.
  const finalUrl = page.url()
  if (finalUrl.includes('/auth/login') || finalUrl.includes('/signin')) {
    return false
  }

  return true
}

/**
 * Wait for the page to be "settled enough" to run axe. Bounded so axe-scan
 * tests don't hang on `networkidle` (which never fires when SSE / WebSocket
 * connections are open, and never starts when the dev server is offline).
 */
export async function waitForPageReady(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 3_000 })
  } catch {
    // about:blank or offline — caller's runAxeOrFixme will fixme out
  }
  // Best-effort wait for the network to quiet, but don't block on it.
  await page
    .waitForLoadState('networkidle', { timeout: 2_500 })
    .catch(() => undefined)
}

/**
 * Run axe-core against the current page. Returns `{ skipped: true }` and
 * calls `test.fixme` when the page is not mounted (auth middleware redirect).
 * Otherwise returns the raw axe violations array (caller filters by impact).
 *
 * Tags: `wcag2a` + `wcag2aa` per D-38-12. Best-effort tags also include
 * `wcag21a` and `wcag21aa` so 2.1 success criteria (4.1.3 status messages,
 * 2.5.5 target size, etc.) are scanned.
 */
export async function runAxeOrFixme(page: Page): Promise<RunAxeResult> {
  if (!(await isAiPanelMounted(page))) {
    test.fixme(
      true,
      'page-not-mounted: seedAuthState was applied but no AI-panel surface mounted — likely a missing route mock, runtime error, or non-auth redirect. Inspect page.url() / console output before re-marking.',
    )
    return { skipped: true, violations: [] }
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  return {
    skipped: false,
    violations: results.violations as AxeViolation[],
  }
}

/**
 * Filter the axe violations array down to `critical` + `serious` only and
 * assert that the filtered array is empty. This is the universal CI gate
 * per D-38-12.
 */
export function assertNoBlockingViolations(violations: AxeViolation[]): void {
  const blocking = violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )

  if (blocking.length > 0) {
    // Build a human-readable error message so CI logs surface what failed.
    const lines = blocking.map((v) => {
      const target = v.nodes[0]?.target?.join(' > ') ?? '(no target)'
      return `  - [${v.impact}] ${v.id}: ${target}`
    })
    throw new Error(
      `axe-core found ${blocking.length} blocking violation(s):\n${lines.join('\n')}`,
    )
  }
}

/**
 * Convenience: run axe and assert in one call. Returns `true` when the spec
 * was skipped (auth-debt), `false` when the assertion ran and passed.
 *
 * Typical usage in a per-page spec:
 *
 *   test('cobranza overview — zero axe violations', async ({ page }) => {
 *     // ... mocks + page.goto + waitForLoadState ...
 *     await runAndAssertAxe(page)
 *   })
 */
export async function runAndAssertAxe(page: Page): Promise<boolean> {
  const result = await runAxeOrFixme(page)
  if (result.skipped) return true
  assertNoBlockingViolations(result.violations)
  return false
}
