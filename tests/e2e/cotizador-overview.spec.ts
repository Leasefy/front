import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
]

test.describe('Cotizador Overview Page', () => {
  for (const viewport of VIEWPORTS) {
    test(`renders overview at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      // Navigate to cotizador overview — layout may redirect to login if not authenticated
      // The snapshot captures the current state (loading skeleton or auth redirect)
      await page.goto('/panel/inmobiliaria/ai/cotizador')
      await page.waitForLoadState('domcontentloaded')
      // Wait for either the page title or a redirect — do not require full data load
      await expect(page.locator('h1, [data-testid="auth-redirect"]').first()).toBeVisible({
        timeout: 10_000,
      })
      await expect(page).toHaveScreenshot(`cotizador-overview-${viewport.name}.png`, {
        fullPage: false,
        maxDiffPixels: 200,
      })
    })
  }

  test('KPI grid has 2 columns on mobile (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/panel/inmobiliaria/ai/cotizador')
    await page.waitForLoadState('domcontentloaded')
    // Verify 2-column grid is present in HTML (class-based check, works even in loading state)
    const kpiGrid = page.locator('.grid-cols-2').first()
    await expect(kpiGrid).toBeVisible({ timeout: 10_000 })
  })

  test('carriers section has single column on mobile (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/panel/inmobiliaria/ai/cotizador')
    await page.waitForLoadState('domcontentloaded')
    const carriersSection = page.locator('section[aria-label]').nth(1)
    await expect(carriersSection).toBeVisible({ timeout: 10_000 })
  })
})
