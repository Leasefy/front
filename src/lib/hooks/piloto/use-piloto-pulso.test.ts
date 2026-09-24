/**
 * 🔴 Auditoría del Piloto (23-09-2026, hallazgo 4): la tarjeta gris del pulso
 * podía quedarse PARA SIEMPRE: cada poll (30 s) abortaba la petición en
 * vuelo y, mientras no hubiera cargado una vez, `isLoading` seguía en true.
 * Con un pulso que tarda más de 30 s, nunca terminaba. Lo que se fija:
 *   · un poll con una lectura en vuelo NO la cancela: se salta;
 *   · si no contesta a tiempo, es un error (con reintento), no un gris eterno.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'AGY' }, user: null, isAuthenticated: true, isLoading: false }),
}))

const fetchPulso = vi.fn()
vi.mock('@/lib/api/piloto', () => ({
  fetchPilotoPulso: (...a: unknown[]) => fetchPulso(...a),
}))

import { usePilotoPulso } from './use-piloto-pulso'

let resultado: ReturnType<typeof usePilotoPulso> | undefined
function Prueba() {
  resultado = usePilotoPulso()
  return null
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro')
  fetchPulso.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('usePilotoPulso', () => {
  it('un poll con una lectura en vuelo NO la cancela: se salta', async () => {
    const senales: AbortSignal[] = []
    fetchPulso.mockImplementation((_id: string, signal: AbortSignal) => {
      senales.push(signal)
      return new Promise(() => {}) // el micro tarda más de 30 s
    })
    await act(async () => root.render(React.createElement(Prueba)))
    expect(fetchPulso).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(31_000)
    })
    // Sin esto el poll abortaba la primera y el esqueleto no terminaba nunca.
    expect(fetchPulso).toHaveBeenCalledTimes(1)
    expect(senales[0]!.aborted).toBe(false)
    expect(resultado?.isLoading).toBe(true)
  })

  it('si no contesta a tiempo, deja de cargar y queda el error (con reintento)', async () => {
    fetchPulso.mockRejectedValue(new Error('timeout: el Piloto no contestó a tiempo'))
    await act(async () => root.render(React.createElement(Prueba)))
    expect(resultado?.isLoading).toBe(false)
    expect(resultado?.error).toMatch(/timeout/)
    fetchPulso.mockResolvedValue({ data: { estado: 'ok' }, notAvailable: false })
    await act(async () => {
      await resultado?.refetch()
    })
    expect(resultado?.error).toBeNull()
  })

  it('🔴 un re-montaje (StrictMode de React, o volver a la pantalla) SÍ vuelve a pedir el pulso', async () => {
    // Visto en el navegador el 24-09: el esqueleto duraba 37 s. El desmontaje
    // abortaba la lectura pero la dejaba marcada «en vuelo», y el montaje
    // siguiente se la saltaba: el pulso llegaba recién con el poll de 30 s.
    const senales: AbortSignal[] = []
    fetchPulso.mockImplementation((_id: string, signal: AbortSignal) => {
      senales.push(signal)
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('abortada', 'AbortError')))
        setTimeout(() => resolve({ data: { estado: 'ok' }, notAvailable: false }), 2_000)
      })
    })
    await act(async () =>
      root.render(React.createElement(React.StrictMode, null, React.createElement(Prueba))),
    )
    // StrictMode monta, desmonta y vuelve a montar: la primera se aborta y la segunda sale.
    expect(fetchPulso).toHaveBeenCalledTimes(2)
    expect(senales[0]!.aborted).toBe(true)
    expect(senales[1]!.aborted).toBe(false)
    await act(async () => {
      vi.advanceTimersByTime(2_100)
    })
    expect(resultado?.isLoading).toBe(false)
    expect(resultado?.data).toEqual({ estado: 'ok' })
  })
})
