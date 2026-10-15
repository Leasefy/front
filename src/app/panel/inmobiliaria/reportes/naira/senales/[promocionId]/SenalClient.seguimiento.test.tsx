/**
 * SenalClient.seguimiento.test.tsx — la línea «Seguimiento» del detalle de una señal como lectura SECUNDARIA (13-04,
 * Tarea 5; UI-SPEC §7.2 y §8.2). El test de 13-03 (SenalClient.test.tsx) no se toca.
 *
 * Qué prueba: con signal-view y open-loops-view la señal lleva «Seguimiento: <estado>» y el enlace a la bitácora de SU
 * loop; sin open-loops-view no se pide `GET /open-loops`; si esa lectura da 403, apagada, no disponible o contrato roto, o
 * si no hay loop de la señal, no hay línea ni cartel y la señal se ve entera; y sin personas.
 *
 * Arnés (el de SenalClient.test.tsx de 13-03 más `leerSeguimiento`): createRoot + act, stub de i18n real, `next/link` →
 * `<a>`, `next/navigation`, `useAuth` con AGY-1, cliente simulado sobre el módulo real, permisos por conjunto, popover
 * plano y `toast` simulado. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({
  leerSenal: vi.fn(),
  leerSeguimiento: vi.fn(),
  votarSenal: vi.fn(() => new Promise<unknown>(() => undefined)),
}))
const permisos = vi.hoisted(() => ({ conjunto: new Set<string>() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/senales/PROMO-1',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerSenal: red.leerSenal,
  leerSeguimiento: red.leerSeguimiento,
  votarSenal: red.votarSenal,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string, a: string) => m === 'naira' && permisos.conjunto.has(a),
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <span data-testid="popover">{children}</span>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaOpenLoopsList,
  type NairaSignalDetail,
} from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { rutaDelLoop } from '@/lib/nav/rutas-de-naira'

import { SenalClient } from './SenalClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ESTRICTO_SENAL = RESPUESTA_ESTRICTA_POR_ENDPOINT['senal.detalle']
const ESTRICTO_LISTA = RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.lista']
const TOKEN = 'TOKEN-SENAL-200'

const BASE_SENAL = EJEMPLOS_DE_NAIRA['senal.detalle']
const SENAL: NairaSignalDetail = {
  ...BASE_SENAL,
  promocionId: 'PROMO-1',
  item: { ...BASE_SENAL.item, titulo: 'La morosidad subió (ejemplo) ' + TOKEN },
}

const BASE_LOOP = EJEMPLOS_DE_NAIRA['seguimiento.lista'].loops[0]
const LISTA: NairaOpenLoopsList = {
  ...EJEMPLOS_DE_NAIRA['seguimiento.lista'],
  loops: [
    { ...BASE_LOOP, loopId: 'LOOP-DE-OTRA', promocionId: 'OTRA', estado: 'en_seguimiento' },
    { ...BASE_LOOP, loopId: 'LOOP-DE-LA-SENAL', promocionId: 'PROMO-1', estado: 'escalado' },
  ],
  ocultosPorRol: 0,
}
const SIN_LOOP_DE_LA_SENAL: NairaOpenLoopsList = { ...LISTA, loops: [LISTA.loops[0]!] }

let contenedor: HTMLDivElement
let root: Root

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })

async function montar() {
  act(() => {
    root.render(<SenalClient promocionId="PROMO-1" />)
  })
  await asentar()
}

function nuevoRoot() {
  act(() => root.unmount())
  root = createRoot(contenedor)
}

function laSenalSeVeEntera() {
  expect(contenedor.querySelector('[data-naira-vista="senal"][data-naira-estado="ok"]')).not.toBeNull()
  expect(contenedor.textContent).toContain(TOKEN)
}

beforeEach(() => {
  red.leerSenal.mockReset()
  red.leerSeguimiento.mockReset()
  red.votarSenal.mockClear()
  red.leerSenal.mockImplementation(async () => ({ kind: 'ok', data: ESTRICTO_SENAL.parse(SENAL), origen: 'agente' }))
  red.leerSeguimiento.mockImplementation(async () => ({ kind: 'ok', data: ESTRICTO_LISTA.parse(LISTA), origen: 'agente' }))
  permisos.conjunto = new Set(['signal-view', 'open-loops-view'])
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('SenalClient + línea de seguimiento (lectura secundaria)', () => {
  it('[N13:fixture-es-contrato] la señal y la lista del archivo pasan su esquema estricto', () => {
    expect(() => ESTRICTO_SENAL.parse(SENAL)).not.toThrow()
    expect(() => ESTRICTO_LISTA.parse(LISTA)).not.toThrow()
    expect(() => ESTRICTO_LISTA.parse(SIN_LOOP_DE_LA_SENAL)).not.toThrow()
  })

  it('[N13:control-positivo] con las dos acciones, la señal lleva la línea de SU loop con el enlace a la bitácora', async () => {
    await montar()
    laSenalSeVeEntera()
    const linea = contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')
    expect(linea?.textContent).toContain('Seguimiento: Escalado')
    const a = linea?.querySelector('a')
    expect(a?.getAttribute('href')).toBe(rutaDelLoop('LOOP-DE-LA-SENAL'))
    expect(red.leerSeguimiento).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:secundaria-sin-permiso-sin-red] sin open-loops-view no se pide el seguimiento ni hay línea', async () => {
    permisos.conjunto = new Set(['signal-view'])
    await montar()
    laSenalSeVeEntera()
    expect(red.leerSeguimiento).not.toHaveBeenCalled()
    expect(contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')).toBeNull()
  })

  it('[N13:secundaria-403-sin-rastro] si el seguimiento da 403, no hay línea ni cartel y la señal sigue entera', async () => {
    red.leerSeguimiento.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await montar()
    laSenalSeVeEntera()
    expect(red.leerSeguimiento).toHaveBeenCalled()
    expect(contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="naira-sin-permiso"]')).toBeNull()
    expect(contenedor.textContent).not.toContain('No tienes acceso a esto')
  })

  it('[N13:secundaria-falla-sin-rastro] apagada, no disponible o contrato roto no dejan línea ni cartel', async () => {
    for (const fallo of [{ kind: 'apagada' }, { kind: 'no_disponible' }, { kind: 'contrato_roto' }]) {
      nuevoRoot()
      red.leerSeguimiento.mockImplementation(async () => fallo)
      await montar()
      laSenalSeVeEntera()
      expect(contenedor.querySelector('[data-naira-seguimiento-de-la-senal]'), fallo.kind).toBeNull()
      expect(contenedor.querySelector('[data-testid="fallo-de-carga"]'), fallo.kind).toBeNull()
      expect(contenedor.querySelector('[data-testid="naira-apagada"]'), fallo.kind).toBeNull()
    }
  })

  it('[N13:secundaria-sin-loop] si la señal no tiene loop vivo, no hay línea', async () => {
    red.leerSeguimiento.mockImplementation(async () => ({
      kind: 'ok',
      data: ESTRICTO_LISTA.parse(SIN_LOOP_DE_LA_SENAL),
      origen: 'agente',
    }))
    await montar()
    laSenalSeVeEntera()
    expect(red.leerSeguimiento).toHaveBeenCalled()
    expect(contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')).toBeNull()
  })

  it('[N13:b5-sin-persona] la señal con su línea no muestra personas ni valores de rol del agente', async () => {
    await montar()
    expect(contenedor.querySelector('[data-naira-seguimiento-de-la-senal]')).not.toBeNull()
    for (const u of USER_IDS_DE_EJEMPLO) expect(contenedor.innerHTML).not.toContain(u)
    expect(contenedor.innerHTML).not.toContain('role:')
  })
})
