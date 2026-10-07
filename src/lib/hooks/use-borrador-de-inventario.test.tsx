/**
 * `useBorradorDeInventario` — el error de subida que la barra le muestra a la
 * persona (sistema de errores, tanda 2, 02-10-2026).
 *
 * Antes la barra decía `err.message` crudo: un 5xx se leía «Internal server
 * error» y un fallo de red, «Failed to fetch». Ahora pasa por el traductor:
 * lo que el back explica (4xx), «falló de nuestro lado» con la referencia
 * (5xx), o la conexión si no hubo respuesta. Y el borrador sigue en el
 * teléfono: lo que falló es la subida, no el trabajo.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  borradorGuardado: null as unknown,
  subirBorrador: vi.fn(),
}))

vi.mock('@/lib/inventario/borrador-de-inventario', () => ({
  almacenDeBorradores: () => ({
    leer: async () => h.borradorGuardado,
    guardar: async (b: unknown) => {
      h.borradorGuardado = b
    },
    borrar: async () => {
      h.borradorGuardado = null
    },
  }),
  tienePendientes: () => true,
}))
vi.mock('@/lib/inventario/hay-senal', () => ({ haySenal: async () => true }))
vi.mock('@/lib/inventario/subir-borrador', () => ({
  subirBorrador: (...a: unknown[]) => h.subirBorrador(...a),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: {} }))

import { ApiError } from '@/lib/api/client'
import { useBorradorDeInventario, type EstadoDelBorrador } from './use-borrador-de-inventario'

let host: HTMLDivElement
let root: Root
const estado: { actual: EstadoDelBorrador | null } = { actual: null }

function Sonda() {
  estado.actual = useBorradorDeInventario({
    consignacionId: 'cons-1',
    itemsDelBack: [],
    destino: { subirFoto: async () => 'url', guardar: async () => {} },
  })
  return null
}

beforeEach(async () => {
  h.borradorGuardado = null
  h.subirBorrador.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<Sonda />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function guardarConError(error: unknown) {
  h.subirBorrador.mockRejectedValue(error)
  await act(async () => {
    await estado.actual!.guardarItem({ id: 'it-1', name: 'Puerta' } as never)
  })
  return estado.actual!.errorDeSubida ?? ''
}

describe('useBorradorDeInventario — el error de subida', () => {
  it('🔴 un 5xx dice «de nuestro lado» con la referencia, no «Internal server error»', async () => {
    const dicho = await guardarConError(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
        code: 'ERROR_INTERNO',
        message: 'Internal server error',
        referencia: '9f9f9f9f',
      }),
    )
    expect(dicho).toMatch(/^No pudimos subir el inventario: algo falló de nuestro lado/)
    expect(dicho).toContain('9f9f9f9f')
    expect(dicho).not.toContain('Internal server error')
    // El trabajo sigue en el teléfono.
    expect(h.borradorGuardado).not.toBeNull()
  })

  it('sin respuesta habla de la conexión, no «Failed to fetch»', async () => {
    const dicho = await guardarConError(new TypeError('Failed to fetch'))
    expect(dicho).toMatch(/conexión/)
    expect(dicho).not.toContain('Failed to fetch')
  })

  it('un 400 que explica el back se dice tal cual', async () => {
    const dicho = await guardarConError(
      new ApiError(400, ['El nombre del ítem puede tener hasta 120 caracteres.'], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        message: ['El nombre del ítem puede tener hasta 120 caracteres.'],
        campos: [
          { campo: 'items.0.name', regla: 'longitud_maxima', mensaje: 'El nombre del ítem puede tener hasta 120 caracteres.' },
        ],
      }),
    )
    expect(dicho).toBe('El nombre del ítem puede tener hasta 120 caracteres.')
  })
})
