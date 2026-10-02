/**
 * Quitar a alguien del equipo del propietario pide confirmación.
 *
 * «Eliminar» sacaba al miembro al primer clic: el back BORRA la membresía
 * (`DELETE /users/me/team/:id`) y esa persona pierde el acceso ya mismo. Un
 * clic de más no puede costar eso. Nico, 02-10: `confirmar({ destructivo })`
 * con un texto que diga qué pasa.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { confirmarMock, removeMock, toastMock } = vi.hoisted(() => ({
  confirmarMock: vi.fn(),
  removeMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/ui/confirmar', () => ({ confirmar: confirmarMock }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k} ${JSON.stringify(vars)}` : k),
    locale: 'es',
  }),
}))
vi.mock('@/lib/hooks/useSettings', () => ({
  useTeamMembers: () => ({
    members: [
      { id: 'm-1', name: 'Laura Gómez', email: 'laura@ejemplo.com', role: 'viewer' },
      { id: 'm-2', email: 'pendiente@ejemplo.com', role: 'contador' },
    ],
    isLoading: false,
    errorCrudo: null,
    refresh: vi.fn(),
    invite: vi.fn(),
    update: vi.fn(),
    remove: removeMock,
  }),
}))

import { TeamManagementSection } from './TeamManagementSection'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  confirmarMock.mockReset()
  removeMock.mockReset()
  toastMock.success.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<TeamManagementSection delay={0} />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const botonesQuitar = () =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].filter(
    (b) => b.textContent === 'landlordSettings.team.remove',
  )

describe('quitar a un miembro del equipo', () => {
  it('🔴 pregunta antes, destructiva, nombrando a quién y diciendo qué pasa', async () => {
    confirmarMock.mockResolvedValue(false)
    await act(async () => botonesQuitar()[0].click())

    expect(confirmarMock).toHaveBeenCalledTimes(1)
    const opciones = confirmarMock.mock.calls[0][0]
    expect(opciones.destructivo).toBe(true)
    expect(opciones.titulo).toContain('landlordSettings.modals.removeMember.title')
    expect(opciones.titulo).toContain('Laura Gómez')
    expect(opciones.descripcion).toBe('landlordSettings.modals.removeMember.description')
    expect(opciones.accion).toBe('landlordSettings.modals.removeMember.confirm')
  })

  it('🔴 si dice que no, no saca a nadie', async () => {
    confirmarMock.mockResolvedValue(false)
    await act(async () => botonesQuitar()[0].click())
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('si dice que sí, lo saca y avisa', async () => {
    confirmarMock.mockResolvedValue(true)
    removeMock.mockResolvedValue(undefined)
    await act(async () => botonesQuitar()[0].click())
    expect(removeMock).toHaveBeenCalledWith('m-1')
    expect(toastMock.success).toHaveBeenCalledWith('landlordSettings.toasts.memberRemoved')
  })

  it('a una invitación pendiente (sin nombre) la nombra por su correo', async () => {
    confirmarMock.mockResolvedValue(false)
    await act(async () => botonesQuitar()[1].click())
    expect(confirmarMock.mock.calls[0][0].titulo).toContain('pendiente@ejemplo.com')
  })
})
