import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getAllCandidatesMock = vi.fn()
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: { getAllCandidates: () => getAllCandidatesMock() },
}))

import { usePostulacionesPendientes } from './use-postulaciones-pendientes'

type Resultado = ReturnType<typeof usePostulacionesPendientes>

describe('usePostulacionesPendientes', () => {
  let root: Root
  let container: HTMLDivElement
  const result: { current: Resultado | null } = { current: null }

  function Sonda() {
    result.current = usePostulacionesPendientes()
    return null
  }

  async function montar() {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<Sonda />)
    })
  }

  beforeEach(() => {
    getAllCandidatesMock.mockReset()
    result.current = null
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('devuelve el pendiente que manda el backend, no uno calculado acá', async () => {
    getAllCandidatesMock.mockResolvedValue({
      candidates: [],
      total: 9,
      stats: { total: 9, pending: 3, approved: 5, rejected: 1 },
    })
    await montar()
    expect(result.current?.pendientes).toBe(3)
  })

  it('si falla NO devuelve cero: devuelve «no sabemos»', async () => {
    // Un cero afirmaría «no hay nadie esperando», que es justo lo que no
    // sabemos. Sin dato, el menú no dice nada.
    getAllCandidatesMock.mockRejectedValue(new Error('boom'))
    await montar()
    expect(result.current?.pendientes).toBeUndefined()
  })

  it('un backend sin stats tampoco inventa un número', async () => {
    getAllCandidatesMock.mockResolvedValue({ candidates: [], total: 0 })
    await montar()
    expect(result.current?.pendientes).toBeUndefined()
  })

  it('cero es una respuesta, y se devuelve como cero', async () => {
    // Distinto de `undefined`: acá SÍ sabemos que no hay nadie. Que el globo
    // no se dibuje en cero es decisión de quien lo pinta, no del hook.
    getAllCandidatesMock.mockResolvedValue({
      candidates: [],
      total: 0,
      stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
    })
    await montar()
    expect(result.current?.pendientes).toBe(0)
  })
})
