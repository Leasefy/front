import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * El veredicto del registro NO le pregunta al asistente del micro por el
 * registro de otra persona (ARREGLOS-2, 03-10-2026): el micro sólo le contesta
 * a quien registró la inmobiliaria (`sub === startedByUserId`) y al contador o
 * a la asesora invitados les respondía 403 en cada pantalla.
 */

const { getOnboardingResumePoint, resumeOnboarding } = vi.hoisted(() => ({
  getOnboardingResumePoint: vi.fn(),
  resumeOnboarding: vi.fn(),
}))

vi.mock('@/lib/api/onboarding-provisioning.service', () => ({ getOnboardingResumePoint }))
vi.mock('@/lib/api/onboarding-session.service', () => ({ resumeOnboarding }))

import { preguntarPorElRegistro } from './registro-de-la-inmobiliaria'

function punto(sobre: Record<string, unknown> = {}) {
  return {
    agentSessionId: 'ses-1',
    tenantId: 'agencia-1',
    provisioningStatus: 'ACTIVE',
    legalName: 'Inmobiliaria Laboratorio S.A.S.',
    nit: '900123456',
    onboardingCompleted: true,
    ...sobre,
  }
}

beforeEach(() => {
  getOnboardingResumePoint.mockReset()
  resumeOnboarding.mockReset()
})

describe('preguntarPorElRegistro — sólo a quien registró la inmobiliaria', () => {
  it('un miembro que no la registró NO pide el resume del micro y pasa (sin-agencia)', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto({ esQuienLaRegistro: false }))

    await expect(preguntarPorElRegistro()).resolves.toBe('sin-agencia')
    expect(resumeOnboarding).not.toHaveBeenCalled()
  })

  it('la fundadora sí pregunta, y con el asistente terminado es «terminado»', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto({ esQuienLaRegistro: true }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-1', currentStep: 'complete', draft: {} })

    await expect(preguntarPorElRegistro()).resolves.toBe('terminado')
    expect(resumeOnboarding).toHaveBeenCalledWith('ses-1')
  })

  it('la fundadora con el asistente a medias sigue yendo al asistente', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto({ esQuienLaRegistro: true }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-1', currentStep: 'members', draft: {} })

    await expect(preguntarPorElRegistro()).resolves.toBe('a-medias')
  })

  it('un back anterior (sin el campo) o sin fundador conocido pregunta como siempre', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto())
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-1', currentStep: 'complete', draft: {} })
    await expect(preguntarPorElRegistro()).resolves.toBe('terminado')
    expect(resumeOnboarding).toHaveBeenCalledTimes(1)

    getOnboardingResumePoint.mockResolvedValue(punto({ esQuienLaRegistro: null }))
    await expect(preguntarPorElRegistro()).resolves.toBe('terminado')
    expect(resumeOnboarding).toHaveBeenCalledTimes(2)
  })

  it('un traspaso a medias sigue siendo «a-medias» aunque no la haya registrado (como antes)', async () => {
    getOnboardingResumePoint.mockResolvedValue(
      punto({ esQuienLaRegistro: false, provisioningStatus: 'PENDING' }),
    )

    await expect(preguntarPorElRegistro()).resolves.toBe('a-medias')
    expect(resumeOnboarding).not.toHaveBeenCalled()
  })
})
