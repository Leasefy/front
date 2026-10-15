/**
 * naira-helpers.ts — la red simulada de Naira para los E2E de 13-08 (Fase 13; D13-4, D13-6, FG13-3, FG13-18).
 *
 * Qué es: la ÚNICA pieza que contesta, en el navegador, lo que el panel le pide a Naira. Sirve los ejemplos de 13-01
 * (`EJEMPLOS_DE_NAIRA`), cada uno validado en ESTRICTO contra el contrato (`RESPUESTA_ESTRICTA_POR_ENDPOINT`) antes de
 * salir: un cuerpo hecho a la medida de un componente no pasa (FG13-3). Además da los estados de D13-4 con sus formas
 * canónicas (el 403 del middleware de roles SIN `reason`, el 403 de capa 2 CON `reason`, el 404), y un pedido a Naira
 * que no corresponde a ninguna fila de `ENDPOINTS_DE_NAIRA` se ABORTA y queda anotado: una ruta nueva del cliente no se
 * sirve sola (P7).
 *
 * Por qué no se usan tal cual las piezas de la suite panel-a11y:
 *   · `seedAuthState` entra como admin del monolito pero da permisos de agente solo de cobranza y cotizador; con D13-3
 *     (fail-closed) Naira quedaría oculta. `darPermisosDeNaira` registra DESPUÉS el override de `/my-permissions` con
 *     `naira` (gana el último registrado, auth-helpers.ts:143-145) (P3).
 *   · `runAxeOrFixme` / `runAndAssertAxe` convierten una página que no montó en un test SALTADO (`test.fixme`,
 *     axe-helpers.ts:139). Acá primero se exige ver la vista con su estado (`esperarVista`) y recién después axe mira
 *     `main` (`auditarMain`); la página entera solo se anota (P4, FG13-18).
 *
 * La presentación de Naira se marca vista en el BACK simulado (`/inmobiliaria/onboarding-visto`, D13-22), igual que el
 * recorrido del panel. Sin localStorage: la clave vieja 'leasefy.agent-intro.naira' ya no existe (B10a).
 *
 * Ningún spec llama `route.fulfill` directo: todo lo que responde a Naira vive en este archivo (P7).
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'

import { seedAuthState } from './auth-helpers'
import { assertNoBlockingViolations, type AxeViolation } from './axe-helpers'
import {
  ACCIONES_DE_NAIRA,
  ENDPOINTS_DE_NAIRA,
  NAIRA_BASE,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type IdDeEndpoint,
} from '../../../../src/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '../../../../src/lib/data/mock-naira'
import { RUTA_DE_NAIRA } from '../../../../src/lib/nav/rutas-de-naira'
import es from '../../../../src/lib/i18n/locales/es.json'

// ── Constantes ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Las MISMAS etiquetas que axe-helpers.ts:147. */
export const ETIQUETAS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

/** El id de las fichas N4: la red sirve el detalle por su ruta, sea cual sea el id. */
export const ID_DE_FICHA_E2E = '00000000-0000-4000-8000-0000000e2e01'

/** = claveDeLaPresentacionDelAgente('naira') (onboarding-visto.service.ts:24-26; D13-22). */
export const CLAVE_DE_LA_INTRO = 'agente:naira'

/** = CLAVE_DEL_RECORRIDO_DEL_PANEL (onboarding-visto.service.ts:21). */
export const CLAVE_DEL_RECORRIDO = 'recorrido-del-panel'

// ── Las superficies del workspace (una fila por page.tsx) ──────────────────────────────────────────────────────────

export interface SuperficieDeNaira {
  readonly vista: string
  readonly segmento: string
  readonly lectura: IdDeEndpoint
  readonly esPestana: boolean
}

export const SUPERFICIES_DE_NAIRA: readonly SuperficieDeNaira[] = [
  { vista: 'briefing', segmento: '', lectura: 'briefing.dia', esPestana: true },
  { vista: 'senal', segmento: 'senales/[promocionId]', lectura: 'senal.detalle', esPestana: false },
  { vista: 'seguimiento', segmento: 'seguimiento', lectura: 'seguimiento.lista', esPestana: true },
  { vista: 'loop', segmento: 'seguimiento/[loopId]', lectura: 'seguimiento.detalle', esPestana: false },
  { vista: 'aprobaciones', segmento: 'aprobaciones', lectura: 'acciones.lista', esPestana: true },
  { vista: 'propuesta', segmento: 'aprobaciones/[proposalId]', lectura: 'acciones.detalle', esPestana: false },
  { vista: 'preguntar', segmento: 'preguntar', lectura: 'conversacion.preguntar', esPestana: true },
  { vista: 'memoria', segmento: 'memoria', lectura: 'memoria.vista', esPestana: true },
]

/** La URL de una superficie: la raíz del workspace más su segmento, con cada `[param]` ⇒ `ID_DE_FICHA_E2E`. */
export function urlDe(s: SuperficieDeNaira): string {
  const raiz = RUTA_DE_NAIRA.replace(/\/+$/, '')
  if (s.segmento === '') return raiz
  return raiz + '/' + s.segmento.replace(/\[[^\]]+\]/g, ID_DE_FICHA_E2E)
}

// ── Tipos de la red ─────────────────────────────────────────────────────────────────────────────────────────────────

export type Respuesta = { readonly status: number; readonly body: unknown }

/** n = 1, 2, … por id; `null` ⇒ el ejemplo 200 por defecto. */
export type Responder = (id: IdDeEndpoint, n: number) => Respuesta | null

export interface PedidoDeNaira {
  readonly id: IdDeEndpoint
  readonly metodo: string
  readonly ruta: string
  readonly n: number
}

export interface RedDeNaira {
  readonly pedidos: PedidoDeNaira[]
  readonly sinEjemplo: string[]
  cuantos(id: IdDeEndpoint): number
}

// ── Del pedido a su fila del contrato ───────────────────────────────────────────────────────────────────────────────

function escaparParaRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')
}

/** La expresión ANCLADA de una ruta del contrato: todo literal salvo cada `{param}`, que vale un segmento sin barra. */
function expresionDeLaRuta(ruta: string): RegExp {
  let relativa = ruta.split('?')[0] ?? ''
  if (relativa.startsWith(NAIRA_BASE)) relativa = relativa.slice(NAIRA_BASE.length)
  const partes = relativa.split(/(\{[^}]+\})/)
  const cuerpo = partes.map((p) => (/^\{[^}]+\}$/.test(p) ? '[^/]+' : escaparParaRegex(p))).join('')
  return new RegExp('^' + cuerpo + '$')
}

/**
 * El id del contrato de un pedido del navegador. Toma lo que sigue a `/api/agency/<id>/naira` en el `pathname` (sin
 * query) y lo compara, con su método, contra cada fila de `ENDPOINTS_DE_NAIRA`. Desconocido ⇒ `null` (nunca adivina);
 * más de una fila ⇒ tira (la tabla sería ambigua).
 */
export function idDelPedido(metodo: string, pathname: string): IdDeEndpoint | null {
  const m = /\/api\/agency\/[^/]+\/naira(\/[^?#]*)?$/.exec(pathname.split('?')[0] ?? '')
  if (m === null) return null
  const resto = m[1] ?? ''
  const metodoNormal = metodo.toUpperCase()
  const coinciden = Object.values(ENDPOINTS_DE_NAIRA).filter(
    (fila) => fila.metodo === metodoNormal && expresionDeLaRuta(fila.ruta).test(resto),
  )
  if (coinciden.length === 0) return null
  if (coinciden.length > 1) {
    throw new Error(`tabla ambigua: ${metodoNormal} ${resto} coincide con ${coinciden.map((f) => f.id).join(', ')}`)
  }
  return coinciden[0]?.id ?? null
}

// ── Cuerpos: siempre contrato ───────────────────────────────────────────────────────────────────────────────────────

/** Valida el cuerpo con el esquema ESTRICTO de su endpoint (tira con los `issues`) y devuelve EL MISMO cuerpo. */
export function ejemploEstricto(id: IdDeEndpoint, cuerpo: unknown): unknown {
  RESPUESTA_ESTRICTA_POR_ENDPOINT[id].parse(cuerpo)
  return cuerpo
}

/** El ejemplo de 13-01 de ese endpoint, copiado y validado en estricto. */
export function ejemploDe(id: IdDeEndpoint): unknown {
  return ejemploEstricto(id, structuredClone(EJEMPLOS_DE_NAIRA[id]))
}

function mapearHojas(valor: unknown, f: (s: string) => string): unknown {
  if (typeof valor === 'string') return f(valor)
  if (Array.isArray(valor)) return valor.map((x) => mapearHojas(x, f))
  if (valor !== null && typeof valor === 'object') {
    const copia: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor)) copia[k] = mapearHojas(v, f)
    return copia
  }
  return valor
}

/** Copia del cuerpo donde cada texto que contiene «(ejemplo)» termina con el token. */
export function sembrarToken(cuerpo: unknown, token: string): unknown {
  return mapearHojas(cuerpo, (s) => (s.includes('(ejemplo)') ? `${s} ${token}` : s))
}

/** Copia del cuerpo sin los objetos con `seccion === 'atencion'` en ningún arreglo. */
export function sinItemsDeAtencion(cuerpo: unknown): unknown {
  if (Array.isArray(cuerpo)) {
    return cuerpo
      .filter((x) => !(x !== null && typeof x === 'object' && (x as { seccion?: unknown }).seccion === 'atencion'))
      .map((x) => sinItemsDeAtencion(x))
  }
  if (cuerpo !== null && typeof cuerpo === 'object') {
    const copia: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(cuerpo)) copia[k] = sinItemsDeAtencion(v)
    return copia
  }
  return cuerpo
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ES_INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function hojas(valor: unknown, salida: string[]): string[] {
  if (typeof valor === 'string') salida.push(valor)
  else if (Array.isArray(valor)) for (const x of valor) hojas(x, salida)
  else if (valor !== null && typeof valor === 'object') for (const v of Object.values(valor)) hojas(v, salida)
  return salida
}

/**
 * Los centinelas del 200 (P5): el token y cada texto del cuerpo que lo contiene, es un UUID o un instante ISO con hora;
 * menos los que también sirve otra lectura de la misma página (los que aparecen en el JSON de algún cuerpo de `excepto`).
 */
export function centinelasDe(cuerpo: unknown, token: string, excepto?: readonly unknown[]): string[] {
  const otros = (excepto ?? []).map((x) => JSON.stringify(x)).join('\n')
  const lista = [token, ...hojas(cuerpo, []).filter((s) => s.includes(token) || ES_UUID.test(s) || ES_INSTANTE.test(s))]
  const unicos = [...new Set(lista)]
  return unicos.filter((c) => !otros.includes(JSON.stringify(c).slice(1, -1)))
}

// ── Respuestas canónicas de error (D13-4) ───────────────────────────────────────────────────────────────────────────

/** La forma del `agencyRoleMiddleware` del agente: SIN `reason` (FG13-2). */
export const RESPUESTA_403_DEL_MIDDLEWARE: Respuesta = { status: 403, body: { error: 'Forbidden — insufficient role' } }

/** Un 403 de la capa 2 (el servicio), con `reason`. */
export const RESPUESTA_403_DE_CAPA_2: Respuesta = { status: 403, body: { error: 'Forbidden', reason: 'e2e_capa_2' } }

/** Un 404 sin `reason`: el cliente lo decide por el `si404` de la fila. */
export const RESPUESTA_404: Respuesta = { status: 404, body: { error: 'Not found' } }

// ── La red en el navegador ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * El agente vive en otro origen que `:3001`: la respuesta cumplida lleva sus cabeceras CORS para que el `fetch` la lea
 * (Playwright contesta él mismo el preflight al interceptar).
 */
function cabecerasCors(origen: string | undefined): Record<string, string> {
  if (origen === undefined || origen === '') return { 'access-control-allow-origin': '*' }
  return { 'access-control-allow-origin': origen, 'access-control-allow-credentials': 'true' }
}

/** El override de `/my-permissions` del agente con `naira` (registrado DESPUÉS de `seedAuthState`, gana, P3). */
export async function darPermisosDeNaira(page: Page, acciones: readonly string[] = ACCIONES_DE_NAIRA): Promise<void> {
  await page.route('**/api/agency/*/my-permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cabecerasCors(route.request().headers()['origin']),
      body: JSON.stringify({ naira: [...acciones] }),
    })
  })
}

function vistaDelOnboarding(clave: string): Record<string, unknown> {
  return { clave, estado: 'omitido', fecha: '2000-01-01T00:00:00.000Z', usuarioId: null, quien: null }
}

/** La presentación de Naira y el recorrido del panel, ya vistos por la inmobiliaria en el back simulado (P8, D13-22). */
export async function sinIntroDeNaira(page: Page): Promise<void> {
  await page.route('**/inmobiliaria/onboarding-visto**', async (route) => {
    const pedido = route.request()
    if (pedido.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: cabecerasCors(pedido.headers()['origin']),
        body: JSON.stringify({
          disponible: true,
          motivo: null,
          vistas: [vistaDelOnboarding(CLAVE_DE_LA_INTRO), vistaDelOnboarding(CLAVE_DEL_RECORRIDO)],
        }),
      })
      return
    }
    const segmentos = new URL(pedido.url()).pathname.split('/').filter((x) => x !== '')
    const clave = decodeURIComponent(segmentos[segmentos.length - 1] ?? '')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cabecerasCors(pedido.headers()['origin']),
      body: JSON.stringify({ ...vistaDelOnboarding(clave), yaEstaba: true }),
    })
  })
}

/**
 * La red de Naira: `'**\/api/agency/*\/naira/**'`. Un pedido sin fila del contrato se aborta y queda en `sinEjemplo`;
 * con fila, se cuenta (n = 1, 2, … por id) y se responde `responder(id, n)` o, si devuelve `null`, el ejemplo 200.
 */
export async function instalarRedDeNaira(page: Page, responder?: Responder): Promise<RedDeNaira> {
  const pedidos: PedidoDeNaira[] = []
  const sinEjemplo: string[] = []
  const red: RedDeNaira = {
    pedidos,
    sinEjemplo,
    cuantos: (id) => pedidos.filter((p) => p.id === id).length,
  }

  await page.route('**/api/agency/*/naira/**', async (route) => {
    const pedido = route.request()
    const url = new URL(pedido.url())
    const metodo = pedido.method()
    const cors = cabecerasCors(pedido.headers()['origin'])
    if (metodo === 'OPTIONS') {
      // Un preflight que llegue hasta acá (Playwright suele contestarlo solo) no es un pedido de Naira.
      await route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'authorization, content-type',
        },
      })
      return
    }
    const id = idDelPedido(metodo, url.pathname)
    if (id === null) {
      sinEjemplo.push(`${metodo} ${url.pathname}`)
      await route.abort()
      return
    }
    const n = red.cuantos(id) + 1
    pedidos.push({ id, metodo, ruta: url.pathname + url.search, n })
    let respuesta: Respuesta
    try {
      respuesta = responder?.(id, n) ?? { status: 200, body: ejemploDe(id) }
    } catch (e) {
      // Un cuerpo que no es contrato no se sirve: queda anotado y el test que exige `sinEjemplo` vacío cae.
      sinEjemplo.push(`${metodo} ${url.pathname} — cuerpo fuera de contrato: ${String(e).slice(0, 300)}`)
      await route.abort()
      return
    }
    await route.fulfill({
      status: respuesta.status,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify(respuesta.body),
    })
  })

  return red
}

/** Todo lo que un E2E de Naira necesita antes de navegar, EN ESTE ORDEN (no navega). */
export async function prepararNaira(page: Page, responder?: Responder): Promise<RedDeNaira> {
  await seedAuthState(page)
  await darPermisosDeNaira(page)
  await sinIntroDeNaira(page)
  return instalarRedDeNaira(page, responder)
}

// ── Montaje, foco y axe ─────────────────────────────────────────────────────────────────────────────────────────────

/** [N13:e2e-montado]: la vista de Naira montó con ese estado. Sin esto, ningún E2E de Naira sigue (FG13-18). */
export async function esperarVista(page: Page, vista: string, estado = 'ok'): Promise<void> {
  await expect(page.locator(`[data-naira-vista="${vista}"][data-naira-estado="${estado}"]`)).toBeVisible({ timeout: 30_000 })
}

/** Volver a la pestaña: el mismo `visibilitychange` que escucha useRefetchOnVisible. */
export async function volverAlFoco(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

/**
 * axe DESPUÉS del montaje (P4): el gate es `main` (critical + serious = 0); la página entera va como anotación
 * `axe-fuera-de-main` (id de la regla, impacto y selectores), sin bloquear.
 */
export async function auditarMain(page: Page, vista: string, testInfo: TestInfo): Promise<void> {
  // 1) La vista está: axe nunca mira una página que no montó (FG13-18).
  await expect(page.locator(`[data-naira-vista="${vista}"]`)).toBeVisible()
  // 2) El gate: `main` (critical + serious = 0), con las etiquetas de axe-helpers.ts:147.
  const enMain = await new AxeBuilder({ page }).include('main').withTags([...ETIQUETAS_AXE]).analyze()
  assertNoBlockingViolations(enMain.violations as AxeViolation[])
  // 3) Informativo: la página entera. Lo que falle fuera de `main` es del layout (MOCKS-DEBT.md:29): se anota.
  const entera = await new AxeBuilder({ page }).withTags([...ETIQUETAS_AXE]).analyze()
  for (const v of entera.violations as AxeViolation[]) {
    if (v.impact !== 'critical' && v.impact !== 'serious') continue
    const selectores = v.nodes.slice(0, 5).map((n) => n.target.join(' > ')).join(' | ')
    testInfo.annotations.push({ type: 'axe-fuera-de-main', description: `${v.id} [${v.impact}] ${selectores}` })
  }
}

/** Un texto de es.json por su ruta de puntos; una clave ausente tira. */
export function textoDeEs(clave: string): string {
  let nodo: unknown = es
  for (const parte of clave.split('.')) {
    nodo = nodo !== null && typeof nodo === 'object' ? (nodo as Record<string, unknown>)[parte] : undefined
  }
  if (typeof nodo !== 'string') throw new Error(`clave ausente en es.json: ${clave}`)
  return nodo
}
