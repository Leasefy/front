/**
 * use-naira-tareas.test.tsx — la lectura SECUNDARIA de las tareas de Naira en Aprobaciones (13-05, Tarea 2).
 *
 * Qué prueba: pide con la agencia; tras un ok, un 403 deja exactamente `sin_permiso` sin nada del ok (FG13-1); sin la
 * acción (`habilitada = false`) es `sin_permiso` desde el primer cuadro y no toca la red, ni al volver a la pestaña
 * (UI-SPEC §8.2); habilitada, refresca al volver.
 *
 * Arnés (molde de 13-04): createRoot + act, `useAuth` falso, el cliente mockeado en `leerTareas` y un `Probe` que pinta el
 * token solo en `ok`. `document.visibilityState` se redefine por test y se restaura. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaTasksList } from '@/lib/api/naira/contrato'
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
  leerTareas: leer,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaTareas } from './use-naira-tareas'

type Caja = { estado: LecturaDeNaira<NairaTasksList> | null; recargar: (() => void) | null }

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['tareas.lista']

function listaCon(tareaId: string): NairaTasksList {
  const base = EJEMPLOS_DE_NAIRA['tareas.lista']
  return ESTRICTO.parse({ ...base, tareas: [{ ...base.tareas[0], tareaId }] })
}

const ok = (tareaId: string): EstadoNaira<NairaTasksList> => ({ kind: 'ok', data: listaCon(tareaId), origen: 'agente' })

function Probe({ caja, habilitada }: { caja: Caja; habilitada: boolean }) {
  const lectura = useNairaTareas(habilitada)
  caja.estado = lectura.estado
  caja.recargar = lectura.recargar
  if (lectura.estado.kind === 'ok') {
    return <span data-naira-token="">{lectura.estado.data.tareas.map((t) => t.tareaId).join(' ')}</span>
  }
  return <span data-estado={lectura.estado.kind} />
}

let container: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

function montar(caja: Caja, habilitada: boolean) {
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

describe('useNairaTareas', () => {
  it('[N13:control-positivo] habilitada, pide las tareas con la agencia y pinta el ok', async () => {
    leer.mockImplementation(async () => ok('TAREA-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, true)
    await asentar()
    expect(leer).toHaveBeenCalledWith('AGY-1')
    expect(container.textContent).toContain('TAREA-TOKEN-1')
  })

  it('[N13:fixture-es-contrato] la lista con el centinela pasa el esquema estricto y un campo renombrado no', () => {
    const base = EJEMPLOS_DE_NAIRA['tareas.lista']
    const bueno = { ...base, tareas: [{ ...base.tareas[0], tareaId: 'TAREA-TOKEN-1' }] }
    expect(() => ESTRICTO.parse(bueno)).not.toThrow()
    const { tareaId, ...resto } = bueno.tareas[0]
    expect(() => ESTRICTO.parse({ ...bueno, tareas: [{ ...resto, tareaIdd: tareaId }] })).toThrow()
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al recargar deja exactamente sin_permiso y nada del ok', async () => {
    leer.mockImplementation(async () => ok('TAREA-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, true)
    await asentar()
    expect(container.textContent).toContain('TAREA-TOKEN-1')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect('data' in (caja.estado as object)).toBe(false)
    expect(container.innerHTML).not.toContain('TAREA-TOKEN-1')
    expect(container.querySelector('[data-naira-token]')).toBeNull()
  })

  it('[N13:secundaria-sin-red] sin la acción es sin_permiso desde el primer cuadro y no pide; con ella, pide una vez', async () => {
    leer.mockImplementation(async () => ok('TAREA-TOKEN-1'))
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
    expect(container.textContent).toContain('TAREA-TOKEN-1')
  })

  it('[N13:refetch-al-volver] habilitada, volver a la pestaña visible vuelve a pedir', async () => {
    leer.mockImplementation(async () => ok('TAREA-TOKEN-1'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja, true)
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    visible = 'visible'
    await volverAlFoco()
    expect(leer).toHaveBeenCalledTimes(2)
  })
})
