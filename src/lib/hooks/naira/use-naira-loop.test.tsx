/**
 * use-naira-loop.test.tsx — la lectura de la bitácora de UN loop (13-04, Tarea 2).
 *
 * Qué prueba: pide con la agencia y el loop; tras un ok, un 403 deja exactamente `sin_permiso` (FG13-1 a nivel hook);
 * abrir OTRO loop vuelve a cargando en el mismo cuadro sin nada del anterior; y no refresca al volver a la pestaña (P8).
 *
 * Arnés (molde de use-naira-senal.test.tsx de 13-03): createRoot + act, `useAuth` falso, el cliente mockeado SOLO en
 * `leerLoop` y un `Probe` que pinta el token solo en `ok`. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaOpenLoopDetail } from '@/lib/api/naira/contrato'
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
  leerLoop: leer,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaLoop } from './use-naira-loop'

type Caja = { estado: LecturaDeNaira<NairaOpenLoopDetail> | null; recargar: (() => void) | null }

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.detalle']

function detalleCon(loopId: string): NairaOpenLoopDetail {
  const base = EJEMPLOS_DE_NAIRA['seguimiento.detalle']
  return ESTRICTO.parse({ ...base, loop: { ...base.loop, loopId } })
}

const ok = (loopId: string): EstadoNaira<NairaOpenLoopDetail> => ({ kind: 'ok', data: detalleCon(loopId), origen: 'agente' })

function Probe({ loopId, caja }: { loopId: string; caja: Caja }) {
  const lectura = useNairaLoop(loopId)
  caja.estado = lectura.estado
  caja.recargar = lectura.recargar
  if (lectura.estado.kind === 'ok') return <span data-naira-token="">{lectura.estado.data.loop.loopId}</span>
  return <span data-estado={lectura.estado.kind} />
}

let container: HTMLDivElement
let root: Root

function montar(loopId: string, caja: Caja) {
  act(() => {
    root.render(<Probe loopId={loopId} caja={caja} />)
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
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('useNairaLoop', () => {
  it('[N13:control-positivo] pide el loop con la agencia y pinta el ok', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar('LOOP-1', caja)
    await asentar()
    expect(leer).toHaveBeenCalledWith('AGY-1', 'LOOP-1')
    expect(container.textContent).toContain('LOOP-TOKEN-1')
  })

  it('[N13:fixture-es-contrato] el detalle con el centinela pasa el esquema estricto', () => {
    const base = EJEMPLOS_DE_NAIRA['seguimiento.detalle']
    expect(() => ESTRICTO.parse({ ...base, loop: { ...base.loop, loopId: 'LOOP-TOKEN-1' } })).not.toThrow()
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al recargar deja exactamente sin_permiso y nada del ok', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar('LOOP-1', caja)
    await asentar()
    expect(container.textContent).toContain('LOOP-TOKEN-1')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect(container.innerHTML).not.toContain('LOOP-TOKEN-1')
    expect(container.querySelector('[data-naira-token]')).toBeNull()
  })

  it('[N13:loop-sin-residuo] abrir otro loop vuelve a cargando en el mismo cuadro sin nada del anterior', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar('LOOP-1', caja)
    await asentar()
    expect(container.textContent).toContain('LOOP-TOKEN-1')
    leer.mockImplementation(() => new Promise(() => undefined))
    montar('LOOP-2', caja)
    expect(caja.estado?.kind).toBe('cargando')
    expect(container.innerHTML).not.toContain('LOOP-TOKEN-1')
    expect(leer).toHaveBeenLastCalledWith('AGY-1', 'LOOP-2')
  })

  it('[N13:sin-refetch-al-volver] volver a la pestaña no vuelve a pedir la bitácora', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar('LOOP-1', caja)
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
  })
})
