/**
 * use-naira-propuesta.test.tsx — la lectura de la ficha de una propuesta (13-05, Tarea 2).
 *
 * Qué prueba: pide con la agencia y la propuesta; tras un ok, un 403 deja exactamente `sin_permiso` (FG13-1); otra
 * propuesta en el mismo componente empieza en `cargando` sin nada de la anterior; y el detalle se pide SOLO al abrir
 * (D13-14, FG13-14): ni al volver al foco, ni por un `focus`, ni al re-renderizar con la misma propuesta; solo `recargar()`
 * lo vuelve a pedir. Estático: de todo el árbol de Naira, solo este hook nombra la función del detalle, y no se relee solo.
 *
 * Arnés (molde de 13-04): createRoot + act, `useAuth` falso, el cliente mockeado en `leerPropuesta` y un `Probe` que pinta
 * el token solo en `ok`. `document.visibilityState` se redefine por test y se restaura. Marcador [N13:*] en el TÍTULO.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaActionDetail } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { leer, auth } = vi.hoisted(() => ({
  leer: vi.fn(),
  auth: { agencia: { id: 'AGY-1' } as { id: string } | null },
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: auth.agencia }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerPropuesta: leer,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaPropuesta } from './use-naira-propuesta'

type Caja = { estado: LecturaDeNaira<NairaActionDetail> | null; recargar: (() => void) | null }

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.detalle']
const HOOK = 'src/lib/hooks/naira/use-naira-propuesta.ts'
const ARBOL = [
  'src/lib/hooks/naira',
  'src/lib/naira',
  'src/components/inmobiliaria/naira',
  'src/app/panel/inmobiliaria/reportes/naira',
]

function detalleCon(huella: string): NairaActionDetail {
  return ESTRICTO.parse({ ...EJEMPLOS_DE_NAIRA['acciones.detalle'], huella })
}

const ok = (huella: string): EstadoNaira<NairaActionDetail> => ({ kind: 'ok', data: detalleCon(huella), origen: 'agente' })

function codigoSinComentarios(ruta: string): string {
  return readFileSync(resolve(process.cwd(), ruta), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')
}

function archivosNoTest(dir: string): string[] {
  const abs = resolve(process.cwd(), dir)
  if (!existsSync(abs)) return []
  const salida: string[] = []
  for (const nombre of readdirSync(abs)) {
    const rel = join(dir, nombre)
    if (statSync(resolve(process.cwd(), rel)).isDirectory()) salida.push(...archivosNoTest(rel))
    else if (/\.(ts|tsx)$/.test(nombre) && !/\.test\.(ts|tsx)$/.test(nombre)) salida.push(rel)
  }
  return salida
}

function Probe({ caja, proposalId }: { caja: Caja; proposalId: string }) {
  const lectura = useNairaPropuesta(proposalId)
  caja.estado = lectura.estado
  caja.recargar = lectura.recargar
  if (lectura.estado.kind === 'ok') return <span data-naira-token="">{lectura.estado.data.huella}</span>
  return <span data-estado={lectura.estado.kind} />
}

let container: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

function montar(caja: Caja, proposalId: string) {
  act(() => {
    root.render(<Probe caja={caja} proposalId={proposalId} />)
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

beforeEach(() => {
  leer.mockReset()
  leer.mockImplementation(async () => ({ kind: 'no_disponible' }))
  auth.agencia = { id: 'AGY-1' }
  visible = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('useNairaPropuesta', () => {
  it('[N13:control-positivo] pide el detalle con la agencia y la propuesta y pinta el ok', async () => {
    leer.mockImplementation(async () => ok('DETALLE-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, 'PROP-1')
    await asentar()
    expect(leer).toHaveBeenCalledWith('AGY-1', 'PROP-1')
    expect(container.textContent).toContain('DETALLE-TOKEN-1')
  })

  it('[N13:fixture-es-contrato] el detalle con el centinela pasa el esquema estricto y un campo renombrado no', () => {
    const bueno = { ...EJEMPLOS_DE_NAIRA['acciones.detalle'], huella: 'DETALLE-TOKEN-1' }
    expect(() => ESTRICTO.parse(bueno)).not.toThrow()
    const { huella, ...resto } = bueno
    expect(() => ESTRICTO.parse({ ...resto, huellaa: huella })).toThrow()
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al recargar deja exactamente sin_permiso y nada del ok', async () => {
    leer.mockImplementation(async () => ok('DETALLE-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, 'PROP-1')
    await asentar()
    expect(container.textContent).toContain('DETALLE-TOKEN-1')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect('data' in (caja.estado as object)).toBe(false)
    expect(container.innerHTML).not.toContain('DETALLE-TOKEN-1')
    expect(container.querySelector('[data-naira-token]')).toBeNull()
  })

  it('[N13:propuesta-sin-residuo] otra propuesta empieza cargando sin nada de la anterior', async () => {
    leer.mockImplementation(async () => ok('DETALLE-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, 'PROP-1')
    await asentar()
    expect(container.textContent).toContain('DETALLE-TOKEN-1')
    leer.mockImplementation(() => new Promise<never>(() => undefined))
    montar(caja, 'PROP-2')
    expect(caja.estado?.kind).toBe('cargando')
    expect(container.innerHTML).not.toContain('DETALLE-TOKEN-1')
    expect(leer).toHaveBeenLastCalledWith('AGY-1', 'PROP-2')
  })

  it('[N13:detalle-solo-al-abrir] se pide al abrir y al recargar; ni al volver, ni por foco, ni al re-renderizar', async () => {
    leer.mockImplementation(async () => ok('DETALLE-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, 'PROP-1')
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    visible = 'visible'
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
    montar(caja, 'PROP-1')
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(leer).toHaveBeenCalledTimes(2)
    // Estático: de todo el árbol de Naira, solo este hook nombra la función del detalle, y no se relee solo.
    const conDetalle = ARBOL.flatMap(archivosNoTest).filter((ruta) => /\bleerPropuesta\b/.test(codigoSinComentarios(ruta)))
    expect(conDetalle).toEqual([HOOK])
    const codigo = codigoSinComentarios(HOOK)
    for (const prohibido of ['useRefetchOnVisible', 'setInterval', 'setTimeout', 'useVisibilityPolling', 'onvisibilitychange', 'addEventListener']) {
      expect(codigo.includes(prohibido), prohibido).toBe(false)
    }
  })
})
