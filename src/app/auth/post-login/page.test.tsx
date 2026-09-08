/**
 * post-login — a dónde va quien entra con Google (o vuelve del enlace) según
 * su estado. Lo que importa acá: con el onboarding sin terminar retoma en el
 * onboarding del perfil que ya eligió, y sólo cae al selector si nunca eligió.
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
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    perfilElegido: null as string | null,
    mfaRequired: false,
    agencyRole: null as string | null,
    agencyMembershipChecked: true,
    hasActiveAgencyMembership: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))

import PostLoginPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  replaceMock.mockClear()
  authState.user = null
  authState.isAuthenticated = false
  authState.needsOnboarding = false
  authState.perfilElegido = null
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
    root.render(<PostLoginPage />)
  })
}

describe('post-login — retomar donde lo dejó', () => {
  it('sin registro en el back y sin perfil elegido → el selector', async () => {
    authState.needsOnboarding = true

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('sin registro en el back pero con perfil elegido → el onboarding de ese perfil', async () => {
    authState.needsOnboarding = true
    authState.perfilElegido = 'tenant'

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inquilino')
    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('onboarding sin terminar y perfil «inmobiliaria» elegido → su onboarding, no el selector', async () => {
    authState.user = { role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.perfilElegido = 'agency'

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
  })

  it('onboarding sin terminar y sin perfil elegido → el selector', async () => {
    authState.user = { role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('onboarding terminado → su panel, aunque tenga un perfil elegido guardado', async () => {
    authState.user = { role: 'tenant', onboardingCompleted: true }
    authState.isAuthenticated = true
    authState.perfilElegido = 'agency'

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
  })
})
