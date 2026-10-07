/**
 * 02-10-2026 · Armar el contrato desde la plantilla legal: cuando el back
 * falla, la pantalla dice lo que pasó con la regla de oro.
 *
 * Antes cada `catch` hacía `e instanceof Error ? e.message : '…'`: un 5xx
 * salía como «Error interno del servidor.» y nadie sabía si era suyo. Ahora
 * pasa por el traductor: un 5xx dice que falló de nuestro lado, con la
 * referencia; sólo un pedido sin respuesta habla de la conexión; el 400
 * `CONTRATO_NO_VALIDO` sigue dando su lista de motivos.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { api } = vi.hoisted(() => ({
  api: {
    iaDisponible: vi.fn(),
    preparar: vi.fn(),
    generar: vi.fn(),
    redactarConIa: vi.fn(),
  },
}))

vi.mock('@/lib/api/contratos-plantilla.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/contratos-plantilla.service')>(
    '@/lib/api/contratos-plantilla.service',
  )
  return { ...real, contratosPlantillaApi: api }
})

import { ApiError } from '@/lib/api/client'
import { useContratoDesdePlantilla } from './useContratoDesdePlantilla'

type Estado = ReturnType<typeof useContratoDesdePlantilla>

const BORRADOR = { propertyId: 'p-1', canonMensual: 2_500_000 }

const PREPARACION = {
  codigo: 'CONTRATO_VIVIENDA',
  nombre: 'Contrato de arrendamiento de vivienda urbana',
  descripcion: 'Ley 820 de 2003.',
  uso: 'VIVIENDA',
  nombreSugerido: 'Contrato',
  inmueble: { id: 'p-1', titulo: 'Apto', direccion: 'Calle 1' },
  campos: [],
  clausulas: [],
  iaDisponible: true,
  topes: { canonMaximo: null, valorComercialMaximo: null, ipcAno: 2025, ipcValor: 5.2, fuente: 'x' },
}

let contenedor: HTMLDivElement
let raiz: Root
let estado: Estado

function Sonda() {
  estado = useContratoDesdePlantilla(BORRADOR as never, { activo: true })
  return null
}

async function esperar(ms = 500) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

beforeEach(() => {
  api.iaDisponible.mockReset().mockResolvedValue({ iaDisponible: true })
  api.preparar.mockReset().mockResolvedValue(PREPARACION)
  api.generar.mockReset()
  api.redactarConIa.mockReset()
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
  await esperar()
}

describe('useContratoDesdePlantilla — los fallos con la regla de oro', () => {
  it('🔴 generar con un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    api.generar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: '11aa22bb' }),
    )
    await montar()
    await act(async () => {
      await estado.generar()
    })

    expect(estado.errorAlGenerar).toContain('No pudimos generar el contrato: algo falló de nuestro lado.')
    expect(estado.errorAlGenerar).toContain('11aa22bb')
    expect(estado.errorAlGenerar).not.toContain('Error interno')
  })

  it('🔴 generar sin respuesta (status 0) habla de la conexión', async () => {
    api.generar.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await montar()
    await act(async () => {
      await estado.generar()
    })
    expect(estado.errorAlGenerar).toContain('conexión')
  })

  it('el 400 CONTRATO_NO_VALIDO sigue dando la lista de motivos, sin párrafo encima', async () => {
    api.generar.mockRejectedValue(
      new ApiError(400, 'El contrato no es válido.', 'CONTRATO_NO_VALIDO', {
        code: 'CONTRATO_NO_VALIDO',
        motivos: [{ codigo: 'DEPOSITO_EN_DINERO', mensaje: 'La Ley 820 prohíbe el depósito en dinero.', norma: 'Art. 16' }],
      }),
    )
    await montar()
    await act(async () => {
      await estado.generar()
    })
    expect(estado.motivosDeRechazo.length).toBe(1)
    expect(estado.errorAlGenerar).toBeNull()
  })

  it('🔴 preparar con un 5xx no culpa a la conexión', async () => {
    api.preparar.mockReset().mockRejectedValue(
      new ApiError(502, 'Bad Gateway', 'ERROR_INTERNO', { referencia: 'cc33dd44' }),
    )
    await montar()
    expect(estado.errorDePreparacion).toContain('de nuestro lado')
    expect(estado.errorDePreparacion).not.toContain('conexión')
  })
})
