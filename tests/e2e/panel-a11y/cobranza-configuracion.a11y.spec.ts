/**
 * Cobranza configuración — axe-core a11y gate (Phase 38-08, task 38-08-02).
 *
 * Config page per D-38-04: no page-level EmptyState (form always renders with
 * default values seeded on first agency access — Phase 34 D-34-RES). Skeleton
 * + axe only.
 *
 * Bespoke skeleton: CobranzaConfiguracionSkeleton (Phase 38-04b, replaces
 * the local SkeletonCard removed in commit bb4dc2f).
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/configuracion'
const POLICY_MOCK = '**/cobranza/policy**'
const SKELETON_DELAY_MS = 800

const POPULATED_POLICY = {
  cadencia: {
    s0: { maxIntents: 3, intervalHours: 24 },
    s1: { maxIntents: 5, intervalHours: 12 },
  },
  negociacion: {
    descuentoMaxPct: 15,
    plazoMaxMeses: 6,
  },
  escalacion: {
    triggerDays: 7,
  },
  compliance: {
    horarioInicio: '07:00',
    horarioFin: '21:00',
    sabadoPermitido: true,
    domingoFestivoPermitido: false,
  },
  versionId: 'v-1',
  updatedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza configuración — Phase 38-08 axe a11y', () => {
  test('skeleton visible during policy config load', async ({ page }) => {
    await page.route(POLICY_MOCK, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_POLICY),
      })
    })

    await page.goto(ROUTE)

    const candidates = page.locator(
      '[data-testid="cobranza-configuracion-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )



    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('zero axe violations on loaded configuración form', async ({ page }) => {
    await page.route(POLICY_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_POLICY),
      })
    })

    await page.goto(ROUTE)
    await waitForPageReady(page)

    await runAndAssertAxe(page)
  })
})
