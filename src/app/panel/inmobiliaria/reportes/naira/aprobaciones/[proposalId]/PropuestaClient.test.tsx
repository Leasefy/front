/**
 * PropuestaClient.test.tsx — la ficha de una propuesta de Naira (13-05, Tarea 5).
 *
 * Qué prueba: el ok pinta la consecuencia PRIMERO, su corte inmediatamente debajo y fuera del desplegable (en hora de
 * Colombia), la meta, la decisión y el razonamiento en ese orden; el detalle se pide una vez al abrir y solo «Actualizar
 * propuesta» lo vuelve a pedir (FG13-14); la huella que viaja es la RENDERIZADA y un conflicto de huella solo se resuelve
 * cargando la versión actual, sin reenviar (FG13-15); otra propuesta que da 403 no deja nada (FG13-1); no encontrada lo
 * dice; la ficha tiene vuelta; sin `puedeDecidir` no hay botones; con datos de ejemplo no se decide; los enlaces salen del
 * registro y dependen de `signal-view`; y nada dice quién decidió (B-5).
 *
 * Arnés (molde de 13-04): createRoot + act, stub de i18n real (es.json), `next/link` → `<a data-prefetch>`,
 * `next/navigation` con `useRouter`, `useAuth` con AGY-1, el cliente mockeado en `leerPropuesta` y `decidirPropuesta`,
 * permisos por conjunto, popover plano y `document.visibilityState` controlado. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { leer, decidir, permisos } = vi.hoisted(() => ({
  leer: vi.fn(),
  decidir: vi.fn(),
  permisos: { conjunto: new Set<string>() },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...resto }: React.PropsWithChildren<{ href: string; prefetch?: boolean } & Record<string, unknown>>) =>
    React.createElement('a', { href, 'data-prefetch': String(prefetch), ...resto }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/aprobaciones/PROP-1',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerPropuesta: leer,
  decidirPropuesta: decidir,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string, a: string) => m !== 'naira' || permisos.conjunto.has(a),
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaActionDetail } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { RUTA_DE_APROBACIONES, rutaDeLaSenal } from '@/lib/nav/rutas-de-naira'

import { PropuestaClient } from './PropuestaClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.detalle']
const ESTRICTO_D = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.decidir']
const BASE = EJEMPLOS_DE_NAIRA['acciones.detalle']
const CORTE_1 = '2000-01-03T03:30:00.000Z'
const CORTE_2 = '2000-01-02T11:15:00.000Z'
const HUELLA_A = 'a'.repeat(64)
const HUELLA_B = 'b'.repeat(64)

function detalleCon(texto: string, huella: string, over: Partial<NairaActionDetail> = {}): NairaActionDetail {
  const hecho = { source: 'agent.payments', confidence: 0.8765, volatility: 'slow', trust: 'system' }
  return {
    ...BASE,
    consecuencia: {
      texto,
      tipo: 'crear_tarea',
      clase: 'interna_reversible',
      destinatario: { kind: 'rol', rol: 'role:cartera' },
      reversible: true,
      venceEn: '2000-01-03T11:35:00.000Z',
    },
    razonamiento: {
      senal: { senalId: 'SEN-1', promocionId: 'PROMO-1', detectorId: 'cartera.recaudo_tendencia', metricId: 'cartera.recovered_cop_30d' },
      hechos: [
        { ...hecho, value: 4711, asOf: CORTE_1 },
        { ...hecho, value: '5923', asOf: CORTE_2 },
        { ...hecho, value: 6143, asOf: CORTE_1 },
      ],
      investigacion: { kind: 'referencia', id: 'PROMO-1' },
    },
    huella,
    estado: 'pendiente',
    puedeDecidir: true,
    ...over,
  }
}

const DETALLE_A = detalleCon('CONSECUENCIA-A (ejemplo)', HUELLA_A)
const DETALLE_B = detalleCon('CONSECUENCIA-B (ejemplo)', HUELLA_B)
const DECIDIDA = { kind: 'decidida' as const, proposalId: 'PROP-1', decision: 'aprobada' as const, decisionId: 'DEC-SECRETO-9' }

const ok = (d: NairaActionDetail, origen: 'agente' | 'ejemplo' = 'agente'): EstadoNaira<NairaActionDetail> => ({
  kind: 'ok',
  data: ESTRICTO.parse(d),
  origen,
})

let contenedor: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })

async function montar(proposalId = 'PROP-1') {
  act(() => {
    root.render(<PropuestaClient proposalId={proposalId} />)
  })
  await asentar()
}

async function clic(el: Element | null | undefined) {
  expect(el).toBeTruthy()
  await act(async () => {
    ;(el as HTMLElement).click()
  })
  await asentar()
}

const q = (sel: string) => contenedor.querySelector(sel)
const aprobar = () => q('[data-testid="naira-aprobar"]')
const rechazar = () => q('[data-testid="naira-rechazar"]')

function hrefDeVolver(): string | null {
  const v = q('[data-testid="volver-a-la-lista"]')
  return v?.getAttribute('href') ?? v?.querySelector('a')?.getAttribute('href') ?? null
}

function antes(a: Element | null, b: Element | null): boolean {
  if (a === null || b === null) return false
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

beforeEach(() => {
  leer.mockReset()
  decidir.mockReset()
  leer.mockImplementation(async () => ok(DETALLE_A))
  decidir.mockImplementation(async () => ({ kind: 'no_disponible' }))
  permisos.conjunto = new Set(['action-view', 'signal-view', 'action-approve-internal'])
  visible = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('PropuestaClient', () => {
  it('[N13:fixture-es-contrato] los detalles y el resultado de la decisión pasan el esquema estricto', () => {
    expect(() => ESTRICTO.parse(DETALLE_A)).not.toThrow()
    expect(() => ESTRICTO.parse(DETALLE_B)).not.toThrow()
    expect(() => ESTRICTO_D.parse(DECIDIDA)).not.toThrow()
    const { huella, ...resto } = DETALLE_A
    expect(() => ESTRICTO.parse({ ...resto, huellaa: huella })).toThrow()
  })

  it('[N13:control-positivo] el ok pinta la ficha con su vuelta, la consecuencia, la huella y la decisión', async () => {
    await montar()
    expect(q('[data-naira-vista="propuesta"][data-naira-estado="ok"]')).not.toBeNull()
    expect(q('[data-testid="volver-a-la-lista"]')?.textContent).toContain('Volver a aprobaciones')
    const h1 = contenedor.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0]?.textContent).toBe('Propuesta de Naira')
    expect(contenedor.textContent).toContain('Por decidir')
    expect(q('[data-naira-consecuencia]')?.textContent).toBe('CONSECUENCIA-A (ejemplo)')
    expect(q(`[data-naira-huella="${HUELLA_A}"]`)).not.toBeNull()
    expect(aprobar()).not.toBeNull()
    expect(rechazar()).not.toBeNull()
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1', 'PROP-1')
  })

  it('[N13:consecuencia-primero] consecuencia, cortes, meta, decisión y razonamiento en ese orden', async () => {
    await montar()
    const consecuencia = q('[data-naira-consecuencia]')
    const cortes = q('[data-naira-cortes-de-la-propuesta]')
    const meta = q('[data-naira-meta-de-la-propuesta]')
    const decision = q('[data-naira-decision]')
    const disparador = q('[data-naira-disparador-del-razonamiento]')
    expect(antes(consecuencia, cortes)).toBe(true)
    expect(antes(cortes, meta)).toBe(true)
    expect(antes(meta, decision)).toBe(true)
    expect(antes(decision, disparador)).toBe(true)
    expect(consecuencia?.closest('[data-categoria="recomendacion"][data-seccion="ACTION"]')).not.toBeNull()
    expect(meta?.textContent).toBe('Rol: Cartera · Crear una tarea · Interna · se puede deshacer')
  })

  it('[N13:asof-de-la-consecuencia] el corte de la consecuencia va justo debajo, fuera del desplegable', async () => {
    await montar()
    const consecuencia = q('[data-naira-consecuencia]')
    const fila = consecuencia?.nextElementSibling
    expect(fila?.matches('[data-naira-cortes-de-la-propuesta]')).toBe(true)
    expect(fila?.closest('[data-naira-razonamiento]')).toBeNull()
    expect(fila?.textContent).toContain('Datos de esta propuesta:')
    const marcas = Array.from(fila?.querySelectorAll('[data-naira-asof]') ?? []).map((m) => m.getAttribute('data-naira-asof'))
    expect(marcas).toEqual([CORTE_1, CORTE_2])
    expect(fila?.querySelector('[data-naira-enlace]')).not.toBeNull()
    expect(fila?.querySelector('a[href="/panel/inmobiliaria/pagos/recaudo"]')).not.toBeNull()
  })

  describe('en otra zona horaria', () => {
    let zonaPrevia: string | undefined
    beforeAll(() => {
      zonaPrevia = process.env.TZ
      process.env.TZ = 'Asia/Tokyo'
    })
    afterAll(() => {
      if (zonaPrevia === undefined) delete process.env.TZ
      else process.env.TZ = zonaPrevia
    })

    it('[N13:asof-bogota] con el proceso en Tokio el corte de la consecuencia se escribe en hora de Colombia', async () => {
      // Control: la zona del proceso cambió de verdad (en Bogotá esto daría 2).
      expect(new Date(CORTE_1).getDate()).toBe(3)
      await montar()
      const primera = q('[data-naira-cortes-de-la-propuesta] [data-naira-asof]')
      expect(primera?.getAttribute('data-naira-asof')).toBe(CORTE_1)
      expect(primera?.textContent).toContain('2 de ene')
      expect(primera?.textContent).not.toContain('3 de ene')
    })
  })

  it('[N13:detalle-solo-al-abrir] el detalle se pide al abrir y con «Actualizar propuesta»; nada más lo relee', async () => {
    await montar()
    expect(leer).toHaveBeenCalledTimes(1)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    await montar('PROP-1')
    expect(leer).toHaveBeenCalledTimes(1)
    const actualizar = q('[data-testid="naira-actualizar-propuesta"]')
    expect(actualizar?.textContent).toBe('Actualizar propuesta')
    await clic(actualizar)
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('[N13:huella-vista] se decide con la huella en pantalla; un cambio solo se resuelve cargando la versión actual', async () => {
    leer.mockImplementationOnce(async () => ok(DETALLE_A)).mockImplementationOnce(async () => ok(DETALLE_B))
    await montar()
    const enPantalla = q('[data-naira-huella]')?.getAttribute('data-naira-huella')
    expect(enPantalla).toBe(HUELLA_A)
    decidir.mockImplementationOnce(async () => ({ kind: 'conflicto', razon: 'huella_distinta' }))
    await clic(aprobar())
    expect(decidir).toHaveBeenCalledTimes(1)
    expect(decidir.mock.calls[0]?.[2]).toEqual({ decision: 'aprobar', huellaVista: enPantalla })
    expect(contenedor.textContent).toContain('La situación cambió desde que abriste esta propuesta.')
    expect(aprobar()).toBeNull()
    expect(rechazar()).toBeNull()
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    expect(decidir).toHaveBeenCalledTimes(1)

    await clic(q('[data-testid="naira-cargar-version-actual"]'))
    expect(leer).toHaveBeenCalledTimes(2)
    expect(leer).toHaveBeenLastCalledWith('AGY-1', 'PROP-1')
    expect(contenedor.textContent).toContain('CONSECUENCIA-B (ejemplo)')
    expect(contenedor.textContent).not.toContain('CONSECUENCIA-A')
    expect(q('[data-naira-huella]')?.getAttribute('data-naira-huella')).toBe(HUELLA_B)
    expect(contenedor.textContent).not.toContain('La situación cambió')
    expect(aprobar()).not.toBeNull()
    expect(decidir).toHaveBeenCalledTimes(1)

    decidir.mockImplementationOnce(async () => ({ kind: 'ok', data: DECIDIDA, origen: 'agente' }))
    await clic(aprobar())
    expect(decidir).toHaveBeenCalledTimes(2)
    expect(decidir.mock.calls[1]?.[2]).toEqual({ decision: 'aprobar', huellaVista: HUELLA_B })
    expect(contenedor.querySelector('header')?.textContent).toContain('Aprobada')
    const estado = q('p[role="status"]')
    expect(estado?.textContent).toContain('Registramos tu aprobación.')
    expect(document.activeElement).toBe(estado)
  })

  it('[N13:403-sin-residuo] abrir otra propuesta que da 403 no deja nada de la anterior', async () => {
    leer.mockImplementation(async (_agencia: string, id: string) => (id === 'PROP-2' ? { kind: 'sin_permiso' } : ok(DETALLE_A)))
    await montar('PROP-1')
    expect(contenedor.textContent).toContain('CONSECUENCIA-A (ejemplo)')
    await montar('PROP-2')
    const cartel = q('[data-testid="naira-sin-permiso"]')
    expect(cartel).not.toBeNull()
    const volver = Array.from(cartel?.querySelectorAll('a') ?? []).find((a) => a.getAttribute('href') === RUTA_DE_APROBACIONES)
    expect(volver?.textContent).toContain('Volver a aprobaciones')
    const html = contenedor.innerHTML
    expect(html).not.toContain('CONSECUENCIA-A')
    expect(html).not.toContain(HUELLA_A)
    expect(html).not.toContain('4711')
    expect(q('[data-naira-decision]')).toBeNull()
    expect(q('[data-naira-numero]')).toBeNull()
    expect(q('[data-naira-asof]')).toBeNull()
  })

  it('[N13:no-encontrado] una propuesta que no existe lo dice, con vuelta a la pestaña', async () => {
    leer.mockImplementation(async () => ({ kind: 'no_encontrado' }))
    await montar()
    const cartel = q('[data-testid="naira-no-encontrado"]')
    expect(cartel).not.toBeNull()
    expect(cartel?.querySelector(`a[href="${RUTA_DE_APROBACIONES}"]`)).not.toBeNull()
  })

  it('[N13:ficha-con-vuelta] en el ok hay una vuelta visible a la pestaña Aprobaciones', async () => {
    await montar()
    const volver = q('[data-testid="volver-a-la-lista"]')
    expect(volver).not.toBeNull()
    expect(hrefDeVolver()).toBe(RUTA_DE_APROBACIONES)
    expect(volver?.textContent).toContain('Volver a aprobaciones')
  })

  it('[N13:puede-decidir] sin puedeDecidir no hay botones, y la consecuencia con sus cortes sigue', async () => {
    leer.mockImplementation(async () => ok(detalleCon('CONSECUENCIA-A (ejemplo)', HUELLA_A, { puedeDecidir: false })))
    await montar()
    expect(aprobar()).toBeNull()
    expect(rechazar()).toBeNull()
    expect(contenedor.textContent).toContain('Tu rol no puede aprobar esta acción.')
    expect(q('[data-naira-consecuencia]')?.textContent).toBe('CONSECUENCIA-A (ejemplo)')
    expect(q('[data-naira-cortes-de-la-propuesta] [data-naira-asof]')).not.toBeNull()
  })

  it('[N13:simulado-visible] con datos de ejemplo se marca, los cortes son de ejemplo y no se decide', async () => {
    leer.mockImplementation(async () => ok(DETALLE_A, 'ejemplo'))
    await montar()
    expect(q('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(q('[data-sample="true"]')).not.toBeNull()
    expect(q('[data-naira-cortes-de-la-propuesta]')?.textContent).toContain('DATO DE EJEMPLO')
    expect((aprobar() as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((rechazar() as HTMLButtonElement | null)?.disabled).toBe(true)
    expect(contenedor.textContent).toContain('Datos de ejemplo: no se puede decidir.')
    await act(async () => {
      ;(aprobar() as HTMLButtonElement | null)?.click()
    })
    expect(decidir).not.toHaveBeenCalled()
  })

  it('[N13:sin-href-del-agente] los enlaces de la señal dependen de signal-view y salen del registro', async () => {
    await montar()
    await clic(q('[data-naira-disparador-del-razonamiento]'))
    const senal = Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === 'Ver la señal')
    const explicacion = Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === 'Ver la explicación en la señal')
    expect(senal?.getAttribute('href')).toBe(rutaDeLaSenal('PROMO-1'))
    expect(explicacion?.getAttribute('href')).toBe(rutaDeLaSenal('PROMO-1'))
    for (const a of Array.from(contenedor.querySelectorAll('a[href]'))) {
      expect(a.getAttribute('href')?.startsWith('/panel/inmobiliaria/'), a.getAttribute('href') ?? '').toBe(true)
    }

    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['action-view', 'action-approve-internal'])
    await montar()
    await clic(q('[data-naira-disparador-del-razonamiento]'))
    expect(contenedor.textContent).not.toContain('Ver la señal')
    expect(contenedor.textContent).not.toContain('Ver la explicación en la señal')

    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['action-view', 'signal-view', 'action-approve-internal'])
    const hostil = detalleCon('CONSECUENCIA-A (ejemplo)', HUELLA_A, {
      razonamiento: {
        ...DETALLE_A.razonamiento,
        senal: { ...DETALLE_A.razonamiento.senal, promocionId: '../x' },
        investigacion: { kind: 'referencia', id: '../x' },
      },
    })
    leer.mockImplementation(async () => ok(hostil))
    await montar()
    await clic(q('[data-naira-disparador-del-razonamiento]'))
    const senalHostil = Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === 'Ver la señal')
    expect(senalHostil?.getAttribute('href')).toBe(rutaDeLaSenal('../x'))
    for (const a of Array.from(contenedor.querySelectorAll('a[href]'))) {
      expect(a.getAttribute('href')?.startsWith('/panel/inmobiliaria/'), a.getAttribute('href') ?? '').toBe(true)
    }
  })

  it('[N13:b5-sin-persona] en el ok y tras decidir, nada dice quién decidió', async () => {
    await montar()
    const revisar = (html: string, texto: string) => {
      for (const id of USER_IDS_DE_EJEMPLO) expect(html).not.toContain(id)
      expect(html).not.toContain('role:')
      expect(html).not.toContain('DEC-SECRETO-9')
      expect(/aprobad[oa] por|rechazad[oa] por/i.test(texto)).toBe(false)
    }
    revisar(contenedor.innerHTML, contenedor.textContent ?? '')
    decidir.mockImplementationOnce(async () => ({ kind: 'ok', data: DECIDIDA, origen: 'agente' }))
    await clic(aprobar())
    revisar(contenedor.innerHTML, contenedor.textContent ?? '')
  })
})
