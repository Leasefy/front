import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const lotesAbiertosMock = vi.fn()
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { migracion: { lotesAbiertos: () => lotesAbiertosMock() } },
}))

import { useMigracionesPendientes } from './use-migraciones-pendientes'

type Resultado = ReturnType<typeof useMigracionesPendientes>

/**
 * El "Retomar" de MigrarContratos.tsx era page-local (N10): sólo se veía si
 * ya se había navegado al importador — lo que anula el pedido del owner
 * ("cuando el usuario ingrese le muestre qué hace falta"). Este hook lleva
 * ese conteo a un lugar visible siempre (la nav), siguiendo el precedente de
 * `use-postulaciones-pendientes.ts` (N9): dato del backend, `undefined` (no
 * `0`) si falla, para que un fetch roto no dibuje un cero falso.
 */
describe('useMigracionesPendientes', () => {
  let root: Root
  let container: HTMLDivElement
  const result: { current: Resultado | null } = { current: null }

  function Sonda() {
    result.current = useMigracionesPendientes()
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
    lotesAbiertosMock.mockReset()
    result.current = null
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('suma los pendientes de todos los lotes abiertos', async () => {
    lotesAbiertosMock.mockResolvedValue([
      { lote: 'lote-a', pendientes: 5, listos: 2 },
      { lote: 'lote-b', pendientes: 3, listos: 0 },
    ])
    await montar()
    expect(result.current?.pendientes).toBe(8)
  })

  it('si falla NO devuelve cero: devuelve "no sabemos"', async () => {
    lotesAbiertosMock.mockRejectedValue(new Error('boom'))
    await montar()
    expect(result.current?.pendientes).toBeUndefined()
  })

  it('sin lotes abiertos, el pendiente es cero — y cero SÍ es una respuesta', async () => {
    lotesAbiertosMock.mockResolvedValue([])
    await montar()
    expect(result.current?.pendientes).toBe(0)
  })
})
