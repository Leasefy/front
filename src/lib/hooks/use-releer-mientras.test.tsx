/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReleerMientras } from './use-releer-mientras'

function Prueba({ activo, leer }: { activo: boolean; leer: () => void }) {
  useReleerMientras(activo, leer, 1000)
  return null
}

describe('useReleerMientras (Firmas se actualiza sola, Nico 30-10-2026)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => vi.useRealTimers())

  it('lee cada intervalo mientras está activo y para al apagarse', () => {
    const leer = vi.fn()
    const caja = document.createElement('div')
    const raiz = createRoot(caja)
    act(() => raiz.render(<Prueba activo leer={leer} />))
    act(() => vi.advanceTimersByTime(3000))
    expect(leer).toHaveBeenCalledTimes(3)
    act(() => raiz.render(<Prueba activo={false} leer={leer} />))
    act(() => vi.advanceTimersByTime(5000))
    expect(leer).toHaveBeenCalledTimes(3)
    act(() => raiz.unmount())
  })

  it('con la pestaña oculta no lee', () => {
    const leer = vi.fn()
    const visibilidad = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const raiz = createRoot(document.createElement('div'))
    act(() => raiz.render(<Prueba activo leer={leer} />))
    act(() => vi.advanceTimersByTime(3000))
    expect(leer).not.toHaveBeenCalled()
    visibilidad.mockRestore()
    act(() => raiz.unmount())
  })
})
