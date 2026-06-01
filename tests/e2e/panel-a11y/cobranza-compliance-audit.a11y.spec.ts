/**
 * Cobranza compliance/audit — axe a11y gate (Phase 38-08, task 38-08-03).
 * D-38-04 EmptyState: "Sin eventos de auditoría" — no CTA; export CTA appears
 *                      only when data exists.
 *
 * Phase 38-07 wired the "Exportar CSV" button on this page (commit 38-07);
 * the button must be visible AND have the right aria-label / button role for
 * the axe scan to pass. Mock the audit-log GET endpoint with a populated list.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/compliance/audit'
const AUDIT_LIST_MOCK = '**/compliance/audit-log**'
const SKELETON_DELAY_MS = 800

const POPULATED_AUDIT = {
  items: [
    {
      id: '1',
      action: 'pii_reveal',
      actorType: 'member',
      actorId: 'mem-1',
      entityType: 'debtor',
      entityId: 'test-debtor-id',
      entityIdMasked: '12•••78',
      reason: 'verificación llamada',
      createdAt: new Date().toISOString(),
    },
  ],
  nextCursor: null,
  generatedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza compliance/audit — Phase 38-08 axe a11y', () => {
  test('skeleton visible during audit log load', async ({ page }) => {
    await page.route(AUDIT_LIST_MOCK, async (route) => {
      // Skip the .csv suffix — only intercept the JSON GET.
      if (route.request().url().endsWith('.csv')) {
        return route.continue()
      }
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_AUDIT),
      })
    })
    await page.goto(ROUTE)
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState when audit log is empty', async ({ page }) => {
    await page.route(AUDIT_LIST_MOCK, async (route) => {
      if (route.request().url().endsWith('.csv')) return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], nextCursor: null }),
      })
    })
    await page.goto(ROUTE)
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated audit log (incl. CSV export button)', async ({ page }) => {
    await page.route(AUDIT_LIST_MOCK, async (route) => {
      if (route.request().url().endsWith('.csv')) return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_AUDIT),
      })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
