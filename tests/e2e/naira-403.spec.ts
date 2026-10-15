/**
 * Naira — el 403 extremo a extremo (Fase 13, plan 13-08; D13-4, UI-SPEC §8.2, FG13-1, FG13-2).
 *
 * El residuo es lo que se vio con un permiso que ya no se tiene. Se mide con CENTINELAS del 200 (P5): el cuerpo que sirve
 * la red lleva un token único sembrado en cada texto «(ejemplo)», y de ese cuerpo salen el token, cada UUID y cada
 * instante ISO. Con el 200, al menos uno está en `page.content()` (control positivo); tras el 403, ninguno está en el
 * HTML (atributos incluidos: `href`, `dateTime`, `data-naira-asof`) y no queda ninguna cifra, corte ni número. Se mira el
 * HTML y no textos de pantalla porque un id o un corte pueden quedar en un atributo sin verse.
 *
 * El disparador es el refresco REAL de cada pestaña (P6): volver a ella (`visibilitychange`, useRefetchOnVisible) en
 * Briefing, Seguimiento, Aprobaciones y Memoria, y la segunda pregunta en Preguntar (no refresca al volver, 13-06). Las
 * fichas (señal, loop, propuesta) no están acá: no refrescan al volver, y su «otro id sin residuo» con el mismo hook ya lo
 * prueban los tests de vitest de 13-03, 13-04 y 13-05.
 *
 * El 200 y el 403 se separan por una FASE que el test cambia, no por el número de pedido: en desarrollo Next monta dos
 * veces cada efecto (StrictMode por defecto en el App Router, next/dist/build/define-env.js:126), así que la lectura de
 * una pestaña puede pedirse dos veces al montar. Lo que se exige es que el disparador real produzca EXACTAMENTE un pedido
 * más de esa lectura, y que ése sea el que deja la pestaña sin datos.
 *
 * Proyecto `chromium`, contra un servidor en `:3001` SIN simulado. Los tres tests de «red simulada (sin navegador)» no
 * piden `page`: corren sin servidor ni navegador y prueban la red contra el contrato.
 */

import { expect, test } from '@playwright/test'

import { ENDPOINTS_DE_NAIRA } from '../../src/lib/api/naira/contrato'
import {
  RESPUESTA_403_DE_CAPA_2,
  RESPUESTA_403_DEL_MIDDLEWARE,
  SUPERFICIES_DE_NAIRA,
  centinelasDe,
  ejemploDe,
  ejemploEstricto,
  esperarVista,
  idDelPedido,
  prepararNaira,
  sembrarToken,
  sinItemsDeAtencion,
  textoDeEs,
  urlDe,
  volverAlFoco,
  type Respuesta,
} from './panel-a11y/_helpers/naira-helpers'

/** Un token por test: letras y guiones (sin tiras de dígitos que parezcan un dato personal). */
function tokenNuevo(que: string): string {
  const letras = Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')
  return `n-e-e-${que}-${letras}`
}

/** Todos los textos de un cuerpo, sin conocer su forma. */
function textosDe(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor]
  if (Array.isArray(valor)) return valor.flatMap((x) => textosDe(x))
  if (valor !== null && typeof valor === 'object') return Object.values(valor).flatMap((x) => textosDe(x))
  return []
}

function tieneSeccionAtencion(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.some((x) => tieneSeccionAtencion(x))
  if (valor !== null && typeof valor === 'object') {
    if ((valor as { seccion?: unknown }).seccion === 'atencion') return true
    return Object.values(valor).some((x) => tieneSeccionAtencion(x))
  }
  return false
}

const LECTURAS_DE_LAS_PESTANAS = SUPERFICIES_DE_NAIRA.filter((x) => x.esPestana).map((x) => x.lectura)

test.describe('red simulada de Naira (sin navegador)', () => {
  test('[N13:e2e-red-por-contrato] cada endpoint del contrato mapea a su id y su ejemplo es contrato estricto', () => {
    const filas = Object.values(ENDPOINTS_DE_NAIRA)
    expect(filas.length).toBe(17)
    for (const fila of filas) {
      const pathname = '/api/agency/test-agency-id/naira' + fila.ruta.split('?')[0]!.replace(/\{[^}]+\}/g, 'x1')
      expect(idDelPedido(fila.metodo, pathname), `${fila.metodo} ${pathname}`).toBe(fila.id)
      expect(() => ejemploDe(fila.id), `ejemplo de ${fila.id}`).not.toThrow()
    }
    expect(idDelPedido('GET', '/api/agency/a/naira/no-existe')).toBeNull()
    const vista = ENDPOINTS_DE_NAIRA['memoria.vista']
    expect(idDelPedido('DELETE', '/api/agency/test-agency-id/naira' + vista.ruta)).toBeNull()
  })

  test('[N13:e2e-centinelas] el ejemplo sembrado sigue siendo contrato y deja centinelas; los de las tareas no incluyen los de las acciones', () => {
    for (const lectura of LECTURAS_DE_LAS_PESTANAS) {
      const token = tokenNuevo('centinela')
      const sembrado = sembrarToken(ejemploDe(lectura), token)
      expect(() => ejemploEstricto(lectura, sembrado), `sembrado de ${lectura}`).not.toThrow()
      const centinelas = centinelasDe(sembrado, token)
      expect(centinelas, `centinelas de ${lectura}`).toContain(token)
      expect(centinelas.length, `centinelas de ${lectura}`).toBeGreaterThanOrEqual(2)
    }
    const acciones = ejemploDe('acciones.lista')
    const textosDeLasAcciones = textosDe(acciones)
    const token = tokenNuevo('tareas')
    const tareas = sembrarToken(ejemploDe('tareas.lista'), token)
    const sinExcepto = centinelasDe(tareas, token)
    const conExcepto = centinelasDe(tareas, token, [acciones])
    expect(conExcepto.length).toBeLessThanOrEqual(sinExcepto.length)
    for (const c of conExcepto) {
      expect(textosDeLasAcciones.some((t) => t.includes(c)), `centinela de las tareas que sirven también las acciones: ${c}`).toBe(false)
    }
  })

  test('[N13:e2e-silencio-es-contrato] el briefing sin nada que requiera atención sigue siendo contrato', () => {
    const original = ejemploDe('briefing.dia')
    expect(tieneSeccionAtencion(original)).toBe(true)
    const silencio = sinItemsDeAtencion(original)
    expect(() => ejemploEstricto('briefing.dia', silencio)).not.toThrow()
    expect(tieneSeccionAtencion(silencio)).toBe(false)
  })
})

test.describe('403 de Naira extremo a extremo', () => {
  test.describe.configure({ timeout: 120_000 })

  for (const s of SUPERFICIES_DE_NAIRA.filter((x) => x.esPestana)) {
    test(`[N13:e2e-403-sin-residuo] ${s.vista} — el agente responde 200 y luego 403: ningún dato del 200 queda en el DOM`, async ({
      page,
    }) => {
      const token = tokenNuevo(s.vista)
      const sembrado = ejemploEstricto(s.lectura, sembrarToken(ejemploDe(s.lectura), token))
      const centinelas = centinelasDe(sembrado, token)
      const prohibido: Respuesta = s.vista === 'memoria' ? RESPUESTA_403_DE_CAPA_2 : RESPUESTA_403_DEL_MIDDLEWARE
      let fase: 'con_permiso' | 'sin_permiso' = 'con_permiso'
      const red = await prepararNaira(page, (id) =>
        id !== s.lectura ? null : fase === 'con_permiso' ? { status: 200, body: sembrado } : prohibido,
      )

      await page.goto(urlDe(s), { waitUntil: 'domcontentloaded' })
      await esperarVista(page, s.vista, 'ok')
      const compositor = page.locator('[data-naira-compositor]')
      const enviar = compositor.getByRole('button', { name: textoDeEs('inmobiliaria.ai.naira.preguntar.enviar') })
      if (s.vista === 'preguntar') {
        await compositor.locator('textarea').fill(`¿Cómo va la morosidad de la cartera? ${token}`)
        await enviar.click()
        await expect(page.locator('[data-naira-respuesta]').first()).toBeVisible({ timeout: 30_000 })
      }

      // Control positivo: con el 200, lo sembrado está en el HTML.
      const html = await page.content()
      expect(centinelas.some((c) => html.includes(c)), 'ningún centinela del 200 se ve con el 200').toBe(true)

      // El disparador REAL de esa pestaña, ya sin permiso.
      const antes = red.cuantos(s.lectura)
      fase = 'sin_permiso'
      if (s.vista === 'preguntar') {
        await compositor.locator('textarea').fill('¿Y la de los prospectos?')
        await enviar.click()
      } else {
        await volverAlFoco(page)
      }

      await esperarVista(page, s.vista, 'sin_permiso')
      await expect(page.locator('[data-testid="naira-sin-permiso"]')).toBeVisible()
      const html2 = await page.content()
      for (const c of centinelas) expect(html2, `residuo del 200: ${c}`).not.toContain(c)
      await expect(page.locator('[data-naira-numero]')).toHaveCount(0)
      await expect(page.locator('[data-naira-asof]')).toHaveCount(0)
      await expect(page.locator('[data-naira-cifra]')).toHaveCount(0)
      expect(red.cuantos(s.lectura)).toBe(antes + 1)
      expect(red.sinEjemplo).toEqual([])
    })
  }

  test('[N13:e2e-403-secundaria] aprobaciones — tareas en 403 tras un 200: la sección desaparece sin rastro', async ({ page }) => {
    const aprobaciones = SUPERFICIES_DE_NAIRA.find((x) => x.vista === 'aprobaciones')!
    const token = tokenNuevo('tareas')
    const tareas = ejemploEstricto('tareas.lista', sembrarToken(ejemploDe('tareas.lista'), token))
    const centinelas = centinelasDe(tareas, token, [ejemploDe('acciones.lista')])
    let fase: 'con_permiso' | 'sin_permiso' = 'con_permiso'
    const red = await prepararNaira(page, (id) =>
      id !== 'tareas.lista' ? null : fase === 'con_permiso' ? { status: 200, body: tareas } : RESPUESTA_403_DEL_MIDDLEWARE,
    )

    await page.goto(urlDe(aprobaciones), { waitUntil: 'domcontentloaded' })
    await esperarVista(page, 'aprobaciones', 'ok')
    await expect(page.locator('[data-naira-tareas]')).toBeVisible({ timeout: 30_000 })
    const html = await page.content()
    expect(centinelas.some((c) => html.includes(c)), 'ningún centinela de las tareas se ve con el 200').toBe(true)

    const antes = red.cuantos('tareas.lista')
    fase = 'sin_permiso'
    await page.reload({ waitUntil: 'domcontentloaded' })
    await esperarVista(page, 'aprobaciones', 'ok')
    await expect.poll(() => red.cuantos('tareas.lista')).toBeGreaterThanOrEqual(antes + 1)
    await expect(page.locator('[data-naira-tareas]')).toHaveCount(0)
    const html2 = await page.content()
    for (const c of centinelas) expect(html2, `residuo de las tareas: ${c}`).not.toContain(c)
    expect(red.sinEjemplo).toEqual([])
  })

  test('[N13:e2e-403-escritura] memoria — corregir en 403: el control se deshabilita sin eco y la lectura se conserva', async ({
    page,
  }) => {
    const memoria = SUPERFICIES_DE_NAIRA.find((x) => x.vista === 'memoria')!
    const token = tokenNuevo('correccion')
    const red = await prepararNaira(page, (id) => (id === 'memoria.corregir' ? RESPUESTA_403_DEL_MIDDLEWARE : null))

    await page.goto(urlDe(memoria), { waitUntil: 'domcontentloaded' })
    await esperarVista(page, 'memoria', 'ok')
    const item = page
      .locator('[data-naira-memoria="present"]')
      .filter({ has: page.locator('[data-naira-accion="corregir"]') })
      .first()
    const corregir = item.locator('[data-naira-accion="corregir"]')
    await corregir.click()
    const dialogo = page.locator('[data-naira-dialogo-de-correccion]')
    await expect(dialogo).toBeVisible()
    const campo = dialogo.locator('textarea')
    const actual = await campo.inputValue()
    await campo.fill(`${actual} ${token}`)
    await page.locator('[data-testid="naira-corregir-guardar"]').click()

    await expect(page.getByText(textoDeEs('inmobiliaria.ai.naira.memoria.acciones.sinPermiso')).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(corregir).toBeDisabled()
    expect(await page.content(), 'eco del texto de la corrección').not.toContain(token)
    await esperarVista(page, 'memoria', 'ok')
    expect(await page.locator('[data-naira-memoria="present"]').count()).toBeGreaterThanOrEqual(1)
    expect(red.cuantos('memoria.corregir')).toBe(1)
    expect(red.sinEjemplo).toEqual([])
  })
})
