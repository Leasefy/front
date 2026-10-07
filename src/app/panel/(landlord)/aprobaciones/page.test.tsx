import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · Aprobar o rechazar una reparación (portal del propietario) con
 * el sistema de errores. Antes el toast llevaba `error.message` crudo (un 5xx
 * decía «Error interno del servidor.»; la red, «Failed to fetch»).
 */

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({ delPortal: vi.fn(), aprobar: vi.fn(), rechazar: vi.fn(), soporte: vi.fn() }))
vi.mock('@/lib/api/aprobaciones-de-reparacion.service', () => ({ aprobacionesDeReparacionApi: api }))

import { ApiError } from '@/lib/api/client'
import AprobarReparacionesPage from './page'

const PENDIENTE = {
  id: 'ap1',
  estado: 'PENDIENTE',
  inmobiliaria: 'Inmobiliaria Uno',
  inmueble: 'Apto 101',
  valorCop: 250_000,
  pedidaAt: '2026-10-01T12:00:00.000Z',
  reparacion: { titulo: 'Cambiar la llave del lavaplatos', descripcion: null },
  cotizacion: null,
}

let container: HTMLDivElement
let root: Root

beforeEach(async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  toast.success.mockClear()
  toast.error.mockClear()
  api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
  api.aprobar.mockReset()
  api.rechazar.mockReset()
  await act(async () => {
    root.render(<AprobarReparacionesPage />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const q = (sel: string) => container.querySelector(sel) as HTMLElement | null

async function clic(sel: string) {
  await act(async () => {
    q(sel)!.click()
    await Promise.resolve()
  })
}

describe('Aprobar reparaciones — errores', () => {
  it('🔴 un 400 en el motivo va bajo el motivo, sin toast', async () => {
    const mensaje = 'El motivo puede tener hasta 2.000 caracteres.'
    api.rechazar.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'motivo', regla: 'longitud_maxima', mensaje }],
      }),
    )
    await clic('[data-testid="aprobacion-rechazar"]')
    await clic('[data-testid="aprobacion-confirmar-rechazo"]')

    expect(q('#motivo-ap1-error')?.textContent).toBe(mensaje)
    expect(q('[data-testid="aprobacion-motivo"]')?.getAttribute('aria-invalid')).toBe('true')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, sin culpar a la conexión', async () => {
    api.aprobar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    await clic('[data-testid="aprobacion-aprobar"]')

    expect(toast.error).toHaveBeenCalledTimes(1)
    const descripcion = String(toast.error.mock.calls[0][1]?.description)
    expect(descripcion).toMatch(/^No pudimos guardar tu aprobación: algo falló de nuestro lado/)
    expect(descripcion).toContain('ab12cd34')
    expect(descripcion).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    api.aprobar.mockRejectedValue(new TypeError('Failed to fetch'))
    await clic('[data-testid="aprobacion-aprobar"]')
    expect(String(toast.error.mock.calls[0][1]?.description)).toMatch(/conexión/)
  })
})
