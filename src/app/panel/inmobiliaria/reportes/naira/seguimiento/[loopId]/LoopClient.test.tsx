/**
 * LoopClient.test.tsx — la ficha de un loop de Naira, su bitácora (13-04, Tarea 5).
 *
 * Qué prueba (con el hook real y el cliente simulado): el ok pinta el h1, la métrica y la bitácora con la vuelta a la
 * pestaña; abrir OTRO loop que da 403 en el mismo componente no deja nada del anterior (FG13-1); no encontrado vuelve a la
 * pestaña; ningún número sin corte ni conteo de Naira; ejemplo visible; «Ver la señal» solo con signal-view; la página
 * existe con su guard; y sin personas.
 *
 * Arnés (molde de SenalClient.test.tsx de 13-03): createRoot + act, stub de i18n real, `next/link` → `<a>`,
 * `next/navigation` (lo usa VolverALaLista), `useAuth` con AGY-1, `leerLoop` simulado sobre el módulo real y permisos por
 * conjunto. Marcador [N13:*] en el TÍTULO.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { leer, respuestas, permisos } = vi.hoisted(() => {
  const respuestas = new Map<string, unknown>()
  return {
    respuestas,
    leer: vi.fn(async (_agencyId: string, loopId: string) => respuestas.get(loopId) ?? { kind: 'no_disponible' }),
    permisos: { conjunto: new Set<string>() },
  }
})

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/seguimiento/x',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerLoop: leer,
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

import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaOpenLoopDetail } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { RUTA_DEL_SEGUIMIENTO, rutaDeLaSenal } from '@/lib/nav/rutas-de-naira'

import { LoopClient } from './LoopClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FICHA = 'src/app/panel/inmobiliaria/reportes/naira/seguimiento/[loopId]'
const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.detalle']
const BASE = EJEMPLOS_DE_NAIRA['seguimiento.detalle']

const DETALLE_A: NairaOpenLoopDetail = {
  loop: { ...BASE.loop, loopId: 'LOOP-TOKEN-A', metricId: 'cartera.morosidad_rate', promocionId: 'PROMO-TOKEN-A' },
  eventos: BASE.eventos.map((e) => ({ ...e, seguimiento: { ...e.seguimiento, ciclos: 4711 } })),
}

let contenedor: HTMLDivElement
let root: Root

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })

async function montar(loopId: string) {
  act(() => {
    root.render(<LoopClient loopId={loopId} />)
  })
  await asentar()
}

function enlace(texto: string): HTMLAnchorElement | null {
  return Array.from(contenedor.querySelectorAll('a')).find((a) => a.textContent === texto) ?? null
}

function hrefDeVolver(): string | null {
  const v = contenedor.querySelector('[data-testid="volver-a-la-lista"]')
  return v?.getAttribute('href') ?? v?.querySelector('a')?.getAttribute('href') ?? null
}

beforeEach(() => {
  leer.mockClear()
  respuestas.clear()
  respuestas.set('LOOP-TOKEN-A', { kind: 'ok', data: ESTRICTO.parse(DETALLE_A), origen: 'agente' })
  permisos.conjunto = new Set(['open-loops-view', 'signal-view'])
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('LoopClient', () => {
  it('[N13:fixture-es-contrato] el detalle del archivo pasa el esquema estricto', () => {
    expect(() => ESTRICTO.parse(DETALLE_A)).not.toThrow()
  })

  it('[N13:control-positivo] el ok pinta el h1, la métrica y la bitácora del loop pedido', async () => {
    await montar('LOOP-TOKEN-A')
    expect(contenedor.querySelector('[data-naira-vista="loop"][data-naira-estado="ok"]')).not.toBeNull()
    const h1 = contenedor.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0]?.textContent).toBe('Bitácora del seguimiento')
    expect(contenedor.querySelector('h2')?.textContent).toBe('Índice de morosidad')
    expect(contenedor.querySelector('ol[data-naira-bitacora]')).not.toBeNull()
    expect(leer).toHaveBeenCalledWith('AGY-1', 'LOOP-TOKEN-A')
  })

  it('[N13:ficha-con-vuelta] en el ok hay una vuelta visible a la pestaña Seguimiento', async () => {
    await montar('LOOP-TOKEN-A')
    const volver = contenedor.querySelector('[data-testid="volver-a-la-lista"]')
    expect(volver).not.toBeNull()
    expect(hrefDeVolver()).toBe(RUTA_DEL_SEGUIMIENTO)
    expect(volver?.textContent).toContain('Volver a Seguimiento')
  })

  it('[N13:403-sin-residuo] abrir otro loop que da 403 no deja nada del anterior', async () => {
    respuestas.set('LOOP-TOKEN-B', { kind: 'sin_permiso' })
    await montar('LOOP-TOKEN-A')
    expect(contenedor.textContent).toContain('Índice de morosidad')
    await montar('LOOP-TOKEN-B')
    const cartel = contenedor.querySelector('[data-testid="naira-sin-permiso"]')
    expect(cartel).not.toBeNull()
    expect(Array.from(cartel?.querySelectorAll('a') ?? []).some((a) => a.getAttribute('href') === RUTA_DEL_SEGUIMIENTO)).toBe(true)
    expect(contenedor.textContent).not.toContain('Índice de morosidad')
    expect(contenedor.innerHTML).not.toContain('PROMO-TOKEN-A')
    expect(contenedor.querySelector('ol')).toBeNull()
    expect(contenedor.querySelector('[data-naira-numero]')).toBeNull()
  })

  it('[N13:no-encontrado] un loop que no existe lo dice y vuelve a la pestaña', async () => {
    respuestas.set('LOOP-TOKEN-B', { kind: 'no_encontrado' })
    await montar('LOOP-TOKEN-B')
    const cartel = contenedor.querySelector('[data-testid="naira-no-encontrado"]')
    expect(cartel).not.toBeNull()
    expect(Array.from(cartel?.querySelectorAll('a') ?? []).some((a) => a.getAttribute('href') === RUTA_DEL_SEGUIMIENTO)).toBe(true)
  })

  it('[N13:asof-pegado] todo número lleva su corte en su cifra; en la bitácora no hay ninguno', async () => {
    await montar('LOOP-TOKEN-A')
    const numeros = Array.from(contenedor.querySelectorAll('[data-naira-numero]'))
    for (const n of numeros) expect(n.closest('[data-naira-cifra]')?.querySelector('[data-naira-asof]')).not.toBeNull()
    expect(numeros).toHaveLength(0)
  })

  it('[N13:conteos-sin-numeral] los ciclos de Naira no se escriben', async () => {
    await montar('LOOP-TOKEN-A')
    expect(contenedor.querySelector('ol[data-naira-bitacora]')).not.toBeNull()
    expect(contenedor.innerHTML).not.toContain('4711')
  })

  it('[N13:simulado-visible] con datos de ejemplo se avisa y se marca', async () => {
    respuestas.set('LOOP-TOKEN-A', { kind: 'ok', data: ESTRICTO.parse(DETALLE_A), origen: 'ejemplo' })
    await montar('LOOP-TOKEN-A')
    expect(contenedor.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-sample="true"]')).not.toBeNull()
  })

  it('[N13:senal-segun-permiso] sin signal-view no se enlaza la señal; con él, al registro', async () => {
    permisos.conjunto = new Set(['open-loops-view'])
    await montar('LOOP-TOKEN-A')
    expect(contenedor.querySelector('ol[data-naira-bitacora]')).not.toBeNull()
    expect(enlace('Ver la señal')).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['open-loops-view', 'signal-view'])
    await montar('LOOP-TOKEN-A')
    expect(enlace('Ver la señal')?.getAttribute('href')).toBe(rutaDeLaSenal('PROMO-TOKEN-A'))
  })

  it('[N13:ficha-con-pagina] la ficha tiene su página con el guard de su acción y una vuelta visible', () => {
    const pagina = join(process.cwd(), FICHA, 'page.tsx')
    expect(existsSync(pagina)).toBe(true)
    const guard = /<PageGuard\b([^>]*)>/.exec(readFileSync(pagina, 'utf8'))
    expect(guard).not.toBeNull()
    expect(guard![1]).toContain('module="naira"')
    expect(guard![1]).toContain('action="open-loops-view"')
    expect(readFileSync(join(process.cwd(), FICHA, 'LoopClient.tsx'), 'utf8')).toContain('VolverALaLista')
  })

  it('[N13:b5-sin-persona] el ok no muestra personas ni valores de rol del agente', async () => {
    await montar('LOOP-TOKEN-A')
    expect(contenedor.querySelector('ol[data-naira-bitacora]')).not.toBeNull()
    for (const u of USER_IDS_DE_EJEMPLO) expect(contenedor.innerHTML).not.toContain(u)
    expect(contenedor.innerHTML).not.toContain('role:')
  })
})
