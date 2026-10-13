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

import {
  useEstadoDeLoteInmuebles,
  INTERVALO_LENTO_MS,
  TECHO_MS,
} from './use-estado-de-lote-inmuebles'

type Resultado = ReturnType<typeof useEstadoDeLoteInmuebles>

/**
 * Same polling contract as `use-estado-de-lote.ts` (contracts precedent):
 * 3s cadence while ENCOLADO/PROCESANDO, then falls back to the
 * `PROPERTY_IMPORT_COMPLETED` notification. A convenience while the tab stays
 * open — never the completion mechanism, since the batch is durable
 * server-side (WU-4).
 *
 * 🔴 T-0130 (`5409c377`, 01-10-2026) subió el techo de 10 a 30 minutos y
 * espació el sondeo a 8 s tras el primer minuto (la revisión de un lote grande
 * son varios minutos). Esta prueba seguía esperando el techo en 10 minutos.
 */
describe('useEstadoDeLoteInmuebles', () => {
  let root: Root
  let container: HTMLDivElement
  const result: { current: Resultado | null } = { current: null }

  function Sonda({ lote, reinicio = 0 }: { lote: string | null; reinicio?: number }) {
    result.current = useEstadoDeLoteInmuebles(lote, reinicio)
    return null
  }

  async function montar(lote: string | null, reinicio = 0) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<Sonda lote={lote} reinicio={reinicio} />)
    })
  }

  async function remontar(lote: string | null, reinicio: number) {
    await act(async () => {
      root.render(<Sonda lote={lote} reinicio={reinicio} />)
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

  it('T-0152: reiniciar el sondeo (mismo lote) conserva el último estado — el paso no vuelve al 1', async () => {
    estadoDeLoteMock.mockResolvedValueOnce(loteBase({ fase: 'REVISANDO' }))
    await montar('lote-1', 0)
    expect(result.current?.estado?.fase).toBe('REVISANDO')

    // La segunda lectura queda en vuelo: mientras tanto, el estado NO es null.
    let resolver: (v: unknown) => void = () => {}
    estadoDeLoteMock.mockImplementationOnce(() => new Promise((r) => { resolver = r }))
    await remontar('lote-1', 1)
    expect(result.current?.estado?.fase).toBe('REVISANDO')

    await act(async () => { resolver(loteBase({ fase: 'LISTA', estado: 'LISTO' })) })
    expect(result.current?.estado?.fase).toBe('LISTA')
  })

  it('T-0152: otro lote SÍ parte de cero — no se muestra el estado del anterior', async () => {
    estadoDeLoteMock.mockResolvedValueOnce(loteBase({ lote: 'lote-1' }))
    await montar('lote-1', 0)
    expect(result.current?.estado?.lote).toBe('lote-1')

    estadoDeLoteMock.mockImplementationOnce(() => new Promise(() => {}))
    await remontar('lote-2', 0)
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

  it('tras el primer minuto pregunta cada 8 s, no cada 3 s', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase())
    await montar('lote-1')
    // Las preguntas del primer minuto: t = 0, 3, 6 … 60 s (21). La de los
    // 60 s ya agenda la siguiente con la espera larga.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    const llamadasAlMinuto = estadoDeLoteMock.mock.calls.length
    expect(llamadasAlMinuto).toBe(21)

    await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_LENTO_MS - 1) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(llamadasAlMinuto)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(estadoDeLoteMock).toHaveBeenCalledTimes(llamadasAlMinuto + 1)
  })

  it('a los 10 minutos todavía NO se agota: el techo es de 30', async () => {
    estadoDeLoteMock.mockResolvedValue(loteBase())
    await montar('lote-1')
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000) })
    expect(result.current?.agotado).toBe(false)
  })

  it('deja de sondear al llegar al techo de 30 minutos y marca "agotado"', async () => {
    expect(TECHO_MS).toBe(30 * 60_000)
    estadoDeLoteMock.mockResolvedValue(loteBase())
    await montar('lote-1')
    await act(async () => { await vi.advanceTimersByTimeAsync(TECHO_MS + INTERVALO_LENTO_MS) })
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
