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

const { replaceMock, authState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  authState: {
    user: null as Record<string, unknown> | null,
    isAuthenticated: true,
    isLoading: false,
    mfaRequired: false,
    needsOnboarding: false,
    agencyRole: null as string | null,
    hasActiveAgencyMembership: false,
    agencyMembershipChecked: true,
  },
}))

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
  authState.user = null
  authState.isAuthenticated = true
  authState.isLoading = false
  authState.mfaRequired = false
  authState.needsOnboarding = false
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
})
