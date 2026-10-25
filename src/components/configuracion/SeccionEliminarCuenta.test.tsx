import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ signOut: vi.fn() }) }))
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/settings.service', () => ({ settingsApi: { deleteAccount: vi.fn() } }))
// La cáscara pinta título, descripción, cuerpo y el pie (`footer`), donde van
// los botones desde que es el `Dialog` de la plataforma (02-10-2026).
vi.mock('@/components/settings/SettingsModal', () => ({
  SettingsModal: ({
    open,
    title,
    description,
    variant,
    children,
    footer,
  }: {
    open: boolean
    title: string
    description?: React.ReactNode
    variant?: string
    children: React.ReactNode
    footer?: React.ReactNode
  }) =>
    open ? (
      <div data-testid="modal" data-variant={variant}>
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
        <div>{footer}</div>
      </div>
    ) : null,
}))

import { SeccionEliminarCuenta } from './SeccionEliminarCuenta'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const boton = () => container.querySelector<HTMLButtonElement>('[data-testid="abrir-eliminar-cuenta"]')!

describe('SeccionEliminarCuenta', () => {
  it('con un bloqueo dice por qué y no deja abrir el borrado', async () => {
    await act(async () => root.render(<SeccionEliminarCuenta bloqueo="Tienes 2 arriendo(s) activo(s)." />))
    expect(boton().disabled).toBe(true)
    expect(container.querySelector('[data-testid="bloqueo-eliminar-cuenta"]')?.textContent).toContain('2 arriendo')
  })

  it('la tarjeta dice lo que pasa de verdad: se desactiva y se cierran las sesiones, no se borra nada', async () => {
    await act(async () => root.render(<SeccionEliminarCuenta />))
    expect(container.textContent).toContain('se cierran tus sesiones')
    expect(container.textContent).toContain('quedan registrados')
    expect(container.textContent).not.toMatch(/serán eliminad/i)
  })

  it('sin bloqueo abre la confirmación, que pide escribir ELIMINAR', async () => {
    await act(async () => root.render(<SeccionEliminarCuenta />))
    expect(boton().disabled).toBe(false)
    await act(async () => boton().click())
    const modal = container.querySelector('[data-testid="modal"]')
    expect(modal?.textContent).toContain('ELIMINAR')
    // Destructiva, y dice qué se pierde y cómo se recupera (30 días).
    expect(modal?.getAttribute('data-variant')).toBe('destructive')
    expect(modal?.textContent).toContain('30 días')
    const confirmar = [...modal!.querySelectorAll('button')].find((b) => b.textContent?.includes('Eliminar'))
    expect(confirmar?.disabled).toBe(true)
  })

  /*
   * Ronda 30 (decisión de Nico, 23-10): la baja vive SÓLO en Configuración. Lo que cuidaban las pruebas del diálogo
   * que había en Mi perfil (inquilino y propietario) se prueba aquí, donde vive ahora.
   */
  const escribir = (valor: string) => {
    const input = container.querySelector<HTMLInputElement>('#confirmar-eliminar-cuenta')!
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const elBotonRojo = () =>
    [...container.querySelector('[data-testid="modal"]')!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Eliminar'),
    )!

  it('el botón rojo sólo se habilita con la palabra exacta', async () => {
    await act(async () => root.render(<SeccionEliminarCuenta />))
    await act(async () => boton().click())
    escribir('eliminar')
    expect(elBotonRojo().disabled).toBe(true)
    escribir('ELIMINAR')
    expect(elBotonRojo().disabled).toBe(false)
  })

  it('si el back no la deja, dice por qué y la confirmación sigue abierta', async () => {
    const { settingsApi } = await import('@/lib/api/settings.service')
    const { toast } = await import('@/components/ui/toast')
    vi.mocked(settingsApi.deleteAccount).mockRejectedValueOnce(new Error('Tienes un arriendo activo.'))
    await act(async () => root.render(<SeccionEliminarCuenta />))
    await act(async () => boton().click())
    escribir('ELIMINAR')
    await act(async () => elBotonRojo().click())
    expect(vi.mocked(toast.error)).toHaveBeenCalled()
    expect(container.querySelector('[data-testid="modal"]')).not.toBeNull()
  })
})
