/**
 * use-naira-memoria.test.tsx — la lectura de «Qué cree Naira» (13-07, Tarea 2).
 *
 * Qué prueba: pide con la agencia; tras un ok, un 403 deja exactamente `sin_permiso` sin nada del ok ni en el estado ni en
 * el DOM (FG13-1 a nivel hook); refresca al volver a la pestaña (no con la pestaña oculta); sin agencia no toca la red; y en
 * producción nunca sirve el ejemplo aunque el opt-in del simulado esté prendido (FG13-10, con el cliente REAL y `agentFetch`
 * simulado). Arnés: molde de 13-05. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaMemoryView } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { leer, fetchDoble, modo, auth } = vi.hoisted(() => ({
  leer: vi.fn(),
  fetchDoble: vi.fn(),
  modo: { real: false },
  auth: { agencia: { id: 'AGY-1' } as { id: string } | null },
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: auth.agencia }) }))
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: fetchDoble }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/naira/cliente')>()
  return {
    ...original,
    leerMemoria: (...a: Parameters<typeof original.leerMemoria>) => (modo.real ? original.leerMemoria(...a) : leer(...a)),
  }
})

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaMemoria } from './use-naira-memoria'

type Caja = { estado: LecturaDeNaira<NairaMemoryView> | null; recargar: (() => void) | null }

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['memoria.vista']

function vistaCon(token: string): NairaMemoryView {
  const base = EJEMPLOS_DE_NAIRA['memoria.vista']
  let cambiado = false
  const items = base.items.map((i) => {
    if (!cambiado && i.content.kind === 'present') {
      cambiado = true
      return { ...i, content: { kind: 'present' as const, text: token } }
    }
    return i
  })
  return ESTRICTO.parse({ ...base, items })
}

const VISTA = vistaCon('MEM-TOKEN-200')
const VISTA_REAL = vistaCon('MEM-TOKEN-REAL')

function Probe({ caja }: { caja: Caja }) {
  const l = useNairaMemoria()
  caja.estado = l.estado
  caja.recargar = l.recargar
  if (l.estado.kind !== 'ok') return <span data-estado={l.estado.kind} />
  const primero = l.estado.data.items.find((i) => i.content.kind === 'present')
  return <span data-naira-token="">{primero && primero.content.kind === 'present' ? primero.content.text : ''}</span>
}

let host: HTMLDivElement
let root: Root
let visible: DocumentVisibilityState = 'visible'
const descriptorOriginal = Object.getOwnPropertyDescriptor(document, 'visibilityState')

const esperar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

async function montar(caja: Caja) {
  await act(async () => {
    root.render(<Probe caja={caja} />)
  })
  await esperar()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  leer.mockReset()
  fetchDoble.mockReset()
  modo.real = false
  auth.agencia = { id: 'AGY-1' }
  visible = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllEnvs()
  if (descriptorOriginal) Object.defineProperty(document, 'visibilityState', descriptorOriginal)
  else delete (document as { visibilityState?: unknown }).visibilityState
})

describe('useNairaMemoria', () => {
  it('[N13:control-positivo] con ok se ve el token y se pidió una vez con la agencia', async () => {
    leer.mockResolvedValue({ kind: 'ok', data: VISTA, origen: 'agente' })
    const caja: Caja = { estado: null, recargar: null }
    await montar(caja)
    expect(host.textContent).toContain('MEM-TOKEN-200')
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:fixture-es-contrato] la vista con el centinela pasa el esquema ESTRICTO; un campo mal escrito no', () => {
    expect(() => ESTRICTO.parse(VISTA)).not.toThrow()
    const { generatedAt, ...resto } = VISTA
    expect(() => ESTRICTO.parse({ ...resto, generatedAtt: generatedAt })).toThrow()
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al recargar deja solo sin_permiso, sin nada del ok', async () => {
    leer.mockResolvedValueOnce({ kind: 'ok', data: VISTA, origen: 'agente' })
    const caja: Caja = { estado: null, recargar: null }
    await montar(caja)
    expect(host.textContent).toContain('MEM-TOKEN-200')
    leer.mockResolvedValueOnce({ kind: 'sin_permiso' })
    await act(async () => {
      caja.recargar?.()
    })
    await esperar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect('data' in (caja.estado as object)).toBe(false)
    expect(host.innerHTML).not.toContain('MEM-TOKEN-200')
    expect(host.querySelector('[data-naira-token]')).toBeNull()
  })

  it('[N13:refetch-al-volver] al volver a la pestaña vuelve a pedir; con la pestaña oculta no', async () => {
    leer.mockResolvedValue({ kind: 'ok', data: VISTA, origen: 'agente' })
    const caja: Caja = { estado: null, recargar: null }
    await montar(caja)
    expect(leer).toHaveBeenCalledTimes(1)
    visible = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await esperar()
    expect(leer).toHaveBeenCalledTimes(1)
    visible = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await esperar()
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('[N13:sin-agencia-sin-red] sin agencia queda cargando y no pide', async () => {
    auth.agencia = null
    const caja: Caja = { estado: null, recargar: null }
    await montar(caja)
    expect(caja.estado).toEqual({ kind: 'cargando' })
    expect(leer).not.toHaveBeenCalled()
  })

  it('[N13:simulado-nunca-en-prod] en producción va al agente real y nunca aparece el ejemplo; en test el opt-in sirve el ejemplo', async () => {
    modo.real = true
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'https://agente.test')
    fetchDoble.mockResolvedValue(
      new Response(JSON.stringify(VISTA_REAL), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const caja: Caja = { estado: null, recargar: null }
    await montar(caja)
    expect(caja.estado?.kind).toBe('ok')
    expect(caja.estado && caja.estado.kind === 'ok' ? caja.estado.origen : null).toBe('agente')
    expect(host.textContent).toContain('MEM-TOKEN-REAL')
    expect(fetchDoble).toHaveBeenCalledTimes(1)
    expect(String(fetchDoble.mock.calls[0][0])).toMatch(/\/api\/agency\/AGY-1\/naira\/memory$/)
    for (const i of EJEMPLOS_DE_NAIRA['memoria.vista'].items) {
      if (i.content.kind === 'present') expect(host.textContent).not.toContain(i.content.text)
    }
    act(() => root.unmount())
    root = createRoot(host)
    vi.stubEnv('NODE_ENV', 'test')
    fetchDoble.mockClear()
    const control: Caja = { estado: null, recargar: null }
    await montar(control)
    expect(control.estado && control.estado.kind === 'ok' ? control.estado.origen : null).toBe('ejemplo')
    expect(fetchDoble).toHaveBeenCalledTimes(0)
  })
})
