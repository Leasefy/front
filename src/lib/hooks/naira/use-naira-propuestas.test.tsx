/**
 * use-naira-propuestas.test.tsx — la lectura de la pestaña Aprobaciones (13-05, Tarea 2).
 *
 * Qué prueba: pide con la agencia; tras un ok, un 403 deja exactamente `sin_permiso`, sin nada del ok ni en el estado ni en
 * el DOM (FG13-1 a nivel hook); refresca al volver a la pestaña (no con la pestaña oculta); sin agencia no toca la red; y
 * NUNCA pide el detalle de una propuesta (su GET registra que se presentó: D13-14, FG13-14), ni al montar, ni al volver,
 * ni al recargar, y el archivo no nombra la función del detalle.
 *
 * Arnés (molde de 13-04): createRoot + act, `useAuth` falso con la agencia de una caja, el cliente mockeado en
 * `leerPropuestas` y `leerPropuesta` (el resto del módulo real sigue) y un `Probe` que pinta el token solo en `ok`.
 * `document.visibilityState` se redefine por test y se restaura. Marcador [N13:*] en el TÍTULO.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaActionsList } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { leer, leerDetalle, auth } = vi.hoisted(() => ({
  leer: vi.fn(),
  leerDetalle: vi.fn(),
  auth: { agencia: { id: 'AGY-1' } as { id: string } | null },
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: auth.agencia }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerPropuestas: leer,
  leerPropuesta: leerDetalle,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaPropuestas } from './use-naira-propuestas'

type Caja = { estado: LecturaDeNaira<NairaActionsList> | null; recargar: (() => void) | null }

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.lista']

function listaCon(proposalId: string): NairaActionsList {
  const base = EJEMPLOS_DE_NAIRA['acciones.lista']
  return ESTRICTO.parse({ ...base, acciones: [{ ...base.acciones[0], proposalId }] })
}

const ok = (proposalId: string): EstadoNaira<NairaActionsList> => ({ kind: 'ok', data: listaCon(proposalId), origen: 'agente' })

/** El código de un archivo sin sus comentarios (bloque y línea completa). */
function codigoSinComentarios(ruta: string): string {
  return readFileSync(resolve(process.cwd(), ruta), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')
}

function Probe({ caja }: { caja: Caja }) {
  const lectura = useNairaPropuestas()
  caja.estado = lectura.estado
  caja.recargar = lectura.recargar
  if (lectura.estado.kind === 'ok') {
    return <span data-naira-token="">{lectura.estado.data.acciones.map((a) => a.proposalId).join(' ')}</span>
  }
  return <span data-estado={lectura.estado.kind} />
}

let container: HTMLDivElement
let root: Root
let visible: 'visible' | 'hidden' = 'visible'

function montar(caja: Caja) {
  act(() => {
    root.render(<Probe caja={caja} />)
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
  leerDetalle.mockReset()
  leer.mockImplementation(async () => ({ kind: 'no_disponible' }))
  leerDetalle.mockImplementation(async () => ({ kind: 'no_disponible' }))
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

describe('useNairaPropuestas', () => {
  it('[N13:control-positivo] pide la lista con la agencia y pinta el ok', async () => {
    leer.mockImplementation(async () => ok('PROP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    expect(container.textContent).toContain('PROP-TOKEN-200')
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:fixture-es-contrato] el ejemplo con el centinela pasa el esquema estricto y un campo renombrado no', () => {
    const base = EJEMPLOS_DE_NAIRA['acciones.lista']
    const bueno = { ...base, acciones: [{ ...base.acciones[0], proposalId: 'PROP-TOKEN-200' }] }
    expect(() => ESTRICTO.parse(bueno)).not.toThrow()
    const { proposalId, ...resto } = bueno.acciones[0]
    const renombrado = { ...bueno, acciones: [{ ...resto, proposalIdd: proposalId }] }
    expect(() => ESTRICTO.parse(renombrado)).toThrow()
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al recargar deja exactamente sin_permiso y nada del ok', async () => {
    leer.mockImplementation(async () => ok('PROP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    expect(container.textContent).toContain('PROP-TOKEN-200')
    leer.mockImplementation(async () => ({ kind: 'sin_permiso' }))
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect('data' in (caja.estado as object)).toBe(false)
    expect(container.innerHTML).not.toContain('PROP-TOKEN-200')
    expect(container.querySelector('[data-naira-token]')).toBeNull()
  })

  it('[N13:refetch-al-volver] con la pestaña visible, volver a ella vuelve a pedir; oculta, no', async () => {
    leer.mockImplementation(async () => ok('PROP-TOKEN-200'))
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

  it('[N13:detalle-solo-al-abrir] la lista nunca pide el detalle: ni al montar, ni al volver, ni al recargar', async () => {
    leer.mockImplementation(async () => ok('PROP-TOKEN-200'))
    const caja: Caja = { estado: null, recargar: null }
    montar(caja)
    await asentar()
    visible = 'visible'
    await volverAlFoco()
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(leer).toHaveBeenCalledTimes(3)
    expect(leerDetalle).toHaveBeenCalledTimes(0)
    const codigo = codigoSinComentarios('src/lib/hooks/naira/use-naira-propuestas.ts')
    expect(codigo).toContain('leerPropuestas')
    expect(/\bleerPropuesta\b/.test(codigo)).toBe(false)
  })
})
