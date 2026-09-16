/**
 * G1 — Las «notificaciones fantasma».
 *
 * `useNotificationSettings` arranca en `DEFAULT_SETTINGS` y, si el GET fallaba,
 * se quedaba ahí sin decir nada: la sección pintaba «Pagos recibidos:
 * activado» sobre algo que nadie sabía si estaba activado. Mover una perilla
 * encima de eso era escribir sobre un estado inventado.
 *
 * Ahora el fallo se cuenta (con su reintento) y las perillas sólo aparecen con
 * lo que el back devolvió.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
}))

vi.mock('@/lib/api/settings.service', () => ({
  settingsApi: {
    getNotificationSettings: h.getNotificationSettings,
    updateNotificationSettings: h.updateNotificationSettings,
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { SeccionNotificaciones } from './SeccionNotificaciones'

/** Lo que guardó el back: distinto de los de fábrica a propósito. */
const GUARDADO = {
  emailApplications: false,
  emailVisits: true,
  emailContracts: true,
  emailPayments: false,
  emailMessages: true,
  emailMarketing: true,
  pushAll: false,
  pushUrgent: true,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  h.getNotificationSettings.mockReset()
  h.updateNotificationSettings.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(<SeccionNotificaciones />)
  })
  // El GET resuelve en un microtask posterior al montaje.
  await act(async () => {
    await Promise.resolve()
  })
}

const perillas = () => [...container.querySelectorAll('[role="switch"]')]

describe('SeccionNotificaciones — nunca los valores de fábrica como si fueran lo guardado', () => {
  it('si no se pudo leer lo guardado, no hay perillas: se dice que no se pudo', async () => {
    h.getNotificationSettings.mockRejectedValue(new ApiError(500, 'Internal server error'))
    await render()

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(perillas()).toHaveLength(0)
  })

  it('reintentar vuelve a pedir y, si llega, pinta lo que el back devolvió', async () => {
    h.getNotificationSettings
      .mockRejectedValueOnce(new ApiError(0, 'fetch failed'))
      .mockResolvedValueOnce(GUARDADO)
    await render()

    const reintentar = container.querySelector<HTMLButtonElement>('[data-testid="reintentar"]')
    expect(reintentar).not.toBeNull()
    await act(async () => {
      reintentar!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(h.getNotificationSettings).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(perillas()).toHaveLength(5)
  })

  it('con la lectura bien, cada perilla muestra lo guardado, no lo de fábrica', async () => {
    h.getNotificationSettings.mockResolvedValue(GUARDADO)
    await render()

    const [aplicaciones, pagos] = perillas()
    // De fábrica las dos vienen activadas; lo guardado las tiene apagadas.
    expect(aplicaciones!.getAttribute('aria-checked')).toBe('false')
    expect(pagos!.getAttribute('aria-checked')).toBe('false')
  })
})
