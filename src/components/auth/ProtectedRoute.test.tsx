/**
 * ProtectedRoute — agency-panel admission with allowAgencyMembers.
 *
 * A dual-context TENANT with an ACTIVE agency membership is admitted; while the
 * membership probe is pending the gate HOLDS (spinner, no redirect); an
 * invited-only / non-member is redirected (no infinite hold); a pure-agency
 * user passes via role.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, refreshUserMock, authState } = vi.hoisted(() => {
  const refreshUserMock = vi.fn().mockResolvedValue(undefined)
  return {
    replaceMock: vi.fn(),
    refreshUserMock,
    authState: {
      user: null as Record<string, unknown> | null,
      isAuthenticated: true,
      isLoading: false,
      mfaRequired: false,
      needsOnboarding: false,
      perfilElegido: null as string | null,
      agencyRole: null as string | null,
      hasActiveAgencyMembership: false,
      agencyMembershipChecked: true,
      refreshUser: refreshUserMock,
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria',
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))

import { ProtectedRoute } from './ProtectedRoute'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  replaceMock.mockClear()
  refreshUserMock.mockClear()
  authState.user = null
  authState.isAuthenticated = true
  authState.isLoading = false
  authState.mfaRequired = false
  authState.needsOnboarding = false
  authState.perfilElegido = null
  authState.agencyRole = null
  authState.hasActiveAgencyMembership = false
  authState.agencyMembershipChecked = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function renderPanel() {
  await act(async () => {
    root.render(
      <ProtectedRoute allowedRoles={['agency']} allowAgencyMembers>
        <div data-testid="panel-child">panel</div>
      </ProtectedRoute>,
    )
  })
  // Flush the storage-check effect + the main gate effect.
  await act(async () => {
    await Promise.resolve()
  })
}

const childMounted = () => container.querySelector('[data-testid="panel-child"]') !== null

describe('ProtectedRoute — agency panel (allowAgencyMembers)', () => {
  it('admits a dual-context TENANT with an ACTIVE membership', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = true
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('HOLDS (neutral "Verificando acceso" spinner, no redirect) while the membership probe is pending', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = false // probe not settled yet

    await renderPanel()

    // Not admitted, but NOT redirected either — the gate waits.
    expect(childMounted()).toBe(false)
    expect(replaceMock).not.toHaveBeenCalled()
    // The copy must NOT lie: it's checking, not redirecting.
    expect(container.textContent).toContain('Verificando acceso...')
    expect(container.textContent).not.toContain('Redirigiendo...')
  })

  it('REDIRECTS an invited-only / non-member TENANT once the probe settled (shows redirect copy)', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
    // Redirect is imminent → redirect copy.
    expect(container.textContent).toContain('Redirigiendo...')
    expect(container.textContent).not.toContain('Verificando acceso...')
  })

  it('admits a pure-agency user via role (membership signal irrelevant)', async () => {
    authState.user = { id: 'u2', role: 'agency', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = false

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })
})

/*
 * 🔴 Nico, 2026-09-11: «¿por qué me envió para inquilinos y no para
 * inmobiliaria?». Se le había caído el back. Sin `/users/me`, auth-context
 * fabrica un usuario de la sesión de Supabase con un rol que nadie confirmó
 * (`profileSource: 'session'`), y este gate lo leía como un hecho.
 */
describe('ProtectedRoute — un perfil degradado NUNCA expulsa', () => {
  it('con el back caído se queda en el panel: no redirige al portal del inquilino', async () => {
    authState.user = { role: 'tenant', profileSource: 'session', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true
    await renderPanel()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(childMounted()).toBe(false)
    // Y dice la verdad en vez de un «Redirigiendo...» que no va a llegar.
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
    expect(container.querySelector('[data-testid="reintentar-perfil"]')).toBeTruthy()
  })

  it('«Reintentar ahora» vuelve a pedir el perfil', async () => {
    authState.user = { role: 'tenant', profileSource: 'session', onboardingCompleted: true }
    await renderPanel()

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="reintentar-perfil"]')!.click()
      await Promise.resolve()
    })
    expect(refreshUserMock).toHaveBeenCalled()
  })

  it('un perfil REAL sin permiso sí se redirige — el arreglo no abre la puerta', async () => {
    authState.user = { role: 'tenant', profileSource: 'backend', onboardingCompleted: true }
    authState.agencyMembershipChecked = true
    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
  })
})

describe('ProtectedRoute — invited NEW user (needsOnboarding)', () => {
  it('with a pending invitation token → redirects to /registro, NOT the role picker', async () => {
    // needsOnboarding ⟹ user null ⟹ isAuthenticated false (auth invariant).
    authState.user = null
    authState.isAuthenticated = false
    authState.needsOnboarding = true
    localStorage.setItem('pending-invitation-token', 'tok-123')

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/registro')
    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('without a token → redirects to /onboarding/seleccionar-rol (unchanged)', async () => {
    authState.user = null
    authState.isAuthenticated = false
    authState.needsOnboarding = true
    // no pending-invitation-token

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
    expect(replaceMock).not.toHaveBeenCalledWith('/registro')
  })

  it('sin token pero con perfil ya elegido → retoma en el onboarding de ese perfil, no en el selector', async () => {
    authState.user = null
    authState.isAuthenticated = false
    authState.needsOnboarding = true
    authState.perfilElegido = 'agency'

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('con registro pero onboarding sin terminar y perfil elegido → el onboarding de ese perfil', async () => {
    authState.user = { role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.perfilElegido = 'tenant'

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })
})

describe('ProtectedRoute — incomplete onboarding vs active agency membership', () => {
  it('active-membership TENANT with incomplete onboarding is NOT funneled to seleccionar-rol (renders the agency panel)', async () => {
    // On /panel/inmobiliaria (the mocked pathname): the effect returns without
    // redirecting (already there) and the render guard exempts them.
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.needsOnboarding = false
    authState.hasActiveAgencyMembership = true
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
    expect(childMounted()).toBe(true)
  })

  it('no-membership TENANT with incomplete onboarding IS sent to seleccionar-rol (unchanged)', async () => {
    authState.user = { id: 'u2', role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.needsOnboarding = false
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('pure-agency user is unaffected by the onboarding gate (isAgencyUser skip)', async () => {
    authState.user = { id: 'u3', role: 'agency', backendRole: 'AGENT', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.needsOnboarding = false
    authState.hasActiveAgencyMembership = false

    await renderPanel()

    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
    expect(childMounted()).toBe(true)
  })
})
