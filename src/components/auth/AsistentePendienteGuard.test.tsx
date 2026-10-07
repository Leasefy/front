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
vi.mock('@/components/ui/carga-de-marca', () => ({
  CargaDeMarca: () => <span data-testid="carga" />,
}))

const CLAVE = 'leasefy-registro-terminado:u1'

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
    root.render(
      <AsistentePendienteGuard>
        <div data-testid="adentro">el panel y el segundo factor</div>
      </AsistentePendienteGuard>,
    )
    await new Promise((r) => setTimeout(r, 0))
  })
}

const adentro = () => container.querySelector('[data-testid="adentro"]')

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
    expect(adentro()).toBeNull()
    // Un veredicto «a medias» NO se cachea: al volver se vuelve a preguntar.
    expect(localStorage.getItem(CLAVE)).toBeNull()
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
    expect(localStorage.getItem(CLAVE)).toBe('1')
  })

  it('un miembro invitado con membresía ACTIVA (la agencia ya terminó su registro) entra a su panel', async () => {
    // El punto de retorno es el de SU agencia: la sesión del dueño, completa.
    getOnboardingResumePoint.mockResolvedValue(
      puntoDeRetorno({ tenantId: 'ag-1', agentSessionId: 'ses-dueno', provisioningStatus: 'ACTIVE' }),
    )
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-dueno', currentStep: 'complete', nextStep: null, draft: {} })

    await montar()

    expect(routerReplace).not.toHaveBeenCalled()
    expect(adentro()).not.toBeNull()
    expect(localStorage.getItem(CLAVE)).toBe('1')
  })

  it('con el veredicto cacheado no pregunta nada', async () => {
    localStorage.setItem(CLAVE, '1')

    await montar()

    expect(adentro()).not.toBeNull()
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
    expect(localStorage.getItem(CLAVE)).toBeNull()
  })

  it.each([
    ['FAILED sin sesión (la captura del 01-10: el back no alcanzó el micro)', { provisioningStatus: 'FAILED' }],
    ['PENDING sin sesión (el traspaso todavía en curso)', { provisioningStatus: 'PENDING' }],
    ['ACTIVE sin sesión (el segundo llamado al micro falló)', { provisioningStatus: 'ACTIVE' }],
  ])(
    '🔴 agencia creada y asistente sin empezar — %s: al asistente, sin montar panel ni 2FA, y sin cachear',
    async (_caso, sobre) => {
      getOnboardingResumePoint.mockResolvedValue(puntoDeRetorno({ tenantId: 'ag-1', ...sobre }))

      await montar()

      expect(resumeOnboarding).not.toHaveBeenCalled()
      expect(routerReplace).toHaveBeenCalledWith('/onboarding/inmobiliaria')
      expect(adentro()).toBeNull()
      expect(localStorage.getItem(CLAVE)).toBeNull()
    },
  )

  it('🔴 FAILED con un id de sesión también es registro a medias (no se le pregunta al micro)', async () => {
    getOnboardingResumePoint.mockResolvedValue(
      puntoDeRetorno({ tenantId: 'ag-1', agentSessionId: 'ses-1', provisioningStatus: 'FAILED' }),
    )

    await montar()

    expect(resumeOnboarding).not.toHaveBeenCalled()
    expect(routerReplace).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(adentro()).toBeNull()
  })

  it('🔴 mientras pregunta NO monta lo de adentro (la carrera: el 2FA salía antes del veredicto)', async () => {
    getOnboardingResumePoint.mockReturnValue(new Promise(() => {}))

    await montar()

    expect(adentro()).toBeNull()
    expect(container.querySelector('[data-testid="asistente-pendiente-verificando"]')).not.toBeNull()
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('a los 8 s sin respuesta es fail-open: monta lo de adentro y no cachea', async () => {
    vi.useFakeTimers()
    try {
      getOnboardingResumePoint.mockReturnValue(new Promise(() => {}))
      await act(async () => {
        root.render(
          <AsistentePendienteGuard>
            <div data-testid="adentro" />
          </AsistentePendienteGuard>,
        )
      })
      expect(adentro()).toBeNull()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(8000)
      })
      expect(adentro()).not.toBeNull()
      expect(routerReplace).not.toHaveBeenCalled()
      expect(localStorage.getItem(CLAVE)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('quien todavía no tiene inmobiliaria pasa, pero NO se cachea: puede crearla después', async () => {
    getOnboardingResumePoint.mockResolvedValue(puntoDeRetorno({ onboardingCompleted: false }))

    await montar()

    expect(adentro()).not.toBeNull()
    expect(localStorage.getItem(CLAVE)).toBeNull()
  })

  it('la caché vieja (`leasefy-asistente-listo:`) ya no abre la puerta', async () => {
    localStorage.setItem('leasefy-asistente-listo:u1', '1')
    getOnboardingResumePoint.mockResolvedValue(puntoDeRetorno({ tenantId: 'ag-1', provisioningStatus: 'FAILED' }))

    await montar()

    expect(getOnboardingResumePoint).toHaveBeenCalled()
    expect(routerReplace).toHaveBeenCalledWith('/onboarding/inmobiliaria')
  })
})
