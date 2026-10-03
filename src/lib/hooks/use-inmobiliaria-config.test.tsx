/**
 * 🔴 ARREGLOS-4 (03-10-2026) · `useInmobiliariaConfig(false)` no pide nada.
 *
 * El layout del panel la pedía para todo miembro y el back la cierra con
 * `configuracion:view`: un 403 en cada pantalla del contador y de la asesora.
 * Ahora el layout la pide con `canAccess('configuracion', 'view')`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getConfigOverview = vi.fn()
vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>('@/lib/api/inmobiliaria.service')
  return {
    ...real,
    inmobiliariaConfigApi: { ...real.inmobiliariaConfigApi, getConfigOverview: () => getConfigOverview() },
  }
})

import { useInmobiliariaConfig } from './useInmobiliaria'

type Resultado = ReturnType<typeof useInmobiliariaConfig>

describe('useInmobiliariaConfig', () => {
  let root: Root
  let container: HTMLDivElement
  const result: { current: Resultado | null } = { current: null }

  function Sonda({ activo }: { activo?: boolean }) {
    // Sin `activo`, el valor por defecto; con él, el que se pasa (una sola llamada al hook).
    result.current = useInmobiliariaConfig(...(activo === undefined ? [] : [activo]))
    return null
  }

  async function montar(activo?: boolean) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<Sonda activo={activo} />)
    })
  }

  beforeEach(() => {
    getConfigOverview.mockReset()
    getConfigOverview.mockResolvedValue({ agency: { name: 'Inmobiliaria Lab' } })
    result.current = null
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('por defecto la pide, como siempre', async () => {
    await montar()
    expect(getConfigOverview).toHaveBeenCalledTimes(1)
    expect(result.current?.config).toEqual({ agency: { name: 'Inmobiliaria Lab' } })
  })

  it('🔴 sin permiso (activo = false) no la pide y no queda cargando', async () => {
    await montar(false)
    expect(getConfigOverview).not.toHaveBeenCalled()
    expect(result.current?.config).toBeNull()
    expect(result.current?.isLoading).toBe(false)
  })

  it('cuando el permiso llega (false → true), la pide', async () => {
    await montar(false)
    await act(async () => {
      root.render(<Sonda activo />)
    })
    expect(getConfigOverview).toHaveBeenCalledTimes(1)
  })
})
