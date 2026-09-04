/**
 * Cobranza call detail — axe-core a11y gate (Phase 38-08, task 38-08-02).
 *
 * This file is the AXE-ONLY scan for the call detail page. The deep keyboard /
 * audio-player / live-region behavioral spec is the sibling
 * cobranza-call-detail.a11y.spec.ts (task 38-08-07). File-naming distinguishes:
 *   - cobranza-call-detail-axe.a11y.spec.ts → this file, axe scan only
 *   - cobranza-call-detail.a11y.spec.ts     → keyboard + aria-value* contract
 *
 * Detail/dynamic-route page per D-38-04: no page-level EmptyState. Skeleton +
 * axe only.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const CALL_ID = 'test-call-id'
const ROUTE = `/panel/inmobiliaria/cobros/cobranza/llamadas/${CALL_ID}`
const CALL_MOCK = `**/cobranza/calls/${CALL_ID}**`
const TRANSCRIPT_MOCK = `**/cobranza/calls/${CALL_ID}/transcript**`
const SKELETON_DELAY_MS = 2500

const POPULATED_CALL = {
  callId: CALL_ID,
  debtorId: 'test-debtor-id',
  debtorNameMasked: 'J•••n P•••a',
  duration: 120,
  audioUrl: 'https://example.com/test.mp3',
  outcome: 'completed',
  status: 'completed',
  initiatedAt: new Date().toISOString(),
  cost: { totalUsd: 0.45 },
  qa: { scriptAdherence: 0.92, scriptTemplateId: 'tpl-s1' },
  flags: { compliance: [] },
}

const TRANSCRIPT_PAYLOAD = {
  callId: CALL_ID,
  turns: [
    { speaker: 'agent', text: 'Buenas tardes, hablo en nombre de Lísfai.', tStart: 0 },
    { speaker: 'debtor', text: 'Hola, sí dígame.', tStart: 3.2 },
  ],
  redacted: false,
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza call detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during call detail load', async ({ page }) => {
    await page.route(CALL_MOCK, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CALL),
      })
    })
    await page.route(TRANSCRIPT_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TRANSCRIPT_PAYLOAD),
      })
    })

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })

    const candidates = page.locator(
      '[data-testid="cobranza-call-detail-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )



    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on populated call detail', async ({ page }) => {
    await page.route(CALL_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CALL),
      })
    })
    await page.route(TRANSCRIPT_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TRANSCRIPT_PAYLOAD),
      })
    })

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)

    await runAndAssertAxe(page)
  })
})
