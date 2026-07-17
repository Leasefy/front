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
    presignHabeasData: vi.fn(),
    confirmHabeasData: vi.fn(),
    completeOnboarding: vi.fn(),
  }
})

import {
  OnboardingSessionError,
  resumeOnboarding,
  submitAgency,
  submitPolicy,
  presignHabeasData,
  completeOnboarding,
} from '../api/onboarding-session.service'
import { useOnboardingSession } from './use-onboarding-session'

const resumeMock = resumeOnboarding as unknown as ReturnType<typeof vi.fn>
const submitAgencyMock = submitAgency as unknown as ReturnType<typeof vi.fn>
const submitPolicyMock = submitPolicy as unknown as ReturnType<typeof vi.fn>
const presignHabeasDataMock = presignHabeasData as unknown as ReturnType<typeof vi.fn>
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
  presignHabeasDataMock.mockReset()
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
  it('presignHabeasData does not touch currentStep/nextStep/draft', async () => {
    resumeMock.mockResolvedValueOnce(RESUME_START)
    presignHabeasDataMock.mockResolvedValueOnce({
      presignedUrl: 'https://s3.example/upload',
      s3Key: 'k1',
      expiresIn: 900,
    })

    const hook = renderHook('sess_1')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await hook.get().presignHabeasData({
        fileName: 'contrato.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      })
    })

    expect(hook.get().currentStep).toBe('start')
    expect(hook.get().status).toBe('idle')
  })

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
