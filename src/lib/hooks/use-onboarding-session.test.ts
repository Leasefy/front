/**
 * use-onboarding-session.test.ts — rehydration, step submit, 409 conflict
 * step-correction, terminal error surfacing and bounded backoff retry
 * (unavailable/network only) for the onboarding wizard orchestration hook.
 *
 * Render harness mirrors use-agent.test.ts / use-address-autocomplete.test.ts
 * (createRoot + act — no @testing-library/react in this repo).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('../api/onboarding-session.service', async () => {
  const actual = await vi.importActual<typeof import('../api/onboarding-session.service')>(
    '../api/onboarding-session.service',
  )
  return {
    ...actual,
    resumeOnboarding: vi.fn(),
    submitAgency: vi.fn(),
    submitMembers: vi.fn(),
    submitPaymentProvider: vi.fn(),
    submitPolicy: vi.fn(),
    acceptTerms: vi.fn(),
    completeOnboarding: vi.fn(),
  }
})

import {
  OnboardingSessionError,
  resumeOnboarding,
  submitAgency,
  submitPolicy,
  completeOnboarding,
} from '../api/onboarding-session.service'
import { useOnboardingSession } from './use-onboarding-session'
import { ApiError } from '../api/client'

const resumeMock = resumeOnboarding as unknown as ReturnType<typeof vi.fn>
const submitAgencyMock = submitAgency as unknown as ReturnType<typeof vi.fn>
const submitPolicyMock = submitPolicy as unknown as ReturnType<typeof vi.fn>
const completeOnboardingMock = completeOnboarding as unknown as ReturnType<typeof vi.fn>

type Hook = ReturnType<typeof useOnboardingSession>

let container: HTMLDivElement
let root: Root

function renderHook(sessionId: string): { get: () => Hook; rerender: (nextSessionId: string) => void } {
  let latest: Hook | null = null
  function TestComponent({ sessionId: sid }: { sessionId: string }) {
    latest = useOnboardingSession(sid)
    return null
  }
  act(() => {
    root.render(React.createElement(TestComponent, { sessionId }))
  })
  return {
    get: () => latest as Hook,
    rerender: (nextSessionId: string) => {
      act(() => {
        root.render(React.createElement(TestComponent, { sessionId: nextSessionId }))
      })
    },
  }
}

const RESUME_START = {
  sessionId: 'sess_1',
  currentStep: 'start' as const,
  nextStep: 'agency' as const,
  draft: {},
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  resumeMock.mockReset()
  submitAgencyMock.mockReset()
  submitPolicyMock.mockReset()
  completeOnboardingMock.mockReset()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useOnboardingSession — rehydration', () => {
  it('calls resumeOnboarding on mount and exposes currentStep/nextStep/draft', async () => {
    resumeMock.mockResolvedValueOnce({
      sessionId: 'sess_1',
      currentStep: 'members',
      nextStep: 'payment_provider',
      draft: { legalName: 'Acme SAS' },
    })

    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(resumeMock).toHaveBeenCalledWith('sess_1')
    expect(hook.get().currentStep).toBe('members')
    expect(hook.get().nextStep).toBe('payment_provider')
    expect(hook.get().draft).toEqual({ legalName: 'Acme SAS' })
    expect(hook.get().status).toBe('idle')
    expect(hook.get().error).toBeNull()
  })
})

describe('useOnboardingSession — submit happy path', () => {
  it('submitAgency updates currentStep/nextStep/draft from the response', async () => {
    resumeMock.mockResolvedValueOnce(RESUME_START)
    submitAgencyMock.mockResolvedValueOnce({
      sessionId: 'sess_1',
      currentStep: 'agency',
      nextStep: 'members',
      draft: { legalName: 'Acme SAS' },
    })

    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await hook.get().submitAgency({
        legalName: 'Acme SAS',
        nit: '900123456-1',
        address: { calle: 'Cra 1', ciudad: 'Bogotá', departamento: 'Cundinamarca' },
        primaryContactEmail: 'a@acme.co',
        primaryContactPhone: '3001234567',
        billingModel: 'standard',
      })
    })

    expect(hook.get().currentStep).toBe('agency')
    expect(hook.get().nextStep).toBe('members')
    expect(hook.get().draft).toEqual({ legalName: 'Acme SAS' })
    expect(hook.get().status).toBe('idle')
    expect(hook.get().error).toBeNull()
  })
})

describe('useOnboardingSession — 409 conflict', () => {
  it('corrects currentStep from error.conflict.requiredStep and exposes the error', async () => {
    resumeMock.mockResolvedValueOnce(RESUME_START)
    submitAgencyMock.mockRejectedValueOnce(
      new OnboardingSessionError('conflict', 409, 'La sesión ya avanzó', {
        error: 'La sesión ya avanzó',
        requiredStep: 'members',
      }),
    )

    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await hook.get().submitAgency({
        legalName: 'Acme SAS',
        nit: '900123456-1',
        address: { calle: 'Cra 1', ciudad: 'Bogotá', departamento: 'Cundinamarca' },
        primaryContactEmail: 'a@acme.co',
        primaryContactPhone: '3001234567',
        billingModel: 'standard',
      })
    })

    expect(hook.get().currentStep).toBe('members')
    expect(hook.get().status).toBe('error')
    expect(hook.get().error?.kind).toBe('conflict')
    expect(submitAgencyMock).toHaveBeenCalledTimes(1) // no retry on conflict
  })
})

describe('useOnboardingSession — terminal error (no retry)', () => {
  it('exposes an expired error immediately without retrying', async () => {
    resumeMock.mockResolvedValueOnce(RESUME_START)
    submitPolicyMock.mockRejectedValueOnce(
      new OnboardingSessionError('expired', 410, 'La sesión expiró'),
    )

    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await hook.get().submitPolicy({})
    })

    expect(hook.get().status).toBe('error')
    expect(hook.get().error?.kind).toBe('expired')
    expect(submitPolicyMock).toHaveBeenCalledTimes(1)
  })
})

describe('useOnboardingSession — retry on unavailable', () => {
  it('retries with backoff and succeeds on the 3rd attempt', async () => {
    vi.useFakeTimers()
    resumeMock
      .mockRejectedValueOnce(new OnboardingSessionError('unavailable', 503, 'DB caída'))
      .mockRejectedValueOnce(new OnboardingSessionError('unavailable', 503, 'DB caída'))
      .mockResolvedValueOnce({
        sessionId: 'sess_1',
        currentStep: 'agency',
        nextStep: 'members',
        draft: {},
      })

    const hook = renderHook('sess_1')
    expect(hook.get().status).toBe('loading')

    // 1st retry after 500ms, 2nd retry after 1000ms.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(resumeMock).toHaveBeenCalledTimes(3)
    expect(hook.get().status).toBe('idle')
    expect(hook.get().currentStep).toBe('agency')
    expect(hook.get().error).toBeNull()
  })

  it('gives up after 3 attempts and exposes the error', async () => {
    vi.useFakeTimers()
    resumeMock
      .mockRejectedValueOnce(new OnboardingSessionError('unavailable', 503, 'DB caída'))
      .mockRejectedValueOnce(new OnboardingSessionError('unavailable', 503, 'DB caída'))
      .mockRejectedValueOnce(new OnboardingSessionError('unavailable', 503, 'DB caída'))

    const hook = renderHook('sess_1')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(resumeMock).toHaveBeenCalledTimes(3)
    expect(hook.get().status).toBe('error')
    expect(hook.get().error?.kind).toBe('unavailable')
  })
})

describe('useOnboardingSession — StrictMode double-mount (dev)', () => {
  // React 18 StrictMode runs effects as mount → cleanup → re-run on the SAME
  // instance (refs preserved). A cleanup-only mountedRef effect flips the ref
  // to false forever, so the second (surviving) resume resolves but the hook
  // never leaves 'loading' — the wizard hangs on the loading screen in dev.
  it('reaches idle with the resumed step after the StrictMode effect re-run', async () => {
    resumeMock.mockResolvedValue({
      sessionId: 'sess_1',
      currentStep: 'members',
      nextStep: 'payment_provider',
      draft: { legalName: 'Acme SAS' },
    })

    let latest: Hook | null = null
    function TestComponent() {
      latest = useOnboardingSession('sess_1')
      return null
    }
    act(() => {
      root.render(
        React.createElement(React.StrictMode, null, React.createElement(TestComponent)),
      )
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // StrictMode re-runs the rehydration effect: resume fires twice, both 200.
    expect(resumeMock).toHaveBeenCalledTimes(2)
    expect((latest as unknown as Hook).status).toBe('idle')
    expect((latest as unknown as Hook).currentStep).toBe('members')
    expect((latest as unknown as Hook).error).toBeNull()
  })
})

describe('useOnboardingSession — non-envelope actions', () => {
  it('completeOnboarding pins currentStep to "complete" on success', async () => {
    resumeMock.mockResolvedValueOnce(RESUME_START)
    completeOnboardingMock.mockResolvedValueOnce({
      tenantId: 't1',
      agencyId: 'a1',
      sessionId: 'sess_1',
      status: 'COMPLETED',
      dashboardUrl: '/panel/inmobiliaria',
    })

    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await hook.get().completeOnboarding()
    })

    expect(hook.get().currentStep).toBe('complete')
    expect(hook.get().nextStep).toBeNull()
    expect(hook.get().status).toBe('idle')
  })
})

/**
 * 02-10-2026 · Un 4xx/5xx no se traga como `null`. Las acciones de cada paso
 * resuelven `null` cuando el paso no salió (los formularios cuentan con que
 * nunca lanzan), pero el error queda en `error` con su status y su cuerpo.
 * Antes, uno que no llegara como `OnboardingSessionError` quedaba `unknown`,
 * sin status, sin `campos` y con su texto crudo en inglés.
 */
describe('useOnboardingSession — el error llega entero (status + cuerpo)', () => {
  const AGENCIA = {
    legalName: 'Acme SAS',
    nit: '900123456-1',
    address: { calle: 'Cra 1', ciudad: 'Bogotá', departamento: 'Cundinamarca' },
    primaryContactEmail: 'a@acme.co',
    primaryContactPhone: '3001234567',
    billingModel: 'standard' as const,
  }

  async function montarYEnviar(rechazo: unknown) {
    resumeMock.mockResolvedValueOnce(RESUME_START)
    submitAgencyMock.mockRejectedValueOnce(rechazo)
    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    let resultado: unknown = 'sin-llamar'
    await act(async () => {
      resultado = await hook.get().submitAgency(AGENCIA)
    })
    return { hook, resultado }
  }

  it('un 400 del micro: el paso resuelve null y el error queda con status, campos y cuerpo', async () => {
    const campos = [{ campo: 'nit', regla: 'formato', mensaje: 'El NIT no tiene un formato válido.' }]
    const { hook, resultado } = await montarYEnviar(
      new OnboardingSessionError('validation', 400, 'El NIT no tiene un formato válido.', undefined, campos, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        campos,
      }),
    )
    expect(resultado).toBeNull()
    expect(hook.get().status).toBe('error')
    expect(hook.get().error).toMatchObject({ kind: 'validation', status: 400, campos })
    expect(hook.get().error?.detalle).toMatchObject({ code: 'DATOS_INVALIDOS' })
  })

  it('🔴 un 400 que llega como ApiError ya no pierde el status ni los campos (antes: unknown, status null)', async () => {
    const sobre = {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: ['La razón social no puede tener más de 200 caracteres.'],
      campos: [{ campo: 'legalName', regla: 'maximo', mensaje: 'La razón social no puede tener más de 200 caracteres.' }],
    }
    const { hook } = await montarYEnviar(new ApiError(400, sobre.message, 'DATOS_INVALIDOS', sobre))
    const error = hook.get().error
    expect(error?.kind).toBe('validation')
    expect(error?.status).toBe(400)
    expect(error?.campos).toEqual(sobre.campos)
    expect(error?.detalle).toMatchObject({ code: 'DATOS_INVALIDOS' })
    expect(error?.message).toBe('La razón social no puede tener más de 200 caracteres.')
    expect(submitAgencyMock).toHaveBeenCalledTimes(1)
  })

  it('🔴 un 5xx que llega como ApiError dice «de nuestro lado» con la referencia y conserva el status', async () => {
    const { hook } = await montarYEnviar(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    )
    const error = hook.get().error
    expect(error?.status).toBe(500)
    expect(error?.kind).toBe('unknown')
    expect(error?.message).toMatch(/^No pudimos continuar con el registro: algo falló de nuestro lado/)
    expect(error?.message).toContain('ab12cd34')
    expect(error?.detalle).toMatchObject({ referencia: 'ab12cd34' })
  })

  it('🔴 un Error(«Internal error: …») no deja el texto crudo en inglés: es nuestro', async () => {
    const { hook } = await montarYEnviar(new Error("Internal error: Cannot read properties of undefined (reading 'nit')"))
    const error = hook.get().error
    expect(error?.kind).toBe('unknown')
    expect(error?.message).not.toMatch(/Internal error|Cannot read/)
    expect(error?.message).toMatch(/de nuestro lado/)
  })

  it('sólo sin respuesta habla de la conexión (network, que se reintenta)', async () => {
    vi.useFakeTimers()
    resumeMock.mockResolvedValueOnce(RESUME_START)
    submitAgencyMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const hook = renderHook('sess_1')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      const envio = hook.get().submitAgency(AGENCIA)
      await vi.advanceTimersByTimeAsync(1500)
      await envio
    })
    expect(submitAgencyMock).toHaveBeenCalledTimes(3)
    expect(hook.get().error?.kind).toBe('network')
    expect(hook.get().error?.message).toMatch(/conexi[oó]n/i)
  })
})

