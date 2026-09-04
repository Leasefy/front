/**
 * Cotizador quote detail — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * Detail/dynamic-route per D-38-04: no EmptyState. Skeleton fires during
 * SSE connect (Phase 38-04b CotizadorQuoteDetailSkeleton — fires when
 * carriers.length === 0 && !isConnected && !error).
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const QUOTE_ID = 'test-quote-id'
const ROUTE = `/panel/inmobiliaria/postulaciones/asegurabilidad/${QUOTE_ID}`
const METADATA_MOCK = `**/cotizador/quote/${QUOTE_ID}/metadata`
const STREAM_MOCK = `**/cotizador/quote/${QUOTE_ID}/stream`
const SKELETON_DELAY_MS = 2500

const POPULATED_METADATA = {
  id: QUOTE_ID,
  cedula_hash: 'abc123',
  cedula_masked: '12•••78',
  canon: 2_000_000,
  plazoMeses: 12,
  coberturas: ['responsabilidad-civil'],
  status: 'completed',
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador quote detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible while SSE connect is establishing', async ({ page }) => {
    await page.route(METADATA_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_METADATA),
      })
    })
    // Stream is intentionally never fulfilled so the skeleton stays visible.
    await page.route(STREAM_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, 30_000))
      await route.abort()
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator(
      '[data-testid="cotizador-quote-detail-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded quote detail', async ({ page }) => {
    await page.route(METADATA_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_METADATA),
      })
    })
    // Synthetic SSE stream — empty but successful response keeps the page out
    // of the skeleton branch.
    await page.route(STREAM_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'event: ready\ndata: {}\n\n',
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
