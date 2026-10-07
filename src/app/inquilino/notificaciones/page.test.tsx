/**
 * Notificaciones del inquilino: marcar y borrar (02-10-2026, sistema de
 * errores). Antes, cualquier fallo decía el mismo texto fijo; ahora pasa por
 * el traductor: un 4xx dice qué pasó, un 5xx que fue nuestro (con la
 * referencia) y «conexión» sólo si no hubo respuesta.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { markAllMock, toastError } = vi.hoisted(() => ({
  markAllMock: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatRelativeDate: () => 'hace un momento' }),
}))
vi.mock('@/lib/hooks/useNotifications', () => ({
  useTenantNotifications: () => ({
    notifications: [
      {
        id: 'n-1',
        type: 'payment_reminder',
        category: 'payment',
        title: 'Tu pago vence pronto',
        message: 'Recuerda pagar el arriendo.',
        read: false,
        createdAt: '2026-10-01T10:00:00.000Z',
      },
    ],
    unreadCount: 1,
    isLoading: false,
    markAsRead: vi.fn(() => Promise.resolve()),
    markAllAsRead: markAllMock,
    deleteNotification: vi.fn(() => Promise.resolve()),
  }),
}))

import NotificacionesPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  markAllMock.mockReset()
  toastError.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  return Object.assign(new Error(String(cuerpo.message ?? '')), { name: 'ApiError', status, code: cuerpo.code, detalle: cuerpo })
}

async function marcarTodo() {
  await act(async () => root.render(<NotificacionesPage />))
  const boton = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    b.textContent?.includes('Marcar todo'),
  )
  expect(boton, 'no encontré «Marcar todo»').toBeDefined()
  await act(async () => boton!.click())
}

describe('Notificaciones del inquilino — fallos al marcar', () => {
  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    markAllMock.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await marcarTodo()
    const texto = String(toastError.mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos marcar las notificaciones como leídas: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('un 4xx dice lo que mandó el back', async () => {
    markAllMock.mockRejectedValue(errorDelBack(403, { code: 'SIN_PERMISO', message: 'No tienes permiso para esto.' }))
    await marcarTodo()
    expect(toastError).toHaveBeenCalledWith('No tienes permiso para esto.')
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    markAllMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await marcarTodo()
    expect(String(toastError.mock.calls[0][0])).toMatch(/conexión/)
  })
})
