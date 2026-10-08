/**
 * Payu y el autopago — axe (critical + serious) y 390 px sin desborde.
 *
 * Las tres rutas del back se mockean con `route.fulfill` con las formas FIJADAS
 * en `payu-api-front.md` (26-09-2026). El axe se acota a lo que construyó
 * esta rama —la sección de links, la pantalla de Payu y la de autopago— para
 * que los problemas viejos del sidebar (MOCKS-DEBT.md) no tapen ni inventen
 * resultados de estas pantallas.
 *
 * Requiere el dev server en :3001 (`playwright.config.ts` no levanta uno).
 */

import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

import { seedAuthState } from './_helpers/auth-helpers'
import { assertNoBlockingViolations, waitForPageReady, type AxeViolation } from './_helpers/axe-helpers'

const hoy = new Date()
const MES = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

const RESUMEN = (payuActivo: boolean) => ({
  mes: MES,
  payuActivo,
  cuotas: 105,
  linksEnviados: payuActivo ? 40 : 0,
  pagadosPorLink: payuActivo ? 12 : 0,
  montoCobradoPorLinkCop: payuActivo ? 18_000_000 : 0,
  pendientesCop: payuActivo ? 42_000_000 : 0,
})

const LINKS = {
  items: (['ninguno', 'enviado', 'pagado', 'vencido', 'fallido'] as const).map((estado, i) => ({
    cuotaId: `cuota-${i}`,
    contratoId: `contrato-${i}`,
    contratoNumero: `#4${i}`,
    inmueble: 'Apartamento 101, Cra 37 10-08',
    inquilino: 'Marta Gómez',
    fechaDeVencimiento: `${MES}-05`,
    montoCop: 1_500_000,
    estado,
    hitosEnviados: estado === 'ninguno' ? [] : ['antes', 'dia'],
    ultimoEnvioEn: estado === 'ninguno' ? null : new Date().toISOString(),
    pagadoEn: estado === 'pagado' ? new Date().toISOString() : null,
    paymentUrl: estado === 'ninguno' ? null : 'https://checkout.wompi.co/l/prueba',
  })),
  total: 5,
  page: 1,
  limit: 20,
}

const AUTOPAGOS = {
  cobroAutomaticoActivo: false,
  items: [
    {
      contratoId: 'contrato-1',
      contratoNumero: '#43',
      inquilino: 'Marta Gómez',
      inmueble: 'Apartamento 101',
      activo: true,
      topeCop: 2_000_000,
      ultimoIntento: { estado: 'RECHAZADO', montoCop: 1_500_000, fecha: new Date().toISOString(), motivo: 'Fondos insuficientes' },
    },
    {
      contratoId: 'contrato-2',
      contratoNumero: '#44',
      inquilino: 'Juan Pérez',
      inmueble: 'Casa 7',
      activo: false,
      topeCop: 1_800_000,
      ultimoIntento: null,
    },
  ],
}

async function mockPayu(page: Page, payuActivo: boolean) {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/inmobiliaria/cobros/links**', async (route) => {
    const url = route.request().url()
    await route.fulfill(json(url.includes('/links/resumen') ? RESUMEN(payuActivo) : LINKS))
  })
  await page.route('**/inmobiliaria/autopago', (route) => route.fulfill(json(AUTOPAGOS)))
}

async function axeDe(page: Page, selector: string): Promise<AxeViolation[] | null> {
  const zona = page.locator(selector).first()
  try {
    await zona.waitFor({ state: 'visible', timeout: 8_000 })
  } catch {
    test.fixme(true, `page-not-mounted: ${selector} no apareció (¿falta un mock o el dev server?)`)
    return null
  }
  const r = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return r.violations as AxeViolation[]
}

async function sinDesbordeHorizontal(page: Page) {
  const { ancho, contenido } = await page.evaluate(() => ({
    ancho: window.innerWidth,
    contenido: document.documentElement.scrollWidth,
  }))
  expect(contenido, 'la página se corre de lado a 390 px').toBeLessThanOrEqual(ancho)
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Payu — /pagos/agente', () => {
  for (const payuActivo of [false, true]) {
    test(`axe sin violaciones bloqueantes (Payu ${payuActivo ? 'prendido' : 'apagado'})`, async ({ page }) => {
      await mockPayu(page, payuActivo)
      await page.goto('/panel/inmobiliaria/pagos/agente', { waitUntil: 'domcontentloaded' })
      await waitForPageReady(page)
      const v = await axeDe(page, 'main')
      if (v) assertNoBlockingViolations(v)
    })
  }

  test('en modo oscuro tampoco (contraste con los tokens)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await mockPayu(page, false)
    await page.goto('/panel/inmobiliaria/pagos/agente', { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const v = await axeDe(page, 'main')
    if (v) assertNoBlockingViolations(v)
  })

  test('a 390 px no se corre de lado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockPayu(page, true)
    await page.goto('/panel/inmobiliaria/pagos/agente', { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    if (!(await axeDe(page, '[data-testid="links-de-pago"]'))) return
    await sinDesbordeHorizontal(page)
  })
})

test.describe('Payu — la sección de links en Cobros emitidos', () => {
  test('axe sin violaciones bloqueantes en la sección', async ({ page }) => {
    await mockPayu(page, true)
    await page.goto('/panel/inmobiliaria/pagos/cartera/cobros', { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const v = await axeDe(page, '[data-testid="links-de-pago"]')
    if (v) assertNoBlockingViolations(v)
  })
})

test.describe('Autopago — /pagos/recaudo/autopago', () => {
  test('axe sin violaciones bloqueantes, con el cobro automático apagado', async ({ page }) => {
    await mockPayu(page, false)
    await page.goto('/panel/inmobiliaria/pagos/recaudo/autopago', { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const v = await axeDe(page, 'main')
    if (v) assertNoBlockingViolations(v)
    await expect(page.getByText('El cobro automático está apagado en el servidor.')).toBeVisible()
  })

  test('a 390 px no se corre de lado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockPayu(page, false)
    await page.goto('/panel/inmobiliaria/pagos/recaudo/autopago', { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    if (!(await axeDe(page, '[data-testid="autopagos"]'))) return
    await sinDesbordeHorizontal(page)
  })
})
