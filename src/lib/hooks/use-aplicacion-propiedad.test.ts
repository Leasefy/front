/**
 * use-aplicacion-propiedad — encuentra la postulación ACTIVA del inquilino para
 * una propiedad. Lo que se protege:
 *  · matchea por propertyId Y por status activo (no una WITHDRAWN vieja)
 *  · sin sesión no consulta (un anónimo no tiene postulaciones)
 *  · un fallo de red no bloquea: devuelve `activa: null` y el back valida
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { getTokenMock, getMineStatusesMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  getMineStatusesMock: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => getTokenMock(),
}))

vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: { getMineStatuses: () => getMineStatusesMock() },
}))

import { useAplicacionParaPropiedad } from './use-aplicacion-propiedad'

let container: HTMLDivElement
let root: Root

type Hook = ReturnType<typeof useAplicacionParaPropiedad>

function renderHook(propertyId: string): { get: () => Hook } {
  let latest: Hook | null = null
  function Sonda() {
    latest = useAplicacionParaPropiedad(propertyId)
    return null
  }
  act(() => {
    root.render(React.createElement(Sonda))
  })
  return { get: () => latest as Hook }
}

beforeEach(() => {
  getTokenMock.mockReset()
  getMineStatusesMock.mockReset()
  getTokenMock.mockReturnValue('token-abc')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('useAplicacionParaPropiedad', () => {
  it('encuentra la postulación activa de esa propiedad', async () => {
    getMineStatusesMock.mockResolvedValue([
      { id: 'app-1', propertyId: 'prop-X', status: 'UNDER_REVIEW' },
      { id: 'app-2', propertyId: 'prop-Y', status: 'APPROVED' },
    ])

    const hook = renderHook('prop-X')
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().activa).toEqual({ id: 'app-1', status: 'UNDER_REVIEW' })
    expect(hook.get().cargando).toBe(false)
  })

  it('ignora una postulación retirada (WITHDRAWN) de la misma propiedad', async () => {
    getMineStatusesMock.mockResolvedValue([
      { id: 'app-1', propertyId: 'prop-X', status: 'WITHDRAWN' },
    ])

    const hook = renderHook('prop-X')
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().activa).toBeNull()
  })

  it('no matchea una postulación activa de OTRA propiedad', async () => {
    getMineStatusesMock.mockResolvedValue([
      { id: 'app-1', propertyId: 'prop-Y', status: 'UNDER_REVIEW' },
    ])

    const hook = renderHook('prop-X')
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().activa).toBeNull()
  })

  it('sin sesión no consulta el endpoint', async () => {
    getTokenMock.mockReturnValue(null)

    const hook = renderHook('prop-X')
    await act(async () => {
      await Promise.resolve()
    })

    expect(getMineStatusesMock).not.toHaveBeenCalled()
    expect(hook.get().activa).toBeNull()
    expect(hook.get().cargando).toBe(false)
  })

  it('un fallo de red no bloquea: activa null', async () => {
    getMineStatusesMock.mockRejectedValue(new Error('offline'))

    const hook = renderHook('prop-X')
    await act(async () => {
      await Promise.resolve()
    })

    expect(hook.get().activa).toBeNull()
    expect(hook.get().cargando).toBe(false)
  })
})
