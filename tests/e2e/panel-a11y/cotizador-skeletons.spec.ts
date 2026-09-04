import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'

/**
 * Cotizador + cobranza configuración critical-page structural smoke —
 * Phase 38 plan 38-04b.
 *
 * Verifies that the 4 critical pages retrofitted in this plan render either
 * a bespoke skeleton (during load/SSE connect) or an EmptyState (cotizador
 * overview only, per D-38-04).
 *
 * Coverage:
 *   - Cotizador overview: skeleton visible (delayed mock) + EmptyState visible
 *     (empty lastQuotes mock — only zero-data state in this batch per D-38-04)
 *   - Nueva cotización wizard: skeleton visible during re-quote hydration
 *     (?from=UUID + delayed metadata mock)
 *   - Quote detail [quoteId]: skeleton visible while SSE is establishing
 *     (delayed metadata + aborted stream mock)
 *   - Cobranza configuración: skeleton visible while policy config is loading
 *
 * Auth-gated routes that the dev session cannot reach via raw route.fulfill
 * (auth middleware intercepts before page mounts) are marked test.fixme with
 * seedAuthState in beforeEach unblocks the page mount (2026-06-01).
 *
 * Selectors target the [data-testid] hooks added to each new skeleton component
 * (cotizador-{overview|wizard|quote-detail}-skeleton +
 * cobranza-configuracion-skeleton) and the role="status".border-dashed wrapper
 * on EmptyState. The .border-dashed class filter excludes the sidebar's sr-only
 * role="status" navigation announcer (Phase 38-04a established pattern).
 */

const SKELETON_DELAY_MS = 2500
const NETWORK_PATTERNS = {
  cotizadorOverview: '**/cotizador/overview',
  cotizadorMetadata: '**/cotizador/quote/*/metadata',
  cotizadorStream: '**/cotizador/quote/*/stream',
  cobranzaPolicy: '**/cobranza/policy',
} as const

// Block A: CotizadorOverviewSkeleton + overview EmptyState
test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador overview — Phase 38-04b skeleton + EmptyState', () => {
  test('skeleton renders during load (delayed network mock)', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.cotizadorOverview, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: {
            quotesToday: 0,
            approvalRate: 0,
            primaPromedio: 0,
            costPerQuote: 0,
          },
          lastQuotes: [],
          carriers: [],
          generatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto('/panel/inmobiliaria/postulaciones/asegurabilidad', { waitUntil: 'domcontentloaded' })
    const skeleton = page.getByTestId('cotizador-overview-skeleton')



    await expect(skeleton).toBeVisible()
  })

  test('EmptyState renders when no quotes exist', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.cotizadorOverview, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: {
            quotesToday: 0,
            approvalRate: 0,
            primaPromedio: 0,
            costPerQuote: 0,
          },
          lastQuotes: [],
          carriers: [],
          generatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto('/panel/inmobiliaria/postulaciones/asegurabilidad', { waitUntil: 'domcontentloaded' })
    // EmptyState wrapper carries `role=status` PLUS the dashed-border container
    // classes. Filtering by .border-dashed scopes the selector to the new primitive
    // and excludes the sidebar's `role=status` sr-only navigation announcer.
    const status = page.locator('[role="status"].border-dashed').first()



    await expect(status).toBeVisible()
    // CTA: "Nueva cotización" → /panel/inmobiliaria/postulaciones/asegurabilidad/nueva
    await expect(status).toContainText(/Nueva cotización|New quote/)
  })
})

// Block B: CotizadorWizardSkeleton (re-quote hydration only)
test.describe('Nueva cotización wizard — Phase 38-04b re-quote skeleton', () => {
  test('skeleton renders during re-quote metadata hydration', async ({ page }) => {
    // Stall the parent-metadata fetch so parentMetadata.isLoading stays true
    await page.route(NETWORK_PATTERNS.cotizadorMetadata, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.abort()
    })

    // ?from=<UUID> triggers re-quote mode (UUID_REGEX validates the param)
    await page.goto(
      '/panel/inmobiliaria/postulaciones/asegurabilidad/nueva?from=00000000-0000-0000-0000-000000000001',
      { waitUntil: 'domcontentloaded' },
    )
    const skeleton = page.getByTestId('cotizador-wizard-skeleton')



    await expect(skeleton).toBeVisible()
  })
})

// Block C: CotizadorQuoteDetailSkeleton (first real loading state)
test.describe('Cotizador quote detail — Phase 38-04b SSE-connecting skeleton', () => {
  test('skeleton renders while SSE stream is establishing', async ({ page }) => {
    // Abort the SSE stream so carriers stays empty AND isConnected stays false
    await page.route(NETWORK_PATTERNS.cotizadorStream, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.abort()
    })
    // Fulfill metadata so QuoteHeader has some data (skeleton wins anyway because
    // carriers.length === 0 && !isConnected)
    await page.route(NETWORK_PATTERNS.cotizadorMetadata, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cedulaHashPrefix8: 'abc12345',
          canonCop: 1200000,
          ciudad: 'Bogotá',
          tipoInmueble: 'apartamento',
          createdAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto(
      '/panel/inmobiliaria/postulaciones/asegurabilidad/00000000-0000-0000-0000-000000000001',
      { waitUntil: 'domcontentloaded' },
    )
    const skeleton = page.getByTestId('cotizador-quote-detail-skeleton')



    await expect(skeleton).toBeVisible()
  })
})

// Block D: CobranzaConfiguracionSkeleton
test.describe('Cobranza configuración — Phase 38-04b skeleton', () => {
  test('skeleton renders while policy config is loading', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.cobranzaPolicy, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    })

    await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion', { waitUntil: 'domcontentloaded' })
    const skeleton = page.getByTestId('cobranza-configuracion-skeleton')



    await expect(skeleton).toBeVisible()
  })
})
