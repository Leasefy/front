import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const estadoDeLoteMock = vi.fn()
vi.mock('@/lib/api/inmuebles-importacion.service', () => ({
  inmueblesImportacionApi: { estadoDeLote: (lote: string) => estadoDeLoteMock(lote) },
}))

import { useEstadoDeLoteInmuebles } from './use-estado-de-lote-inmuebles'

type Resultado = ReturnType<typeof useEstadoDeLoteInmuebles>

/**
 * Same polling contract as `use-estado-de-lote.ts` (contracts precedent):
 * 3s cadence while ENCOLADO/PROCESANDO, 10-minute ceiling, then falls back
 * to the `PROPERTY_IMPORT_COMPLETED` notification. A convenience while the
 * tab stays open — never the completion mechanism, since the batch is
 * durable server-side (WU-4).
 */
describe('useEstadoDeLoteInmuebles', () => {
  let root: Root
  let container: HTMLDivElement
  const result: { current: Resultado | null } = { current: null }

  function Sonda({ lote }: { lote: string | null }) {
    result.current = useEstadoDeLoteInmuebles(lote)
    return null
  }

  async function montar(lote: string | null) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<Sonda lote={lote} />)
    })
  }

  beforeEach(() => {
    estadoDeLoteMock.mockReset()
    result.current = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  function loteBase(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      lote: 'lote-1', estado: 'PROCESANDO', total: 10, procesadas: 3,
      pendientes: 0, listos: 0, activados: 0, descartados: 0,
      jobId: null, error: null, creadoEn: '2026-08-29T00:00:00.000Z',
      ...overrides,
    }
  }

  it('sin lote, no sondea', async () => {
    await montar(null)
    expect(estadoDeLoteMock).not.toHaveBeenCalled()
    expect(result.current?.estado).toBeNull()
  })

  it('sondea de inmediato al recibir un lote', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase())
    await montar('lote-1')
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(1)
    expect(result.current?.estado?.estado).toBe('PROCESANDO')
  })

  it('sigue sondeando cada 3s mientras estado ∈ {ENCOLADO, PROCESANDO}', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase())
    await montar('lote-1')
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(2)

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(3)
  })

  it('deja de sondear apenas el estado es LISTO', async () => {
    estadoDeLoteMock.mockResolvedValueOnce(loteBase())
    estadoDeLoteMock.mockResolvedValueOnce(loteBase({ estado: 'LISTO', procesadas: 10, pendientes: 4, listos: 6 }))
    await montar('lote-1')
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(result.current?.estado?.estado).toBe('LISTO')

    const llamadasTrasListo = estadoDeLoteMock.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(llamadasTrasListo)
  })

  it('deja de sondear apenas el estado es FALLIDO', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase({ estado: 'FALLIDO', error: 'No pudimos preparar la importación.' }))
    await montar('lote-1')
    const llamadas = estadoDeLoteMock.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(llamadas)
  })

  it('un estado desconocido se trata como "seguir esperando", nunca como error', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase({ estado: 'ALGO_NUEVO' }))
    await montar('lote-1')
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(2)
    expect(result.current?.agotado).toBe(false)
  })

  it('deja de sondear al llegar al techo de 10 minutos y marca "agotado"', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase())
    await montar('lote-1')
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000) })
    expect(result.current?.agotado).toBe(true)

    const llamadasEnElTecho = estadoDeLoteMock.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(llamadasEnElTecho)
  })

  it('un error de red transitorio no detiene el sondeo antes del techo', async () => {
    estadoDeLoteMock.mockRejectedValue(new Error('network down'))
    await montar('lote-1')
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(2)
    expect(result.current?.agotado).toBe(false)
  })
})
