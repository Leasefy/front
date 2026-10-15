/**
 * use-naira-seguimiento.test.tsx — la lectura de la pestaña Seguimiento (13-04, Tarea 2).
 *
 * Qué prueba: pide con la agencia; tras un ok, un 403 deja exactamente `sin_permiso`, sin nada del ok ni en el estado ni en
 * el DOM (FG13-1 a nivel hook); refresca al volver a la pestaña (no con la pestaña oculta); sin agencia no toca la red; y
 * como lectura SECUNDARIA sin la acción (`habilitada = false`) es `sin_permiso` desde el primer cuadro y no toca la red.
 *
 * Arnés (molde de use-naira-briefing.test.tsx de 13-03): createRoot + act, `useAuth` falso con la agencia de una caja, el
 * cliente mockeado SOLO en `leerSeguimiento` (el resto del módulo real sigue) y un `Probe` que pinta el token solo en `ok`.
 * `document.visibilityState` se redefine por test y se restaura. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaOpenLoopsList } from '@/lib/api/naira/contrato'
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
  leerSeguimiento: leer,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaSeguimiento } from './use-naira-seguimiento'

type Caja = { estado: LecturaDeNaira<NairaOpenLoopsList> | null; recargar: (() => void) | null }

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.lista']

function listaCon(loopId: string): NairaOpenLoopsList {
  const base = EJEMPLOS_DE_NAIRA['seguimiento.lista']
  return ESTRICTO.parse({ ...base, loops: [{ ...base.loops[0], loopId }] })
}

const ok = (loopId: string): EstadoNaira<NairaOpenLoopsList> => ({ kind: 'ok', data: listaCon(loopId), origen: 'agente' })

function Probe({ caja, habilitada }: { caja: Caja; habilitada?: boolean }) {
  // `undefined` ⇒ el valor por defecto de la firma (habilitada = true)
  const lectura = useNairaSeguimiento(habilitada)
  caja.estado = lectura.estado
  caja.recargar = lectura.recargar
  if (lectura.estado.kind === 'ok') {
    return <span data-naira-token="">{lectura.estado.data.loops.map((l) => l.loopId).join(' ')}</span>
  }
  return <span data-estado={lectura.estado.kind} />
}

let container: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

function montar(caja: Caja, habilitada?: boolean) {
  act(() => {
    root.render(<Probe caja={caja} habilitada={habilitada} />)
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

async function volverAlFoco() {
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await asentar()
}

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

describe('useNairaSeguimiento', () => {
  it('[N13:control-positivo] pide la lista con la agencia y pinta el ok', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    expect(container.textContent).toContain('LOOP-TOKEN-200')
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:fixture-es-contrato] el ejemplo con el centinela pasa el esquema estricto y un campo renombrado no', () => {
    const base = EJEMPLOS_DE_NAIRA['seguimiento.lista']
    const bueno = { ...base, loops: [{ ...base.loops[0], loopId: 'LOOP-TOKEN-200' }] }
    expect(() => ESTRICTO.parse(bueno)).not.toThrow()
    const { loopId, ...resto } = bueno.loops[0]
    const renombrado = { ...bueno, loops: [{ ...resto, loopIdd: loopId }] }
    expect(() => ESTRICTO.parse(renombrado)).toThrow()
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al recargar deja exactamente sin_permiso y nada del ok', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    expect(container.textContent).toContain('LOOP-TOKEN-200')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect('data' in (caja.estado as object)).toBe(false)
    expect(container.innerHTML).not.toContain('LOOP-TOKEN-200')
    expect(container.querySelector('[data-naira-token]')).toBeNull()
  })

  it('[N13:refetch-al-volver] con la pestaña visible, volver a ella vuelve a pedir; oculta, no', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    visible = 'visible'
    await volverAlFoco()
    expect(leer).toHaveBeenCalledTimes(2)
    visible = 'hidden'
    await volverAlFoco()
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('[N13:sin-agencia-sin-red] sin agencia queda cargando y no pide', async () => {
    auth.agencia = null
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    expect(caja.estado).toEqual({ kind: 'cargando' })
    expect(leer).not.toHaveBeenCalled()
  })

  it('[N13:secundaria-sin-red] sin la acción es sin_permiso desde el primer cuadro y no pide; con ella, pide una vez', async () => {
    leer.mockImplementation(async () => ok('LOOP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, false)
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect(leer).not.toHaveBeenCalled()
    visible = 'visible'
    await volverAlFoco()
    expect(leer).not.toHaveBeenCalled()
    montar(caja, true)
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
    expect(container.textContent).toContain('LOOP-TOKEN-200')
  })
})
