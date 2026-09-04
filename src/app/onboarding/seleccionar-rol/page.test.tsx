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

// The picker now filters cards by admin-enabled profiles. Mock the hook to keep
// all profiles visible (fail-open default) and avoid a real config fetch.
vi.mock('@/lib/hooks/use-enabled-profiles', () => ({
  useEnabledProfiles: () => ({
    enabled: new Set(['tenant', 'landlord', 'agency']),
    isEnabled: () => true,
    isLoading: false,
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

  // Desde el 2026-08-31 el Piloto automático es el inicio de TODO miembro
  // (`AGENCY_HOME_ROUTE` en role-routes.ts): este test quedó sin actualizar
  // en `feature/cambios-nico` y se alineó al mezclar esa rama.
  it('redirects an ACTIVE agency member to the agency panel (never the picker)', async () => {
    authState.hasActiveAgencyMembership = true

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('un CONTADOR también aterriza en el Piloto: ya no hay ruta por sub-rol', async () => {
    authState.hasActiveAgencyMembership = true
    authState.agencyRole = 'CONTADOR'

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
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


/**
 * Lo seleccionado en el producto es azul primary. Acá había tres bloques
 * copiados y dos de ellos se marcaban en negro (`bg-ink`, `border-fg`); sólo
 * la tarjeta de inmobiliaria usaba el azul. Estos tests fijan que las tres se
 * marquen igual y que exista una salida.
 */
describe('selección de perfil', () => {
  function clickCard(testId: string) {
    const card = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement
    act(() => {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    return card
  }

  it.each(['perfil-tenant', 'perfil-landlord', 'perfil-inmobiliaria'])(
    '%s se marca en azul primary, nunca en negro',
    async (testId) => {
      await render()
      const card = clickCard(testId)

      expect(card.className).toContain('border-primary')
      expect(card.className).toContain('bg-primary-soft')
      expect(card.className).not.toContain('bg-ink')
      expect(card.className).not.toContain('border-fg')
      expect(card.getAttribute('aria-checked')).toBe('true')

      // El check y el azulejo del icono también son primary.
      expect(card.innerHTML).toContain('bg-primary')
      expect(card.innerHTML).not.toContain('bg-ink')
    },
  )

  it('sólo queda una marcada a la vez', async () => {
    await render()
    clickCard('perfil-tenant')
    const inmobiliaria = clickCard('perfil-inmobiliaria')
    const inquilino = container.querySelector('[data-testid="perfil-tenant"]') as HTMLElement

    expect(inmobiliaria.getAttribute('aria-checked')).toBe('true')
    expect(inquilino.getAttribute('aria-checked')).toBe('false')
  })

  it('el botón de continuar arranca deshabilitado y se habilita al elegir', async () => {
    await render()
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement

    expect(boton.disabled).toBe(true)
    clickCard('perfil-tenant')
    expect(boton.disabled).toBe(false)
  })

  it('se puede salir del registro desde acá', async () => {
    await render()
    expect(container.querySelector('[data-testid="salir-del-registro"]')).toBeTruthy()
  })
})
