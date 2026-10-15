/**
 * AprobacionesClient.test.tsx — la pestaña Aprobaciones de Naira (13-05, Tarea 4).
 *
 * Qué prueba: el ok pinta las propuestas «Por decidir» y «Recientes» en el orden del servidor, la consecuencia solo con sus
 * cortes al lado (E13-6 de punta a punta) y las tareas como lectura secundaria; nunca se pide el detalle de una propuesta
 * (FG13-14); un 403 al volver a la pestaña no deja nada (FG13-1); las tareas sin `task-view` no se piden y con un 403
 * desaparecen sin rastro (UI-SPEC §8.2); cancelar y la bitácora dependen de su acción; el vacío no miente (P13); los
 * conteos de Naira no se escriben (U5); con datos de ejemplo se marca y no se cancela; los enlaces salen del registro; y
 * nada dice quién decidió (B-5).
 *
 * Arnés (molde de 13-04): createRoot + act, stub de i18n real (es.json), `next/link` → `<a data-prefetch>`, `useAuth` con
 * AGY-1, el cliente mockeado en sus cuatro funciones de esta pestaña, permisos por conjunto (`vi.hoisted`), popover plano y
 * `document.visibilityState` controlado. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { leer, leerT, leerDetalle, cancelar, permisos } = vi.hoisted(() => ({
  leer: vi.fn(),
  leerT: vi.fn(),
  leerDetalle: vi.fn(async () => ({ kind: 'no_disponible' })),
  cancelar: vi.fn(async () => ({ kind: 'no_disponible' })),
  permisos: { conjunto: new Set<string>() },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...resto }: React.PropsWithChildren<{ href: string; prefetch?: boolean } & Record<string, unknown>>) =>
    React.createElement('a', { href, 'data-prefetch': String(prefetch), ...resto }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/aprobaciones',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerPropuestas: leer,
  leerTareas: leerT,
  leerPropuesta: leerDetalle,
  cancelarTarea: cancelar,
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

import {
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaActionSummary,
  type NairaActionsList,
  type NairaTask,
  type NairaTasksList,
} from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { RUTA_DE_NAIRA, rutaDeLaPropuesta, rutaDelLoop } from '@/lib/nav/rutas-de-naira'

import { AprobacionesClient } from './AprobacionesClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.lista']
const ESTRICTO_T = RESPUESTA_ESTRICTA_POR_ENDPOINT['tareas.lista']
const BASE = EJEMPLOS_DE_NAIRA['acciones.lista']
const BASE_T = EJEMPLOS_DE_NAIRA['tareas.lista']
const CORTE = '2000-01-01T11:15:00.000Z'

function accionCon(over: Partial<NairaActionSummary>): NairaActionSummary {
  return { ...BASE.acciones[0], ...over }
}

function listaCon(acciones: NairaActionSummary[], ocultasPorRol: number): NairaActionsList {
  return { ...BASE, desde: '2000-01-01T00:00:00.000Z', acciones, ocultasPorRol }
}

function tareaCon(over: Partial<NairaTask> = {}): NairaTask {
  return {
    ...BASE_T.tareas[0],
    tareaId: 'TAREA-TOKEN-1',
    loopId: 'LOOP-1',
    owner: 'role:prospectos',
    detectorId: 'prospectos.leads_sin_contacto',
    estado: 'abierta',
    ...over,
  }
}

const P3 = accionCon({
  proposalId: 'PROP-TOKEN-3',
  estado: 'pendiente',
  consecuencia: { kind: 'reproducible', texto: 'CONSECUENCIA-CON-CIFRA 98765' },
  asOfs: [],
})
const P1 = accionCon({ proposalId: 'PROP-TOKEN-1', estado: 'aprobada', asOfs: [] })
const P2 = accionCon({
  proposalId: 'PROP-TOKEN-2',
  estado: 'vencible',
  consecuencia: { kind: 'reproducible', texto: 'CONSECUENCIA-VISIBLE 2468' },
  asOfs: [CORTE],
})

const LISTA = listaCon([P3, P1, P2], 8317)
const TAREAS: NairaTasksList = { ...BASE_T, tareas: [tareaCon()], ocultasPorRol: 9241 }
const VACIA = listaCon([], 0)
const VACIA_CON_OCULTAS = listaCon([], 8317)
const SOLO_RECIENTE = listaCon([P1], 0)
const SIN_IDS = listaCon([accionCon({ proposalId: '', estado: 'pendiente', asOfs: [] })], 0)
const TAREAS_SIN_LOOP: NairaTasksList = { ...BASE_T, tareas: [tareaCon({ loopId: '' })], ocultasPorRol: 0 }
const FIXTURES = [LISTA, VACIA, VACIA_CON_OCULTAS, SOLO_RECIENTE, SIN_IDS]
const FIXTURES_T = [TAREAS, TAREAS_SIN_LOOP]

let contenedor: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })

async function montar() {
  act(() => {
    root.render(<AprobacionesClient />)
  })
  await asentar()
}

async function volverAlFoco() {
  visible = 'visible'
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await asentar()
}

function responder(lista: NairaActionsList, origen: 'agente' | 'ejemplo' = 'agente') {
  leer.mockImplementation(async () => ({ kind: 'ok', data: ESTRICTO.parse(lista), origen }))
}

function responderTareas(tareas: NairaTasksList, origen: 'agente' | 'ejemplo' = 'agente') {
  leerT.mockImplementation(async () => ({ kind: 'ok', data: ESTRICTO_T.parse(tareas), origen }))
}

function enlaces(texto: string): HTMLAnchorElement[] {
  return Array.from(contenedor.querySelectorAll('a')).filter((a) => (a.textContent ?? '').includes(texto))
}

const botonCancelar = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="naira-cancelar-tarea"]')

beforeEach(() => {
  leer.mockReset()
  leerT.mockReset()
  leerDetalle.mockClear()
  cancelar.mockClear()
  leer.mockImplementation(async () => ({ kind: 'no_disponible' }))
  leerT.mockImplementation(async () => ({ kind: 'no_disponible' }))
  permisos.conjunto = new Set(['action-view', 'task-view', 'task-cancel', 'open-loops-view'])
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

describe('AprobacionesClient', () => {
  it('[N13:fixture-es-contrato] cada fixture del archivo pasa el esquema estricto', () => {
    for (const f of FIXTURES) expect(() => ESTRICTO.parse(f)).not.toThrow()
    for (const f of FIXTURES_T) expect(() => ESTRICTO_T.parse(f)).not.toThrow()
  })

  it('[N13:control-positivo] el ok pinta los grupos en el orden del servidor, la consecuencia con su corte y las tareas', async () => {
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.querySelector('[data-naira-vista="aprobaciones"][data-naira-estado="ok"]')).not.toBeNull()
    const h1 = contenedor.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0]?.textContent).toBe('Aprobaciones')
    expect(contenedor.textContent).toContain('Lo que Naira propone hacer. Nada se ejecuta sin que alguien con permiso lo apruebe.')
    const porDecidir = contenedor.querySelector('[data-naira-grupo="por_decidir"]')
    const hrefs = Array.from(porDecidir?.querySelectorAll('article a[href]') ?? []).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([rutaDeLaPropuesta('PROP-TOKEN-3'), rutaDeLaPropuesta('PROP-TOKEN-2')])
    const recientes = contenedor.querySelector('[data-naira-grupo="recientes"]')
    expect(Array.from(recientes?.querySelectorAll('article a[href]') ?? []).map((a) => a.getAttribute('href'))).toEqual([
      rutaDeLaPropuesta('PROP-TOKEN-1'),
    ])
    const tarjeta2 = porDecidir?.querySelectorAll('article')[1]
    const consecuencia = tarjeta2?.querySelector('[data-naira-consecuencia-del-listado]')
    expect(consecuencia?.textContent).toBe('CONSECUENCIA-VISIBLE 2468')
    expect(consecuencia?.nextElementSibling?.querySelector(`[data-naira-asof="${CORTE}"]`)).not.toBeNull()
    const seccion = contenedor.querySelector('[data-naira-tareas]')
    expect(seccion?.querySelector('h2')?.textContent).toBe('Tareas creadas por Naira')
    const fila = seccion?.querySelector('[data-naira-tarea="abierta"]')
    expect(fila?.textContent).toContain('Rol: Prospectos')
    expect(fila?.querySelector(`a[href="${rutaDelLoop('LOOP-1')}"]`)?.textContent).toBe('Ver la bitácora')
    expect(fila?.textContent).toContain('Cancelar tarea')
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
    expect(leerT).toHaveBeenCalledTimes(1)
    expect(leerT).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:detalle-solo-al-abrir] la pestaña nunca pide el detalle de una propuesta', async () => {
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    await volverAlFoco()
    expect(leer).toHaveBeenCalledTimes(2)
    const revisar = enlaces('Revisar propuesta')
    expect(revisar.length).toBe(3)
    act(() => {
      for (const a of revisar) {
        for (const tipo of ['mouseover', 'mouseenter', 'focus', 'focusin']) a.dispatchEvent(new Event(tipo, { bubbles: true }))
        a.focus()
      }
    })
    await asentar()
    expect(leerDetalle).toHaveBeenCalledTimes(0)
    for (const a of revisar) expect(a.getAttribute('data-prefetch')).toBe('false')
  })

  it('[N13:listado-sin-consecuencia] la consecuencia sin un corte válido no aparece', async () => {
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.innerHTML).not.toContain('98765')
    expect(contenedor.innerHTML).not.toContain('CONSECUENCIA-CON-CIFRA')
    expect(contenedor.innerHTML).not.toContain(BASE.acciones[0]?.consecuencia.kind === 'reproducible' ? BASE.acciones[0].consecuencia.texto : '∅')
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al volver a la pestaña no deja nada', async () => {
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.innerHTML).toContain('PROP-TOKEN-3')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await volverAlFoco()
    const cartel = contenedor.querySelector('[data-testid="naira-sin-permiso"]')
    expect(cartel).not.toBeNull()
    const volver = Array.from(cartel?.querySelectorAll('a') ?? []).find((a) => a.getAttribute('href') === '/panel/inmobiliaria')
    expect(volver?.textContent).toContain('Ir al inicio del panel')
    expect(contenedor.innerHTML).not.toContain('PROP-TOKEN')
    expect(contenedor.innerHTML).not.toContain('TAREA-TOKEN-1')
    expect(contenedor.textContent).not.toContain('Tareas creadas por Naira')
    expect(contenedor.querySelector('article')).toBeNull()
    expect(contenedor.querySelector('[data-naira-tareas]')).toBeNull()
    expect(contenedor.querySelector('[data-naira-numero]')).toBeNull()
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('[N13:tareas-403-sin-rastro] si las tareas fallan, la sección desaparece sin rastro y la lista sigue', async () => {
    for (const fallo of [{ kind: 'sin_permiso' }, { kind: 'no_disponible' }]) {
      act(() => root.unmount())
      root = createRoot(contenedor)
      leerT.mockReset()
      responder(LISTA)
      responderTareas(TAREAS)
      await montar()
      expect(contenedor.querySelector('[data-naira-tareas]')).not.toBeNull()
      leerT.mockImplementation(async () => fallo)
      await volverAlFoco()
      expect(contenedor.querySelector('[data-naira-tareas]'), fallo.kind).toBeNull()
      expect(contenedor.textContent).not.toContain('Tareas creadas por Naira')
      expect(contenedor.innerHTML).not.toContain('TAREA-TOKEN-1')
      expect(contenedor.textContent).not.toContain('Naira no tiene tareas abiertas.')
      expect(contenedor.querySelectorAll('article').length, fallo.kind).toBe(3)
    }
  })

  it('[N13:tareas-sin-accion-sin-red] sin task-view las tareas no se piden y la lista está', async () => {
    permisos.conjunto = new Set(['action-view', 'task-cancel', 'open-loops-view'])
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    await volverAlFoco()
    expect(leerT).not.toHaveBeenCalled()
    expect(contenedor.querySelector('[data-naira-tareas]')).toBeNull()
    expect(contenedor.querySelectorAll('article')).toHaveLength(3)
  })

  it('[N13:cancelar-segun-permiso] sin task-cancel no hay «Cancelar tarea»; con él, sí', async () => {
    permisos.conjunto = new Set(['action-view', 'task-view', 'open-loops-view'])
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.querySelector('[data-naira-tarea]')).not.toBeNull()
    expect(botonCancelar()).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['action-view', 'task-view', 'task-cancel', 'open-loops-view'])
    await montar()
    expect(botonCancelar()).not.toBeNull()
  })

  it('[N13:bitacora-segun-permiso] sin open-loops-view no hay «Ver la bitácora»; con él, al loop del registro', async () => {
    permisos.conjunto = new Set(['action-view', 'task-view', 'task-cancel'])
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.querySelector('[data-naira-tarea]')).not.toBeNull()
    expect(enlaces('Ver la bitácora')).toHaveLength(0)
    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['action-view', 'task-view', 'task-cancel', 'open-loops-view'])
    await montar()
    const bitacora = enlaces('Ver la bitácora')
    expect(bitacora).toHaveLength(1)
    expect(bitacora[0]?.getAttribute('href')).toBe(rutaDelLoop('LOOP-1'))
  })

  it('[N13:vacio-no-miente] el vacío solo dice que no hay nada si el rol lo ve todo', async () => {
    responder(VACIA)
    await montar()
    const vacio = contenedor.querySelector('[data-testid="naira-aprobaciones-vacio"]')
    expect(vacio?.textContent).toContain('No hay nada por decidir')
    expect(vacio?.textContent).toContain(
      'Cuando Naira proponga algo, lo verás aquí; al abrirla verás su consecuencia antes de que se ejecute.',
    )

    act(() => root.unmount())
    root = createRoot(contenedor)
    responder(VACIA_CON_OCULTAS)
    await montar()
    expect(contenedor.querySelector('[data-testid="naira-aprobaciones-vacio"]')).toBeNull()
    expect(contenedor.textContent).not.toContain('No hay nada por decidir')
    expect(contenedor.textContent).toContain('Hay elementos que tu rol no puede ver.')

    act(() => root.unmount())
    root = createRoot(contenedor)
    responder(SOLO_RECIENTE)
    await montar()
    expect(contenedor.querySelector('[data-naira-grupo="por_decidir"] [data-testid="naira-aprobaciones-vacio"]')).not.toBeNull()
    expect(contenedor.querySelectorAll('[data-naira-grupo="recientes"] article')).toHaveLength(1)
  })

  it('[N13:conteos-sin-numeral] los elementos ocultos se dicen sin número', async () => {
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.innerHTML).not.toContain('8317')
    expect(contenedor.innerHTML).not.toContain('9241')
    expect(contenedor.querySelector('p[role="status"][data-naira-ocultas]')?.textContent).toBe(
      'Hay elementos que tu rol no puede ver.',
    )
    expect(contenedor.querySelector('[data-naira-tareas]')?.textContent).toContain('Hay elementos que tu rol no puede ver.')
  })

  it('[N13:asof-pegado] todo número lleva su corte en su cifra; en esta vista no hay ninguno', async () => {
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    const numeros = Array.from(contenedor.querySelectorAll('[data-naira-numero]'))
    for (const n of numeros) expect(n.closest('[data-naira-cifra]')?.querySelector('[data-naira-asof]')).not.toBeNull()
    expect(numeros).toHaveLength(0)
  })

  it('[N13:simulado-visible] con datos de ejemplo se marca y no se cancela', async () => {
    responder(LISTA, 'ejemplo')
    responderTareas(TAREAS, 'ejemplo')
    await montar()
    expect(contenedor.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-sample="true"]')).not.toBeNull()
    const boton = botonCancelar()
    expect(boton?.disabled).toBe(true)
    expect(contenedor.textContent).toContain('Datos de ejemplo: no se puede cancelar.')
    await act(async () => {
      boton?.click()
    })
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(cancelar).not.toHaveBeenCalled()
  })

  it('[N13:sin-href-del-agente] sin id no hay enlace, y todo enlace sale del registro de Naira', async () => {
    responder(SIN_IDS)
    responderTareas(TAREAS_SIN_LOOP)
    await montar()
    expect(contenedor.querySelector('article')).not.toBeNull()
    expect(enlaces('Revisar propuesta')).toHaveLength(0)
    expect(contenedor.querySelector('[data-naira-tarea]')).not.toBeNull()
    expect(enlaces('Ver la bitácora')).toHaveLength(0)

    act(() => root.unmount())
    root = createRoot(contenedor)
    responder(LISTA)
    responderTareas(TAREAS)
    await montar()
    const todos = Array.from(contenedor.querySelectorAll('a[href]'))
    expect(todos.length).toBeGreaterThan(0)
    for (const a of todos) expect(a.getAttribute('href')?.startsWith(RUTA_DE_NAIRA), a.getAttribute('href') ?? '').toBe(true)
  })

  it('[N13:apagada] apagada lo dice, sin propuestas ni tareas', async () => {
    leer.mockImplementation(async () => ({ kind: 'apagada' }))
    responderTareas(TAREAS)
    await montar()
    expect(contenedor.querySelector('[data-testid="naira-apagada"]')).not.toBeNull()
    expect(contenedor.querySelector('article')).toBeNull()
    expect(contenedor.querySelector('[data-naira-tareas]')).toBeNull()
  })

  it('[N13:b5-sin-persona] nada dice quién decidió ni quién canceló', async () => {
    for (const origen of ['agente', 'ejemplo'] as const) {
      act(() => root.unmount())
      root = createRoot(contenedor)
      responder(LISTA, origen)
      responderTareas(TAREAS, origen)
      await montar()
      const html = contenedor.innerHTML
      for (const id of USER_IDS_DE_EJEMPLO) expect(html, origen).not.toContain(id)
      expect(html, origen).not.toContain('role:')
      expect(/aprobad[oa] por|rechazad[oa] por|cancelad[oa] por/i.test(contenedor.textContent ?? ''), origen).toBe(false)
    }
  })
})
