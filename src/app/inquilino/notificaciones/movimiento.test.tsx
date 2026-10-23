/**
 * Notificaciones del inquilino — el movimiento que cambia lo que se ve
 * (ola F, MOV-A5, 03-10-2026):
 *
 * - borrar una notificación la SACA (con la salida del sistema) y las demás
 *   se quedan;
 * - la marca del filtro activo es UNA sola y se va al filtro elegido (un
 *   `MotionIndicator` que se desliza, no un fondo que salta);
 * - el «sin leer» del filtro cuenta hacia el número nuevo al marcar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatRelativeDate: () => 'hace un momento' }),
}))

// Un hook con estado de verdad: borrar y marcar cambian la lista que se pinta.
vi.mock('@/lib/hooks/useNotifications', async () => {
  const React = await import('react')
  const iniciales = [
    {
      id: 'n-1',
      type: 'payment_reminder',
      category: 'payment',
      title: 'Tu pago vence pronto',
      message: 'Recuerda pagar el arriendo.',
      read: false,
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'n-2',
      type: 'application_update',
      category: 'application',
      title: 'Tu postulación avanzó',
      message: 'La inmobiliaria la está revisando.',
      read: false,
      createdAt: '2026-10-01T09:00:00.000Z',
    },
  ]
  return {
    useTenantNotifications: () => {
      const [lista, setLista] = React.useState(iniciales)
      return {
        notifications: lista,
        unreadCount: lista.filter((n) => !n.read).length,
        isLoading: false,
        markAsRead: (id: string) => {
          setLista((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)))
          return Promise.resolve()
        },
        markAllAsRead: () => {
          setLista((l) => l.map((n) => ({ ...n, read: true })))
          return Promise.resolve()
        },
        deleteNotification: (id: string) => {
          setLista((l) => l.filter((n) => n.id !== id))
          return Promise.resolve()
        },
      }
    },
  }
})

import NotificacionesPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(<NotificacionesPage />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const boton = (texto: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(texto))

describe('Notificaciones del inquilino — movimiento', () => {
  it('borrar una notificación la saca de la lista y las demás se quedan', async () => {
    expect(container.textContent).toContain('Tu pago vence pronto')
    const borrar = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Eliminar"]')[0]
    await act(async () => borrar.click())
    await vi.waitFor(() => expect(container.textContent).not.toContain('Tu pago vence pronto'))
    expect(container.textContent).toContain('Tu postulación avanzó')
  })

  // Glow up r26 (revisora r25): los filtros son las pestañas de estado de la casa (PestanasDeEstado), como en el
  // portal del propietario; la marca del activo es su `aria-pressed`, una sola, y se va al filtro elegido.
  it('la marca del filtro activo es una sola y se va al filtro elegido', async () => {
    const marcas = () => container.querySelectorAll('[role="group"] button[aria-pressed="true"]')
    expect(marcas()).toHaveLength(1)
    expect(marcas()[0]).toBe(boton('Todas'))

    await act(async () => boton('Sin leer')!.click())

    expect(marcas()).toHaveLength(1)
    expect(marcas()[0]).toBe(boton('Sin leer'))
  })

  it('el «sin leer» del filtro cuenta hacia el número nuevo al marcar una como leída', async () => {
    expect(boton('Sin leer')!.textContent).toContain('2')
    const marcar = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Marcar como leído"]')[0]
    await act(async () => marcar.click())
    await vi.waitFor(() => expect(boton('Sin leer')!.textContent).toContain('1'))
  })

  it('ocultar las leídas se puede deshacer (antes se escondían sin forma de volver a verlas)', async () => {
    const marcar = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Marcar como leído"]')[0]
    await act(async () => marcar.click())
    await act(async () => boton('Ocultar las leídas')!.click())
    await vi.waitFor(() => expect(container.textContent).not.toContain('Tu pago vence pronto'))
    await act(async () => boton('Mostrar las leídas')!.click())
    await vi.waitFor(() => expect(container.textContent).toContain('Tu pago vence pronto'))
  })

  it('la no leída lleva su punto, sin caja de color ni fila teñida', () => {
    expect(container.querySelectorAll('span.bg-primary.rounded-full[aria-hidden="true"]')).toHaveLength(2)
    expect(container.innerHTML).not.toContain('#EEF1FF')
    expect(container.innerHTML).not.toContain('#1A40FF')
  })
})
