/**
 * La vista previa de un contrato MIGRADO no es un error.
 *
 * Esos contratos se cargaron desde el archivo de la inmobiliaria, ya firmados
 * en papel: no tienen HTML ni PDF en Leasefy. El back respondía 400 «Contract
 * HTML not generated» y cada pantalla lo adivinaba por el texto; el portal del
 * inquilino ni siquiera lo adivinaba y se quedaba cargando para siempre. Desde
 * el 2026-09-16 el back responde 200 `{ origin: 'SIN_DOCUMENTO' }`.
 *
 * `esContratoSinDocumento` se usa REAL (no un doble): el camino del back viejo
 * depende justo de esa regla.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { api } = vi.hoisted(() => ({
  api: { getPreview: vi.fn() },
}))

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return { ...real, contractsApi: api }
})

import { useContractPreview } from './useContracts'
import { ApiError } from '@/lib/api/client'

let vista: ReturnType<typeof useContractPreview>
function Sonda() {
  vista = useContractPreview('c-1')
  return null
}

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  api.getPreview.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function montar() {
  await act(async () => {
    raiz.render(<Sonda />)
  })
}

describe('useContractPreview — el contrato sin documento', () => {
  it('🔴 el estado SIN_DOCUMENTO del back es `sinDocumento`, sin error', async () => {
    api.getPreview.mockResolvedValue({ origin: 'SIN_DOCUMENTO', motivo: 'MIGRADO' })

    await montar()

    expect(vista.sinDocumento).toBe(true)
    expect(vista.error).toBeNull()
    expect(vista.errorCrudo).toBeNull()
    expect(vista.preview).toEqual({ origin: 'SIN_DOCUMENTO', motivo: 'MIGRADO' })
    expect(vista.isLoading).toBe(false)
  })

  it('un contrato con documento no es `sinDocumento`', async () => {
    api.getPreview.mockResolvedValue({ origin: 'GENERATED', html: '<p>Contrato</p>' })

    await montar()

    expect(vista.sinDocumento).toBe(false)
    expect(vista.preview?.origin).toBe('GENERATED')
  })

  it('con un back sin desplegar, el 400 viejo se sigue leyendo como `sinDocumento`', async () => {
    api.getPreview.mockRejectedValue(new ApiError(400, 'Contract HTML not generated'))

    await montar()

    expect(vista.sinDocumento).toBe(true)
    expect(vista.errorCrudo).toBeNull()
  })

  it('el 400 de un contrato GENERADO sin HTML sí es un fallo', async () => {
    const fallo = new ApiError(
      400,
      'El documento de este contrato no se generó.',
      'DOCUMENTO_NO_GENERADO',
    )
    api.getPreview.mockRejectedValue(fallo)

    await montar()

    expect(vista.sinDocumento).toBe(false)
    expect(vista.errorCrudo).toBe(fallo)
  })
})
