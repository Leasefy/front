/**
 * Naira — accesibilidad de las 5 pestañas y las 3 fichas (Fase 13, plan 13-08; UI-SPEC §11, FG13-18).
 *
 * Qué prueba: cada superficie de Naira monta DENTRO del workspace (primero se exige ver `[data-naira-vista]` con su
 * estado) y recién después axe mira `main` (critical + serious = 0). La red de Naira la sirve `naira-helpers.ts` con los
 * ejemplos de 13-01 validados en estricto; este spec no contesta nada por su cuenta.
 *
 * Cómo se corre: `--project=panel-a11y`, contra un servidor en `:3001` (sin `webServer` en playwright.config.ts).
 *   · `[N13:e2e-montado]` y `[N13:e2e-estado]` exigen un servidor SIN simulado (`NEXT_PUBLIC_USE_MOCK_API=false`): los
 *     datos llegan por la red, la vista NO lleva `data-sample` y hay pedidos de su lectura.
 *   · `[N13:e2e-ejemplo]` exige un servidor CON simulado (`NEXT_PUBLIC_USE_MOCK_API=true`): la vista lleva
 *     `data-sample="true"` y NINGÚN pedido de Naira sale a la red.
 * Se separan con `--grep "N13:e2e-ejemplo"` / `--grep-invert "N13:e2e-ejemplo"`, nunca saltando tests: corridos contra el
 * servidor equivocado dan ROJO, no verde (P2).
 *
 * El modo de desarrollo de Next monta dos veces cada efecto (StrictMode por defecto en el App Router,
 * next/dist/build/define-env.js:126): una lectura puede pedirse dos veces al montar. Por eso la ficha de una propuesta
 * se mide como «pide su detalle al montar y NO lo vuelve a pedir al volver a la pestaña» (D13-14), no por un conteo fijo.
 */

import { expect, test, type Page } from '@playwright/test'

import {
  RESPUESTA_403_DEL_MIDDLEWARE,
  RESPUESTA_404,
  SUPERFICIES_DE_NAIRA,
  auditarMain,
  ejemploDe,
  ejemploEstricto,
  esperarVista,
  prepararNaira,
  sinItemsDeAtencion,
  textoDeEs,
  urlDe,
  volverAlFoco,
  type SuperficieDeNaira,
} from './_helpers/naira-helpers'

function superficie(vista: string): SuperficieDeNaira {
  const s = SUPERFICIES_DE_NAIRA.find((x) => x.vista === vista)
  if (s === undefined) throw new Error(`sin superficie ${vista}`)
  return s
}

/** Escribe en el compositor y pulsa «Enviar pregunta» (13-06: nada se envía al cargar). */
async function preguntar(page: Page, texto: string): Promise<void> {
  const compositor = page.locator('[data-naira-compositor]')
  await compositor.locator('textarea').fill(texto)
  await compositor.getByRole('button', { name: textoDeEs('inmobiliaria.ai.naira.preguntar.enviar') }).click()
}

test.describe('Naira — accesibilidad (13-08)', () => {
  test.describe.configure({ timeout: 120_000 })

  for (const s of SUPERFICIES_DE_NAIRA) {
    test(`[N13:e2e-montado] ${s.vista} — monta con datos del agente por la red y main sin violaciones serias de axe`, async ({
      page,
    }, testInfo) => {
      const red = await prepararNaira(page)
      await page.goto(urlDe(s), { waitUntil: 'domcontentloaded' })
      await esperarVista(page, s.vista, 'ok')
      const vista = page.locator(`[data-naira-vista="${s.vista}"]`)
      // Servidor SIN simulado: lo que se ve vino de la red, no de un ejemplo del cliente.
      await expect(vista).not.toHaveAttribute('data-sample')

      if (s.vista === 'preguntar') {
        // 13-06: al cargar no se pregunta nada; la respuesta llega recién al enviar.
        expect(red.cuantos('conversacion.preguntar')).toBe(0)
        await preguntar(page, '¿Cómo va la morosidad de la cartera?')
        await expect(page.locator('[data-naira-respuesta]').first()).toBeVisible({ timeout: 30_000 })
        await expect(vista).not.toHaveAttribute('data-sample')
      }
      expect(red.cuantos(s.lectura)).toBeGreaterThanOrEqual(1)

      if (s.vista === 'aprobaciones') {
        // 13-05: la lista NO pide el detalle de ninguna propuesta.
        expect(red.cuantos('acciones.detalle')).toBe(0)
      }
      let detalleAlMontar = 0
      if (s.vista === 'propuesta') {
        // 13-05: la ficha pide su detalle al montar (1 vez; 2 bajo el StrictMode de desarrollo) …
        detalleAlMontar = red.cuantos('acciones.detalle')
        expect(detalleAlMontar).toBeGreaterThanOrEqual(1)
        expect(detalleAlMontar).toBeLessThanOrEqual(2)
        // … y no refresca al volver a la pestaña (D13-14).
        await volverAlFoco(page)
      }

      await auditarMain(page, s.vista, testInfo)

      if (s.vista === 'propuesta') expect(red.cuantos('acciones.detalle')).toBe(detalleAlMontar)
      expect(red.sinEjemplo).toEqual([])
    })
  }

  for (const s of SUPERFICIES_DE_NAIRA) {
    test(`[N13:e2e-ejemplo] ${s.vista} — modo ejemplo con la marca visible, captura para la revisión y main sin violaciones serias de axe`, async ({
      page,
    }, testInfo) => {
      const red = await prepararNaira(page)
      await page.goto(urlDe(s), { waitUntil: 'domcontentloaded' })
      await esperarVista(page, s.vista, 'ok')
      if (s.vista === 'preguntar') {
        // La conversación es de ejemplo desde su primera respuesta (conDesenlace de src/lib/naira/conversacion.ts).
        await preguntar(page, '¿Cómo va la morosidad de la cartera?')
        await expect(page.locator('[data-naira-respuesta]').first()).toBeVisible({ timeout: 30_000 })
      }
      // Servidor CON simulado: la vista lleva la marca de ejemplo (D13-6).
      await expect(page.locator(`[data-naira-vista="${s.vista}"]`)).toHaveAttribute('data-sample', 'true')
      // Ninguna cifra sin su «DATO DE EJEMPLO».
      await expect(page.locator('[data-naira-numero]:not([data-naira-ejemplo="true"])')).toHaveCount(0)
      // Nada de Naira salió a la red.
      expect(red.pedidos).toEqual([])
      expect(red.sinEjemplo).toEqual([])

      await testInfo.attach(`${s.vista}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
      await auditarMain(page, s.vista, testInfo)
    })
  }

  test('[N13:e2e-estado] briefing sin_permiso — el 403 del middleware deja solo «No tienes acceso», sin cifras, y main sin violaciones serias de axe', async ({
    page,
  }, testInfo) => {
    const briefing = superficie('briefing')
    const red = await prepararNaira(page, (id) => (id === 'briefing.dia' ? RESPUESTA_403_DEL_MIDDLEWARE : null))
    await page.goto(urlDe(briefing), { waitUntil: 'domcontentloaded' })
    await esperarVista(page, 'briefing', 'sin_permiso')
    await expect(page.locator('[data-testid="naira-sin-permiso"]')).toBeVisible()
    await expect(page.locator('[data-naira-numero]')).toHaveCount(0)
    expect(red.cuantos('briefing.dia')).toBeGreaterThanOrEqual(1)
    await auditarMain(page, 'briefing', testInfo)
    expect(red.sinEjemplo).toEqual([])
  })

  test('[N13:e2e-estado] briefing apagada — el 404 deja la vista de Naira apagada, sin cifras, y main sin violaciones serias de axe', async ({
    page,
  }, testInfo) => {
    const briefing = superficie('briefing')
    const red = await prepararNaira(page, (id) => (id === 'briefing.dia' ? RESPUESTA_404 : null))
    await page.goto(urlDe(briefing), { waitUntil: 'domcontentloaded' })
    await esperarVista(page, 'briefing', 'apagada')
    await expect(page.locator('[data-testid="naira-apagada"]')).toBeVisible()
    await expect(page.locator('[data-naira-numero]')).toHaveCount(0)
    expect(red.cuantos('briefing.dia')).toBeGreaterThanOrEqual(1)
    await auditarMain(page, 'briefing', testInfo)
    expect(red.sinEjemplo).toEqual([])
  })

  test('[N13:e2e-estado] briefing silencio — sin nada que requiera atención se dice el silencio (nunca «no hay nada») y main sin violaciones serias de axe', async ({
    page,
  }, testInfo) => {
    const briefing = superficie('briefing')
    const silencio = { status: 200, body: ejemploEstricto('briefing.dia', sinItemsDeAtencion(ejemploDe('briefing.dia'))) }
    const red = await prepararNaira(page, (id) => (id === 'briefing.dia' ? silencio : null))
    await page.goto(urlDe(briefing), { waitUntil: 'domcontentloaded' })
    await esperarVista(page, 'briefing', 'ok')
    await expect(page.locator('[data-naira-vista="briefing"]')).not.toHaveAttribute('data-sample')
    await expect(page.locator('[data-naira-silencio]').first()).toBeVisible()
    expect(red.cuantos('briefing.dia')).toBeGreaterThanOrEqual(1)
    await auditarMain(page, 'briefing', testInfo)
    expect(red.sinEjemplo).toEqual([])
  })
})
