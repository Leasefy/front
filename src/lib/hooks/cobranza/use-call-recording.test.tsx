/**
 * Tests de useCallRecording.
 *
 * El caso que importa no es «suena o no suena»: es que la pantalla dejó de
 * creerle a `calls.recording_url`. Medido contra la base de desarrollo, 50 de
 * 96 llamadas reales tenían esa columna vacía y las 12 que muestreé SÍ tenían
 * audio en Vapi — la pantalla anunciaba «no tiene grabación» sobre grabaciones
 * existentes y ni siquiera intentaba traerlas.
 *
 * El segundo caso: 404 y 502 NO son lo mismo. «No hay grabación» y «no pudimos
 * traerla» dicen cosas distintas sobre la evidencia de una llamada.
 *
 * Patrón de montaje: createRoot + act, igual que el resto de los hooks del repo.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const agentFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch }))

import {
  classifyRecordingStatus,
  useCallRecording,
  type RecordingState,
} from './use-call-recording'

void React // jsx-preserve

let container: HTMLDivElement
let root: Root

// React 18 exige la bandera para que `act` de verdad vacíe los efectos en vez
// de sólo advertirlo por stderr.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test'
  agentFetch.mockReset()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:audio-1')
  globalThis.URL.revokeObjectURL = vi.fn()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

const respuesta = (status: number, size = 4096, kind: string | null = null) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h === 'X-Recording-Kind' ? kind : null) },
    blob: async () => ({ size }),
  }) as never

async function montar(): Promise<{ current: RecordingState }> {
  const out = { current: { status: 'probing' } as RecordingState }
  function Wrapper() {
    out.current = useCallRecording('ag-1', 'call-1').state
    return null
  }
  await act(async () => {
    root.render(<Wrapper />)
  })
  return out
}

describe('classifyRecordingStatus', () => {
  it('404 es ausencia; cualquier otra cosa es falla nuestra', () => {
    expect(classifyRecordingStatus(404)).toBe('absent')
    expect(classifyRecordingStatus(502)).toBe('failed')
    expect(classifyRecordingStatus(401)).toBe('failed')
    expect(classifyRecordingStatus(500)).toBe('failed')
  })
})

describe('useCallRecording', () => {
  it('pregunta por el audio SIEMPRE, sin mirar ninguna bandera previa', async () => {
    agentFetch.mockResolvedValue(respuesta(200))
    await montar()
    // Éste es el bug que se arregla: antes ni se intentaba cuando la columna
    // en base venía vacía.
    expect(agentFetch).toHaveBeenCalledTimes(1)
    expect(agentFetch.mock.calls[0][0]).toBe(
      'http://agente.test/api/agency/ag-1/cobranza/calls/call-1/audio',
    )
  })

  it('con bytes queda listo para reproducir', async () => {
    agentFetch.mockResolvedValue(respuesta(200))
    const out = await montar()
    expect(out.current).toEqual({
      status: 'ready',
      objectUrl: 'blob:audio-1',
      kind: 'vapi',
    })
  })

  it('marca como sintético el audio que el proxy rotula «demo»', async () => {
    // Sin esto la pantalla presentaría una voz sintetizada como si fuera la
    // grabación de la llamada, en la pantalla que sirve de evidencia.
    agentFetch.mockResolvedValue(respuesta(200, 4096, 'demo'))
    const out = await montar()
    expect(out.current).toMatchObject({ status: 'ready', kind: 'demo' })
  })

  it('sin la cabecera se asume grabación real, nunca demo', async () => {
    // El default seguro es el que NO agrega una etiqueta falsa a algo real.
    agentFetch.mockResolvedValue(respuesta(200, 4096, null))
    const out = await montar()
    expect(out.current).toMatchObject({ kind: 'vapi' })
  })

  it('404 dice que no hay grabación', async () => {
    agentFetch.mockResolvedValue(respuesta(404))
    const out = await montar()
    expect(out.current.status).toBe('absent')
  })

  it('502 NO dice que no hay grabación: dice que falló', async () => {
    // Vapi caído o sin credenciales. Decir «no hay» acá sería afirmar que la
    // llamada no se grabó, que es una afirmación sobre la evidencia.
    agentFetch.mockResolvedValue(respuesta(502))
    const out = await montar()
    expect(out.current.status).toBe('failed')
  })

  it('la red caída tampoco es ausencia', async () => {
    agentFetch.mockRejectedValue(new Error('network'))
    const out = await montar()
    expect(out.current.status).toBe('failed')
  })

  it('un cuerpo vacío no cuenta como grabación', async () => {
    // Un blob de 0 bytes montaría un reproductor que no suena nunca.
    agentFetch.mockResolvedValue(respuesta(200, 0))
    const out = await montar()
    expect(out.current.status).toBe('absent')
  })

  it('sin NEXT_PUBLIC_AGENT_URL no inventa una ausencia', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL
    const out = await montar()
    expect(out.current.status).toBe('failed')
    expect(agentFetch).not.toHaveBeenCalled()
  })
})
