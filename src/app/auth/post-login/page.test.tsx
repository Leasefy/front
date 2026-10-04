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

const { replaceMock, authState, barra } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  barra: { query: '' },
  authState: {
    user: null as Record<string, unknown> | null,
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    perfilElegido: null as string | null,
    mfaRequired: false,
    mfaEnrollRequired: false,
    mfaCheckStatus: undefined as 'pending' | 'verified' | 'failed' | undefined,
    retryMfaCheck: vi.fn().mockResolvedValue(undefined),
    agencyRole: null as string | null,
    agencyMembershipChecked: true,
    hasActiveAgencyMembership: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(barra.query),
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
  authState.mfaRequired = false
  authState.mfaEnrollRequired = false
  authState.mfaCheckStatus = undefined
  barra.query = ''
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

describe('post-login — T-0099: MFA gate first, enroll-pending before verify-pending', () => {
  it('mfaEnrollRequired=true → /auth/mfa-enroll, ahead of the onboarding/role checks', async () => {
    authState.user = { role: 'agency', onboardingCompleted: true }
    authState.isAuthenticated = true
    authState.mfaEnrollRequired = true
    authState.mfaRequired = false

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-enroll')
  })

  it('mfaRequired=true (has a factor, aal1) → /auth/mfa-verify', async () => {
    authState.user = { role: 'agency', onboardingCompleted: true }
    authState.isAuthenticated = true
    authState.mfaRequired = true
    authState.mfaEnrollRequired = false

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })
})

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

describe('post-login — el segundo factor conserva el destino (QA 23-09)', () => {
  it('con segundo factor pendiente, /auth/mfa-verify lleva el returnUrl', async () => {
    authState.mfaRequired = true
    barra.query = 'returnUrl=%2Fpanel%2Finmobiliaria%2Fdispersiones%2Flotes%2Fabc'

    await render()

    expect(replaceMock).toHaveBeenCalledWith(
      '/auth/mfa-verify?returnUrl=%2Fpanel%2Finmobiliaria%2Fdispersiones%2Flotes%2Fabc',
    )
  })
})

describe('post-login — sin el veredicto del segundo factor no se navega (Nico, 02-10-2026)', () => {
  it('«failed»: no va al panel ni al onboarding; muestra «No pudimos confirmar tu sesión»', async () => {
    authState.user = { role: 'agency', onboardingCompleted: true }
    authState.isAuthenticated = true
    authState.mfaCheckStatus = 'failed'

    await render()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
  })

  it('«pending»: espera, sin navegar', async () => {
    authState.user = { role: 'agency', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.mfaCheckStatus = 'pending'

    await render()

    expect(replaceMock).not.toHaveBeenCalled()
  })
})


describe('post-login — BU-06 (04-10-2026): la asesora no pasa por el selector de perfil', () => {
  afterEach(() => {
    authState.hasActiveAgencyMembership = false
    authState.agencyRole = null
  })

  it('miembro activo de una inmobiliaria sin onboarding personal → su panel, nunca /onboarding/seleccionar-rol', async () => {
    authState.user = { role: 'agency', backendRole: 'AGENT', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.hasActiveAgencyMembership = true
    authState.agencyRole = 'AGENTE'

    await render()

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock.mock.calls[0][0]).toMatch(/^\/panel\/inmobiliaria/)
  })

  it('sin membresía activa sigue yendo al onboarding (nada cambia para los demás)', async () => {
    authState.user = { role: 'agency', backendRole: 'AGENT', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.hasActiveAgencyMembership = false

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })
})
