/**
 * SeguimientoClient.test.tsx — la pestaña Seguimiento de Naira (13-04, Tarea 4).
 *
 * Qué prueba (con el hook real y el cliente simulado): el ok pinta la lista con sus enlaces del registro y el voto; tras un
 * ok, un 403 que llega al VOLVER a la pestaña (el disparador real) no deja ni un nombre, enlace, fecha ni botón (FG13-1);
 * ningún número sin corte y ningún conteo de Naira; el vacío no miente cuando hay ocultos; los datos de ejemplo se ven y
 * no votan; votar y enlazar la señal dependen de su acción; un id vacío no arma enlace; apagada se dice; sin personas.
 *
 * Arnés (molde de BriefingClient.test.tsx de 13-03): createRoot + act, stub de i18n real, `next/link` → `<a>`, `useAuth`
 * con AGY-1, `leerSeguimiento`/`votarSenal` simulados sobre el módulo real, permisos por conjunto y la visibilidad del
 * documento controlada. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { leer, votar, permisos } = vi.hoisted(() => ({
  leer: vi.fn(),
  votar: vi.fn(() => new Promise<unknown>(() => undefined)),
  permisos: { conjunto: new Set<string>() },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/seguimiento',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerSeguimiento: leer,
  votarSenal: votar,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string, a: string) => m === 'naira' && permisos.conjunto.has(a),
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaOpenLoop,
  type NairaOpenLoopsList,
} from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { RUTA_DE_NAIRA, rutaDeLaSenal, rutaDelLoop } from '@/lib/nav/rutas-de-naira'

import { SeguimientoClient } from './SeguimientoClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.lista']
const BASE = EJEMPLOS_DE_NAIRA['seguimiento.lista']

function loopCon(over: Partial<NairaOpenLoop> = {}): NairaOpenLoop {
  return {
    ...BASE.loops[0],
    loopId: 'LOOP-TOKEN-200',
    promocionId: 'PROMO-1',
    metricId: 'cartera.morosidad_rate',
    ciclos: 4711,
    candidato: { kind: 'en_curso', desenlace: 'resuelto_por_dato', confirmaciones: 8317, desde: '2000-01-02' },
    ...over,
  }
}

function listaCon(loops: NairaOpenLoop[], ocultosPorRol: number): NairaOpenLoopsList {
  return { ...BASE, loops, ocultosPorRol }
}

const LISTA = listaCon([loopCon()], 6143)
const VACIA = listaCon([], 0)
const VACIA_CON_OCULTOS = listaCon([], 6143)
const SIN_IDS = listaCon([loopCon({ loopId: '', promocionId: '' })], 0)
const FIXTURES = [LISTA, VACIA, VACIA_CON_OCULTOS, SIN_IDS]

let contenedor: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })

async function montar() {
  act(() => {
    root.render(<SeguimientoClient />)
  })
  await asentar()
}

function responder(lista: NairaOpenLoopsList, origen: 'agente' | 'ejemplo' = 'agente') {
  leer.mockImplementation(async () => ({ kind: 'ok', data: ESTRICTO.parse(lista), origen }))
}

function enlace(texto: string): HTMLAnchorElement | null {
  return Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === texto) ?? null
}

beforeEach(() => {
  leer.mockReset()
  votar.mockClear()
  permisos.conjunto = new Set(['open-loops-view', 'signal-view', 'signal-feedback'])
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

describe('SeguimientoClient', () => {
  it('[N13:fixture-es-contrato] cada fixture del archivo pasa el esquema estricto de la lista', () => {
    for (const f of FIXTURES) expect(() => ESTRICTO.parse(f)).not.toThrow()
  })

  it('[N13:control-positivo] el ok pinta la lista, sus enlaces del registro y el voto', async () => {
    responder(LISTA)
    await montar()
    expect(contenedor.querySelector('[data-naira-vista="seguimiento"][data-naira-estado="ok"]')).not.toBeNull()
    const h1 = contenedor.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0]?.textContent).toBe('Seguimiento')
    expect(contenedor.textContent).toContain('Lo que Naira sigue de cerca hasta que se resuelva.')
    const fila = contenedor.querySelector('article[data-naira-loop]')
    expect(fila?.textContent).toContain('Índice de morosidad')
    expect(enlace('Ver la bitácora')?.getAttribute('href')).toBe(rutaDelLoop('LOOP-TOKEN-200'))
    expect(enlace('Ver la señal')?.getAttribute('href')).toBe(rutaDeLaSenal('PROMO-1'))
    expect(contenedor.querySelector('[data-naira-voto]')).not.toBeNull()
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al volver a la pestaña no deja nada de la lista', async () => {
    responder(LISTA)
    await montar()
    expect(contenedor.textContent).toContain('Índice de morosidad')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    visible = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await asentar()
    const cartel = contenedor.querySelector('[data-testid="naira-sin-permiso"]')
    expect(cartel).not.toBeNull()
    const volver = Array.from(cartel?.querySelectorAll('a') ?? []).find((a) => a.getAttribute('href') === '/panel/inmobiliaria')
    expect(volver?.textContent).toContain('Ir al inicio del panel')
    expect(contenedor.textContent).not.toContain('Índice de morosidad')
    expect(contenedor.innerHTML).not.toContain('LOOP-TOKEN-200')
    expect(contenedor.innerHTML).not.toContain('PROMO-1')
    expect(contenedor.querySelector('article')).toBeNull()
    expect(contenedor.querySelector('[data-naira-voto]')).toBeNull()
    expect(contenedor.querySelector('[data-naira-numero]')).toBeNull()
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('[N13:asof-pegado] todo número lleva su corte en su cifra; en esta vista no hay ninguno', async () => {
    responder(LISTA)
    await montar()
    const numeros = Array.from(contenedor.querySelectorAll('[data-naira-numero]'))
    for (const n of numeros) expect(n.closest('[data-naira-cifra]')?.querySelector('[data-naira-asof]')).not.toBeNull()
    expect(numeros).toHaveLength(0)
  })

  it('[N13:conteos-sin-numeral] ciclos, confirmaciones y ocultos no se escriben; los ocultos se dicen en palabras', async () => {
    responder(LISTA)
    await montar()
    for (const n of ['4711', '8317', '6143']) expect(contenedor.innerHTML).not.toContain(n)
    const ocultos = contenedor.querySelector('p[role="status"][data-naira-ocultos]')
    expect(ocultos?.textContent).toBe('Hay elementos que tu rol no puede ver.')
  })

  it('[N13:vacio-no-miente] sin loops ni ocultos se dice el vacío; con ocultos, solo la frase de ocultos', async () => {
    responder(VACIA)
    await montar()
    const vacio = contenedor.querySelector('[data-testid="naira-seguimiento-vacio"]')
    expect(vacio?.textContent).toContain('Naira no está siguiendo nada en este momento')
    expect(vacio?.textContent).toContain('Cuando una señal necesite seguimiento, aparecerá aquí con su próxima revisión.')
    act(() => root.unmount())
    root = createRoot(contenedor)
    responder(VACIA_CON_OCULTOS)
    await montar()
    expect(contenedor.querySelector('[data-testid="naira-seguimiento-vacio"]')).toBeNull()
    expect(contenedor.textContent).not.toContain('Naira no está siguiendo nada en este momento')
    expect(contenedor.querySelector('[data-naira-ocultos]')?.textContent).toBe('Hay elementos que tu rol no puede ver.')
  })

  it('[N13:simulado-visible] con datos de ejemplo se avisa, la revisión lo dice y el voto no sale', async () => {
    responder(LISTA, 'ejemplo')
    await montar()
    expect(contenedor.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-sample="true"]')).not.toBeNull()
    expect(contenedor.textContent).toContain('Última revisión: DATO DE EJEMPLO')
    const botones = Array.from(contenedor.querySelectorAll('[data-naira-voto] button')) as HTMLButtonElement[]
    expect(botones).toHaveLength(3)
    for (const b of botones) expect(b.disabled).toBe(true)
    const util = botones.find((b) => (b.textContent ?? '').includes('Útil'))
    await act(async () => {
      util?.click()
    })
    expect(votar).not.toHaveBeenCalled()
  })

  it('[N13:voto-segun-permiso] sin signal-feedback no hay voto; con él, sí', async () => {
    permisos.conjunto = new Set(['open-loops-view', 'signal-view'])
    responder(LISTA)
    await montar()
    expect(contenedor.querySelector('article[data-naira-loop]')).not.toBeNull()
    expect(contenedor.querySelector('[data-naira-voto]')).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['open-loops-view', 'signal-view', 'signal-feedback'])
    await montar()
    expect(contenedor.querySelector('[data-naira-voto]')).not.toBeNull()
  })

  it('[N13:senal-segun-permiso] sin signal-view no se enlaza la señal; con él, al registro', async () => {
    permisos.conjunto = new Set(['open-loops-view', 'signal-feedback'])
    responder(LISTA)
    await montar()
    expect(contenedor.querySelector('article[data-naira-loop]')).not.toBeNull()
    expect(enlace('Ver la señal')).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['open-loops-view', 'signal-view', 'signal-feedback'])
    await montar()
    expect(enlace('Ver la señal')?.getAttribute('href')).toBe(rutaDeLaSenal('PROMO-1'))
  })

  it('[N13:sin-href-del-agente] un id vacío no arma enlaces; todo enlace del ok sale del registro', async () => {
    responder(SIN_IDS)
    await montar()
    expect(contenedor.querySelector('article[data-naira-loop]')).not.toBeNull()
    expect(enlace('Ver la bitácora')).toBeNull()
    expect(enlace('Ver la señal')).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    responder(LISTA)
    await montar()
    const hrefs = Array.from(contenedor.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(h.startsWith(RUTA_DE_NAIRA), h).toBe(true)
  })

  it('[N13:apagada] Naira apagada se dice y no pinta filas', async () => {
    leer.mockImplementation(async () => ({ kind: 'apagada' }))
    await montar()
    expect(contenedor.querySelector('[data-testid="naira-apagada"]')).not.toBeNull()
    expect(contenedor.querySelector('article')).toBeNull()
  })

  it('[N13:b5-sin-persona] ni en el ok ni en ejemplo aparece una persona o un valor de rol del agente', async () => {
    for (const origen of ['agente', 'ejemplo'] as const) {
      act(() => root.unmount())
      root = createRoot(contenedor)
      responder(LISTA, origen)
      await montar()
      expect(contenedor.querySelector('article[data-naira-loop]')).not.toBeNull()
      for (const u of USER_IDS_DE_EJEMPLO) expect(contenedor.innerHTML).not.toContain(u)
      expect(contenedor.innerHTML).not.toContain('role:')
    }
  })
})
