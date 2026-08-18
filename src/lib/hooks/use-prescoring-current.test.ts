/**
 * use-prescoring-current.test.ts
 *
 * Protege dos cosas que no son obvias leyendo el hook:
 *  · un 404 (todavía no hay orden) NO es un `error` — es `sin_estudio`, el
 *    estado que enseña el camino. Ver `aprobacion.service.ts` para el mismo
 *    criterio en el flujo viejo.
 *  · `estado` sale siempre de `mapEstadoPreScoring`, nunca de un cálculo
 *    propio del hook — así el mapeo se testea una sola vez, en
 *    `prescoring.types.test.ts`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const mockGet = vi.fn()

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      msg: string,
    ) {
      super(msg)
      this.name = 'ApiError'
    }
  },
}))

import { usePreScoringCurrent } from './use-prescoring-current'
import { ApiError } from '@/lib/api/client'

let container: HTMLDivElement
let root: Root

type Hook = ReturnType<typeof usePreScoringCurrent>

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function Sonda() {
    latest = usePreScoringCurrent()
    return null
  }
  act(() => {
    root.render(React.createElement(Sonda))
  })
  return { get: () => latest as Hook }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockGet.mockReset()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('usePreScoringCurrent', () => {
  it('pide GET /pre-scoring/current y mapea el estado', async () => {
    mockGet.mockResolvedValue({
      order: { status: 'PAID' },
      evaluation: { status: 'started' },
    })

    const hook = renderHook()
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockGet).toHaveBeenCalledWith('/pre-scoring/current')
    expect(hook.get().estado).toBe('en_proceso')
    expect(hook.get().isLoading).toBe(false)
    expect(hook.get().error).toBeNull()
    expect(hook.get().current?.order?.status).toBe('PAID')
  })

  it('un 404 (todavía sin orden) no es un error: sin_estudio', async () => {
    mockGet.mockRejectedValue(new ApiError(404, 'not found'))

    const hook = renderHook()
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().estado).toBe('sin_estudio')
    expect(hook.get().error).toBeNull()
    expect(hook.get().current).toBeNull()
  })

  it('un fallo real de red sí es un error, y no inventa un estado aprobado', async () => {
    mockGet.mockRejectedValue(new Error('offline'))

    const hook = renderHook()
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().error).not.toBeNull()
    expect(hook.get().estado).toBe('sin_estudio')
  })

  it('mapea aprobado cuando hay al menos un carrier viable', async () => {
    mockGet.mockResolvedValue({
      order: { status: 'STUDY_STARTED' },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Fianly', viable: true, prima_mensual_cop: 45000 }],
          fianly: { maxEntrenchmentValue: 2_400_000 },
          bureau: {},
        },
      },
    })

    const hook = renderHook()
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().estado).toBe('aprobado')
    expect(hook.get().current?.evaluation?.result?.fianly.maxEntrenchmentValue).toBe(2_400_000)
  })

  it('refetch vuelve a pedir el endpoint', async () => {
    mockGet.mockResolvedValue({ order: { status: 'PENDING_PAYMENT' } })

    const hook = renderHook()
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockGet).toHaveBeenCalledTimes(1)

    await act(async () => {
      hook.get().refetch()
      await Promise.resolve()
    })
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  /*
   * El contrato pide polear mientras el estudio esté EN PROCESO y cortar al
   * llegar a un estado terminal. El criterio de "en curso" sale del estado
   * mapeado (`en_proceso`), no de `order.status` suelto: el back puede dejar la
   * orden en `STUDY_STARTED` con la evaluación ya `completed` (ver test del
   * bug), y en ese caso ya hay resultado y no hay nada que esperar. El
   * intervalo es de 5 min (mínimo que pidió producto), no de segundos.
   */
  describe('polling', () => {
    const POLL_MS = 300_000

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('re-fetchea cada 5 min mientras el estudio está en proceso', async () => {
      mockGet.mockResolvedValue({ order: { status: 'STUDY_STARTED' } })

      renderHook()
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGet).toHaveBeenCalledTimes(1)

      // Antes de los 5 min no vuelve a pedir.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS - 1_000)
      })
      expect(mockGet).toHaveBeenCalledTimes(1)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      expect(mockGet).toHaveBeenCalledTimes(2)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS)
      })
      expect(mockGet).toHaveBeenCalledTimes(3)
    })

    it('deja de polear al llegar a COMPLETED', async () => {
      mockGet
        .mockResolvedValueOnce({ order: { status: 'STUDY_STARTED' } })
        .mockResolvedValueOnce({
          order: { status: 'COMPLETED' },
          evaluation: { status: 'completed', result: { carriers: [], fianly: {}, bureau: {} } },
        })

      const hook = renderHook()
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(hook.get().estado).toBe('en_proceso')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS)
      })
      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(hook.get().estado).toBe('rechazado')

      // Ya es terminal: no debería volver a pedir el endpoint.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS * 2)
      })
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    /*
     * El bug reportado: el back dejó la orden en `STUDY_STARTED` pero la
     * evaluación ya está `completed` (con resultado). El estado mapeado ya es
     * terminal (`rechazado`/`aprobado`), así que NO hay que seguir poleando —
     * aunque `order.status` no diga `COMPLETED`.
     */
    it('deja de polear cuando la evaluación quedó completed aunque la orden siga STUDY_STARTED', async () => {
      mockGet.mockResolvedValue({
        order: { status: 'STUDY_STARTED' },
        evaluation: {
          status: 'completed',
          result: { carriers: [{ name: 'fianly', viable: false }], fianly: {}, bureau: {} },
        },
      })

      const hook = renderHook()
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(hook.get().estado).toBe('rechazado')

      // Terminal desde la primera carga: el timer no debe volver a pedir nunca.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS * 3)
      })
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    /*
     * El flash de "recarga": un refresco de polling NO debe volver a poner
     * `isLoading` en true, porque la página muestra un spinner a pantalla
     * completa mientras `isLoading` — se veía como si la app se recargara.
     * Sólo la primera carga muestra spinner.
     */
    it('un refresco de polling no vuelve a poner isLoading en true', async () => {
      mockGet.mockResolvedValue({ order: { status: 'STUDY_STARTED' } })

      const hook = renderHook()
      // Primera carga: isLoading arranca en true.
      expect(hook.get().isLoading).toBe(true)
      await act(async () => {
        await Promise.resolve()
      })
      expect(hook.get().isLoading).toBe(false)

      // El poll refresca en background sin tocar isLoading.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS)
      })
      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(hook.get().isLoading).toBe(false)
    })

    it('no polea cuando no hay orden (sin_estudio)', async () => {
      mockGet.mockRejectedValue(new ApiError(404, 'not found'))

      renderHook()
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGet).toHaveBeenCalledTimes(1)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS * 2)
      })
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('no dispara fetches solapados si uno está en vuelo', async () => {
      let resolveFirst: (v: unknown) => void = () => {}
      mockGet
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve
            }),
        )
        .mockResolvedValue({ order: { status: 'STUDY_STARTED' } })

      renderHook()
      // Todavía no resuelve la primera llamada.
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGet).toHaveBeenCalledTimes(1)

      // El timer dispara mientras la primera sigue en vuelo: no debe sumar otra.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS)
      })
      expect(mockGet).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveFirst({ order: { status: 'STUDY_STARTED' } })
        await Promise.resolve()
        await Promise.resolve()
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS)
      })
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })
})
