import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · Los hooks de visitas no se tragan el error: las acciones lo
 * RELANZAN (antes devolvían `false` y la pantalla decía «Error al …» sin
 * motivo) y la carga lo guarda traducido (antes, `err.message` crudo).
 */

const api = vi.hoisted(() => ({
  getMine: vi.fn(),
  confirm: vi.fn(),
  reject: vi.fn(),
  cancel: vi.fn(),
  reschedule: vi.fn(),
  create: vi.fn(),
}))
vi.mock('@/lib/api/visits.service', () => ({ visitsApi: api }))
vi.mock('./use-refresco-automatico', () => ({ useRefrescoAutomatico: () => undefined }))

import { ApiError } from '@/lib/api/client'
import { useVisits, useVisitActions } from './useVisits'

let container: HTMLDivElement
let root: Root
let visitas: ReturnType<typeof useVisits>
let acciones: ReturnType<typeof useVisitActions>

function Sonda() {
  visitas = useVisits()
  acciones = useVisitActions()
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  for (const fn of Object.values(api)) fn.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  await act(async () => {
    root.render(<Sonda />)
  })
}

describe('useVisits / useVisitActions', () => {
  it('🔴 una acción que falla RELANZA el ApiError (con sus campos) en vez de devolver `false`', async () => {
    api.getMine.mockResolvedValue([])
    const fallo = new ApiError(400, ['Elige una fecha de visita válida.'], 'DATOS_INVALIDOS', {
      campos: [{ campo: 'newDate', regla: 'fecha', mensaje: 'Elige una fecha de visita válida.' }],
    })
    api.reschedule.mockRejectedValue(fallo)
    await montar()

    let lanzado: unknown
    await act(async () => {
      try {
        await acciones.reschedule('v1', { newDate: '2026-13-40', newStartTime: '10:00' })
      } catch (e) {
        lanzado = e
      }
    })
    expect(lanzado).toBe(fallo)
    expect(acciones.isSubmitting).toBe(false)
  })

  it('🔴 un 5xx al cargar queda traducido: de nuestro lado, con la referencia', async () => {
    api.getMine.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    await montar()
    expect(visitas.error).toMatch(/^No pudimos cargar tus visitas: algo falló de nuestro lado/)
    expect(visitas.error).toContain('ab12cd34')
  })

  it('sin respuesta al cargar: la conexión', async () => {
    api.getMine.mockRejectedValue(new TypeError('Failed to fetch'))
    await montar()
    expect(visitas.error).toMatch(/conexión/)
  })
})
