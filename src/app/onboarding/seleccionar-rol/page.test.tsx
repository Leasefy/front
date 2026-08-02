/**
 * seleccionar-rol — defense-in-depth: an invited user must NEVER see the
 * personal role picker. A pending invitation token on mount → redirect to
 * /registro (the invite name/phone form + atomic join).
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
    hasActiveAgencyMembership: false,
    agencyMembershipChecked: true,
    agencyRole: null as string | null,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: authState.user,
    hasActiveAgencyMembership: authState.hasActiveAgencyMembership,
    agencyMembershipChecked: authState.agencyMembershipChecked,
    agencyRole: authState.agencyRole,
  }),
}))

import SeleccionarRolPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  replaceMock.mockClear()
  authState.user = null
  authState.hasActiveAgencyMembership = false
  authState.agencyMembershipChecked = true
  authState.agencyRole = null
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
    root.render(<SeleccionarRolPage />)
  })
}

describe('SeleccionarRolPage — invitation guard', () => {
  it('redirects to /registro when a pending invitation token is present (picker never shown)', async () => {
    localStorage.setItem('pending-invitation-token', 'tok-123')

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/registro')
    // The role picker must not render.
    expect(container.textContent).not.toContain('Inquilino')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('renders the picker normally when there is no pending token', async () => {
    await render()

    expect(replaceMock).not.toHaveBeenCalledWith('/registro')
    expect(container.textContent).toContain('Inquilino')
  })

  it('redirects an ACTIVE agency member to the agency panel (never the picker)', async () => {
    authState.hasActiveAgencyMembership = true

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('redirects an ACTIVE agency member to their per-sub-role landing route (CONTADOR → cobros)', async () => {
    authState.hasActiveAgencyMembership = true
    authState.agencyRole = 'CONTADOR'

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/cobros')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('waits (no picker, no redirect) while the agency-membership probe is unsettled for a logged-in user', async () => {
    // A freshly-authenticated user (e.g. an invited CONTADOR) whose membership
    // probe has not resolved yet must NOT flash the personal role picker.
    authState.user = { name: 'Ana', onboardingCompleted: false }
    authState.agencyMembershipChecked = false

    await render()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('Inquilino')
    expect(container.textContent).not.toContain('Propietario')
  })
})
