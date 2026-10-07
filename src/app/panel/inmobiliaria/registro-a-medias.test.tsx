/**
 * 🔴 El panel con el registro de la inmobiliaria A MEDIAS, con el
 * `AsistentePendienteGuard` y la escena del segundo factor DE VERDAD.
 *
 * Nico, 01-10-2026: «nos llevó luego de un rato a esta pantalla, literal
 * ingresó a la plataforma» — `/panel/inmobiliaria/piloto` con «Protege tu
 * cuenta» encima y la agencia («Periquito company LTDA») recién creada en
 * «Antes de comenzar», con el traspaso al micro FAILED y sin sesión del
 * asistente. El guard era un hermano que no redirigía en ese caso y, en
 * cualquier caso, la escena del 2FA se montaba antes de que él respondiera.
 *
 * El orden es: registro → migración → segundo factor → recorrido. Con el
 * registro a medias no se ve ni el panel ni el segundo factor: se va a
 * `/onboarding/inmobiliaria`.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, authState, getOnboardingResumePoint, resumeOnboarding } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getOnboardingResumePoint: vi.fn(),
  resumeOnboarding: vi.fn(),
  authState: {
    user: { id: 'u1', role: 'agency', onboardingCompleted: true } as Record<string, unknown>,
    isAuthenticated: true,
    isLoading: false,
    mfaRequired: false,
    // El peor caso: el contexto ya pide el segundo factor.
    mfaEnrollRequired: true,
    needsOnboarding: false,
    perfilElegido: null,
    agencyRole: 'ADMIN',
    hasActiveAgencyMembership: true,
    agencyMembershipChecked: true,
    agency: { id: 'ag-1', name: 'Periquito company LTDA' },
    refreshUser: vi.fn(),
    signOut: vi.fn(),
    setMfaVerified: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/piloto',
}))
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))
vi.mock('@/components/auth/AgencySubscriptionGuard', () => ({
  AgencySubscriptionGuard: () => <div data-testid="panel-montado" />,
}))
vi.mock('@/components/auth/ActivarSegundoFactorPasoAPaso', () => ({
  ActivarSegundoFactorPasoAPaso: () => <h1 data-testid="paso-a-paso">Activa tu segundo factor</h1>,
}))
vi.mock('@/lib/api/onboarding-provisioning.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/onboarding-provisioning.service')>()),
  getOnboardingResumePoint,
}))
vi.mock('@/lib/api/onboarding-session.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/onboarding-session.service')>()),
  resumeOnboarding,
}))

import InmobiliariaLayout from './layout'

let container: HTMLDivElement
let root: Root

async function entrar() {
  await act(async () => {
    root.render(
      <InmobiliariaLayout>
        <div data-testid="pagina">página</div>
      </InmobiliariaLayout>,
    )
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

const hay = (id: string) => document.querySelector(`[data-testid="${id}"]`) !== null

function punto(sobre: Record<string, unknown>) {
  return {
    agentSessionId: null,
    tenantId: 'ag-1',
    provisioningStatus: 'ACTIVE',
    legalName: 'Periquito company LTDA',
    nit: '900',
    onboardingCompleted: true,
    ...sobre,
  }
}

beforeEach(() => {
  localStorage.clear()
  authState.mfaEnrollRequired = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('Panel de la inmobiliaria con el registro a medias', () => {
  it.each([
    ['FAILED sin sesión (la captura del 01-10)', { provisioningStatus: 'FAILED' }],
    ['PENDING sin sesión', { provisioningStatus: 'PENDING' }],
    ['ACTIVE sin sesión', { provisioningStatus: 'ACTIVE' }],
  ])('%s: va al asistente, sin 2FA ni panel', async (_caso, sobre) => {
    getOnboardingResumePoint.mockResolvedValue(punto(sobre))

    await entrar()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(hay('paso-a-paso')).toBe(false)
    expect(hay('panel-montado')).toBe(false)
  })

  it('con la sesión del asistente en «Habeas Data»: va al asistente, sin 2FA ni panel', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto({ agentSessionId: 'ses-1' }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-1', currentStep: 'habeas_data', nextStep: 'complete', draft: {} })

    await entrar()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(hay('panel-montado')).toBe(false)
  })

  it('mientras se pregunta, el 2FA no se asoma (la carrera)', async () => {
    getOnboardingResumePoint.mockReturnValue(new Promise(() => {}))

    await entrar()

    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(hay('panel-montado')).toBe(false)
    expect(hay('asistente-pendiente-verificando')).toBe(true)
  })

  it('con el registro TERMINADO, recién ahí el segundo factor dentro del panel', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto({ agentSessionId: 'ses-1' }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-1', currentStep: 'complete', nextStep: null, draft: {} })

    await entrar()

    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
  })

  it('un invitado con membresía ACTIVA en una agencia con el registro terminado ve su panel', async () => {
    authState.mfaEnrollRequired = false
    authState.agencyRole = 'AGENTE'
    getOnboardingResumePoint.mockResolvedValue(punto({ agentSessionId: 'ses-dueno' }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-dueno', currentStep: 'complete', nextStep: null, draft: {} })

    await entrar()

    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(hay('panel-montado')).toBe(true)
    authState.agencyRole = 'ADMIN'
  })
})
