import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { AsistentePendienteGuard } from './AsistentePendienteGuard'

const { routerReplace, getOnboardingResumePoint, resumeOnboarding, authState } = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  getOnboardingResumePoint: vi.fn(),
  resumeOnboarding: vi.fn(),
  authState: { user: { id: 'u1' } as { id: string } | null },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: authState.user }),
}))
vi.mock('@/lib/api/onboarding-provisioning.service', () => ({
  getOnboardingResumePoint,
}))
vi.mock('@/lib/api/onboarding-session.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/onboarding-session.service')>()),
  resumeOnboarding,
}))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  routerReplace.mockReset()
  getOnboardingResumePoint.mockReset()
  resumeOnboarding.mockReset()
  authState.user = { id: 'u1' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(<AsistentePendienteGuard />)
    await new Promise((r) => setTimeout(r, 0))
  })
}

function puntoDeRetorno(sobre: Record<string, unknown> = {}) {
  return {
    agentSessionId: null,
    tenantId: null,
    provisioningStatus: null,
    legalName: null,
    nit: null,
    onboardingCompleted: true,
    ...sobre,
  }
}

describe('<AsistentePendienteGuard>', () => {
  it('🔴 con el asistente a medias devuelve al asistente (el bug del 30-09: volver a entrar aterrizaba en el panel)', async () => {
    getOnboardingResumePoint.mockResolvedValue(
      puntoDeRetorno({ agentSessionId: 'ses-1', provisioningStatus: 'ACTIVE' }),
    )
    resumeOnboarding.mockResolvedValue({
      sessionId: 'ses-1',
      currentStep: 'members',
      nextStep: 'habeas_data',
      draft: {},
    })

    await montar()

    expect(resumeOnboarding).toHaveBeenCalledWith('ses-1')
    expect(routerReplace).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    // Un veredicto «a medias» NO se cachea: al volver se vuelve a preguntar.
    expect(localStorage.getItem('leasefy-asistente-listo:u1')).toBeNull()
  })

  it('🔴 con el asistente TERMINADO (currentStep «complete») no toca a nadie y cachea el veredicto', async () => {
    getOnboardingResumePoint.mockResolvedValue(
      puntoDeRetorno({ agentSessionId: 'ses-1', provisioningStatus: 'ACTIVE' }),
    )
    // En el micro, aceptar Habeas Data finaliza la sesión y deja el cursor en
    // «complete»; /resume responde 200 también para sesiones completadas.
    resumeOnboarding.mockResolvedValue({
      sessionId: 'ses-1',
      currentStep: 'complete',
      nextStep: null,
      draft: {},
    })

    await montar()

    expect(routerReplace).not.toHaveBeenCalled()
    expect(localStorage.getItem('leasefy-asistente-listo:u1')).toBe('1')
  })

  it('un miembro invitado (sin sesión del asistente) no se toca y se cachea', async () => {
    getOnboardingResumePoint.mockResolvedValue(puntoDeRetorno())

    await montar()

    expect(resumeOnboarding).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(localStorage.getItem('leasefy-asistente-listo:u1')).toBe('1')
  })

  it('con el veredicto cacheado no pregunta nada', async () => {
    localStorage.setItem('leasefy-asistente-listo:u1', '1')

    await montar()

    expect(getOnboardingResumePoint).not.toHaveBeenCalled()
    expect(resumeOnboarding).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('un fallo del micro (red, 404 de sesión limpiada…) es fail-open: ni expulsa ni cachea', async () => {
    getOnboardingResumePoint.mockResolvedValue(
      puntoDeRetorno({ agentSessionId: 'ses-1', provisioningStatus: 'ACTIVE' }),
    )
    resumeOnboarding.mockRejectedValue(new Error('sin red'))

    await montar()

    expect(routerReplace).not.toHaveBeenCalled()
    expect(localStorage.getItem('leasefy-asistente-listo:u1')).toBeNull()
  })

  it('el traspaso al micro caído (ACTIVE sin sesión) no expulsa y NO cachea: puede repararse', async () => {
    getOnboardingResumePoint.mockResolvedValue(puntoDeRetorno({ provisioningStatus: 'ACTIVE' }))

    await montar()

    expect(routerReplace).not.toHaveBeenCalled()
    expect(localStorage.getItem('leasefy-asistente-listo:u1')).toBeNull()
  })
})
