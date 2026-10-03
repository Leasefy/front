/**
 * use-agent-work-items.test.ts — workspace follow-ups (abortable fetch).
 *
 * Race regression: switching agency (or rapid refetch) while a slow response
 * is in flight must NOT let the stale response overwrite the fresh one.
 *
 * Pattern under test (shared by ALL src/lib/hooks/ai/* hooks):
 *   - each fetchData aborts the previous AbortController
 *   - a completed-but-aborted fetch sets NO state (data/error/isLoading)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-race' } }),
}))

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: Record<string, string>) => ({ ...extra }),
}))

import { useAgentWorkItems } from './use-agent-work-items'
import { ApiError } from '@/lib/api/client'
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function jsonResponse(items: Array<{ id: string }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ items, total: items.length }),
  }
}

describe('useAgentWorkItems — abortable fetch (stale-response race)', () => {
  it('slow-then-fast: the second fetch wins; the aborted slow response sets nothing', async () => {
    const slow = deferred<ReturnType<typeof jsonResponse>>()
    const fast = deferred<ReturnType<typeof jsonResponse>>()

    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(slow.promise)
      .mockReturnValueOnce(fast.promise)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    let hookResult: ReturnType<typeof useAgentWorkItems> | null = null

    function TestComponent() {
      hookResult = useAgentWorkItems('conciliacion')
      return null
    }

    await act(async () => {
      root.render(React.createElement(TestComponent))
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Kick a second fetch while the first is still in flight.
    await act(async () => {
      void hookResult!.refetch()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The first request's signal must have been aborted by the second fetch.
    const firstSignal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal
    const secondSignal = (fetchMock.mock.calls[1][1] as RequestInit).signal as AbortSignal
    expect(firstSignal.aborted).toBe(true)
    expect(secondSignal.aborted).toBe(false)

    // Fast (second) response arrives first → it wins.
    await act(async () => {
      fast.resolve(jsonResponse([{ id: 'fresh' }]))
      await Promise.resolve()
    })
    expect(hookResult!.items).toEqual([{ id: 'fresh' }])
    expect(hookResult!.total).toBe(1)
    expect(hookResult!.isLoading).toBe(false)

    // Slow (first, aborted) response arrives late → sets NOTHING.
    await act(async () => {
      slow.resolve(jsonResponse([{ id: 'stale-a' }, { id: 'stale-b' }]))
      await Promise.resolve()
    })
    expect(hookResult!.items).toEqual([{ id: 'fresh' }])
    expect(hookResult!.total).toBe(1)
    expect(hookResult!.error).toBeNull()
    expect(hookResult!.isLoading).toBe(false)
  })

  it('a rejected aborted fetch sets no error state', async () => {
    const slow = deferred<never>()
    const fast = deferred<ReturnType<typeof jsonResponse>>()

    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        // Simulate a real fetch: reject with AbortError when the signal aborts.
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
          void slow.promise
        })
      })
      .mockReturnValueOnce(fast.promise)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    let hookResult: ReturnType<typeof useAgentWorkItems> | null = null

    function TestComponent() {
      hookResult = useAgentWorkItems('conciliacion')
      return null
    }

    await act(async () => {
      root.render(React.createElement(TestComponent))
    })

    await act(async () => {
      void hookResult!.refetch()
    })

    await act(async () => {
      fast.resolve(jsonResponse([{ id: 'fresh' }]))
      await Promise.resolve()
    })

    expect(hookResult!.items).toEqual([{ id: 'fresh' }])
    // The AbortError from the cancelled first fetch must NOT surface as error.
    expect(hookResult!.error).toBeNull()
    // Ni en `errorCrudo`. Esta línea faltaba y por eso el test pasaba con el
    // bug puesto: `setErrorCrudo(err)` corría ANTES del guard de cancelación,
    // así que la Sala de Pagos pintaba «No pudimos cargar esto» con su
    // referencia aunque los datos llegaran bien un instante después. Visto en
    // la pantalla real: dos pedidos abortados por el doble montaje de React y
    // el tercero con 200.
    expect(hookResult!.errorCrudo).toBeNull()
    expect(hookResult!.isLoading).toBe(false)
  })
})

/*
 * Tanda 2 de errores (02-10-2026): `runAction` devolvía `{ ok: false, error:
 * '403' }` (o el código del micro) y las pantallas lo pintaban tal cual.
 * Ahora conserva `error` y agrega `fallo`, el error entero para el traductor.
 */
describe('useAgentWorkItems — runAction no se traga el error', () => {
  const ACCION: WorkItemAction = {
    id: 'reject',
    label: 'Rechazar',
    kind: 'danger',
    method: 'POST',
    path: '/api/agency/agency-race/conciliacion/queue/m-1/reject',
    requiresReason: true,
  }

  async function montarConAccion(respuestaDeLaAccion: () => Promise<unknown>) {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([])) // la lectura de la cola al montar
      .mockImplementationOnce(respuestaDeLaAccion)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    let hook: ReturnType<typeof useAgentWorkItems> | null = null
    function TestComponent() {
      hook = useAgentWorkItems('conciliacion')
      return null
    }
    await act(async () => {
      root.render(React.createElement(TestComponent))
    })
    let r: Awaited<ReturnType<ReturnType<typeof useAgentWorkItems>['runAction']>> | null = null
    await act(async () => {
      r = await hook!.runAction({} as WorkItem, ACCION, { reason: 'x' })
    })
    return r!
  }

  it('un 400 del sobre trae `fallo` con sus `campos` (y `error` se conserva)', async () => {
    const r = await montarConAccion(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['Escribe el motivo del rechazo.'],
        campos: [{ campo: 'reason', regla: 'requerido', mensaje: 'Escribe el motivo del rechazo.' }],
        success: false,
        error: { name: 'ZodError', issues: [] },
      }),
    }))
    expect(r.ok).toBe(false)
    expect(r.fallo).toBeInstanceOf(ApiError)
    expect((r.fallo as ApiError).status).toBe(400)
    expect(camposDelError(r.fallo)).toEqual([
      { campo: 'reason', regla: 'requerido', mensaje: 'Escribe el motivo del rechazo.' },
    ])
    // Compatibilidad: `error` sigue siendo un texto (el status, porque el
    // `error` del cuerpo viejo no era un texto).
    expect(r.error).toBe('400')
  })

  it('un 5xx: `fallo` dice «de nuestro lado» con la referencia del micro', async () => {
    const r = await montarConAccion(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error', requestId: '12345678-abcd' }),
    }))
    const texto = mensajeParaLaPersona(r.fallo, { accion: 'rechazar' })
    expect(texto).toContain('No pudimos rechazar: algo falló de nuestro lado')
    expect(texto).toContain('12345678')
    expect(r.error).toBe('Internal Server Error')
  })

  it('sin internet, un `fetch` que ni salió llega TAL CUAL (status 0 = conexión), no como un texto fijo', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      const red = new TypeError('Failed to fetch')
      const r = await montarConAccion(async () => {
        throw red
      })
      expect(r.fallo).toBe(red)
      expect(mensajeParaLaPersona(r.fallo)).toMatch(/conexión/)
      expect(r.error).toBe('Failed to fetch')
    } finally {
      enLinea.mockRestore()
    }
  })

  it('🔴 ARREGLOS-4 · con el micro caído y el back sano, la acción dice que el asistente no está disponible', async () => {
    const r = await montarConAccion(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(r.fallo).toBeInstanceOf(ApiError)
    const texto = mensajeParaLaPersona(r.fallo)
    expect(texto).toMatch(/asistente de Leasefy no está disponible/)
    expect(texto).not.toMatch(/conexi[oó]n/i)
  })
})

