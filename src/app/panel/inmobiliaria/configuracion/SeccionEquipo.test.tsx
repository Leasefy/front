/**
 * Equipo: UNA lista de personas y UN formulario de invitación.
 *
 * Antes la misma gente salía en dos pantallas (la pestaña «Usuarios» y
 * «Equipo») y cada una tenía su botón de invitar. Estos tests cuidan que no
 * vuelvan a ser dos, y que el botón sólo esté cuando la persona puede invitar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))

let permisos = { isAdmin: true, canAccess: () => true }
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permisos,
}))

const miembros = [
  { id: 'm1', name: 'Ana Pérez', email: 'ana@agencia.com', role: 'agente', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'm2', name: '', email: 'nuevo@agencia.com', role: 'agente', status: 'invited', createdAt: '2026-01-02T00:00:00Z' },
]

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgencyUsers: () => ({ users: miembros, isLoading: false, errorCrudo: null, refetch: vi.fn() }),
  useAgentes: () => ({ agentes: [], isLoading: false, errorCrudo: null, refetch: vi.fn() }),
  inmobiliariaConfigApi: { inviteUser: vi.fn(), deleteUser: vi.fn() },
}))

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: { resendInvitation: vi.fn() },
  permissionsApi: { updateMemberRole: vi.fn(), updateMemberStatus: vi.fn() },
}))

// El formulario es un diálogo: cerrado no aporta al DOM y complica el render.
vi.mock('@/components/inmobiliaria/AgenteFormModal', () => ({
  AgenteFormModal: () => null,
}))

import { SeccionEquipo } from './SeccionEquipo'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  permisos = { isAdmin: true, canAccess: () => true }
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
    root.render(<SeccionEquipo />)
  })
}

const botonesDeInvitar = () =>
  [...container.querySelectorAll('button')].filter((b) => (b.textContent ?? '').includes('invite'))

describe('sección Equipo', () => {
  it('muestra el padrón: activos e invitaciones sin aceptar, en una sola tabla', async () => {
    await render()
    const tablas = container.querySelectorAll('table')
    expect(tablas).toHaveLength(1)
    expect(container.textContent).toContain('Ana Pérez')
    expect(container.textContent).toContain('nuevo@agencia.com')
  })

  it('hay UN solo botón de invitar', async () => {
    await render()
    expect(botonesDeInvitar()).toHaveLength(1)
  })

  it('sin permiso para crear, no se dibuja el botón (no hay a dónde mandar la invitación)', async () => {
    permisos = { isAdmin: false, canAccess: () => false }
    await render()
    expect(botonesDeInvitar()).toHaveLength(0)
  })

  it('ofrece las tres vistas: el padrón y los dos tableros de desempeño', async () => {
    await render()
    const texto = container.textContent ?? ''
    expect(texto).toContain('miembros')
    expect(texto).toContain('leaderboard')
    expect(texto).toContain('workload')
  })
})
