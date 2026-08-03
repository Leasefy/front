import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { CompleteStepForm } from './CompleteStepForm'
import { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import type { OnboardingSessionStepConflict } from '@/lib/api/generated/agency'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
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

function render(props: Partial<React.ComponentProps<typeof CompleteStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof CompleteStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue(null),
    error: null,
    onNavigateToStep: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<CompleteStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byTestId(testId: string): HTMLElement {
  const el = container.querySelector(`[data-testid="${testId}"]`)
  if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
  return el as HTMLElement
}

async function clickFinish() {
  const btn = byTestId('complete-step-finish') as HTMLButtonElement
  await act(async () => {
    btn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<CompleteStepForm>', () => {
  it('(a) happy path — clicking finish calls onSubmit and redirects to dashboardUrl', async () => {
    const originalLocation = window.location
    const locationStub = { href: '' } as Location
    Object.defineProperty(window, 'location', { value: locationStub, writable: true, configurable: true })

    const onSubmit = vi.fn().mockResolvedValue({
      tenantId: 'tenant-1',
      agencyId: 'agency-1',
      sessionId: 'sess-1',
      status: 'COMPLETED',
      dashboardUrl: 'https://app.leasefy.co/panel/inmobiliaria?agencyId=tenant-1',
    })
    render({ onSubmit })

    await clickFinish()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('https://app.leasefy.co/panel/inmobiliaria?agencyId=tenant-1')

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('(b) 409 with missingSteps — shows the mapped labels and a button to go to the first missing step', () => {
    // Runtime shape for /complete's 409 is a union — this branch has `missingSteps`,
    // not `requiredStep`, even though the service types `.conflict` as `OnboardingSessionStepConflict`.
    const error = new OnboardingSessionError('conflict', 409, 'Faltan pasos.', {
      error: 'Faltan pasos.',
      missingSteps: ['policy', 'members'],
    } as unknown as OnboardingSessionStepConflict)
    const onNavigateToStep = vi.fn()
    render({ error, onNavigateToStep })

    expect(container.querySelector('[data-testid="complete-step-form"]')).toBeFalsy()
    const missing = byTestId('complete-step-missing')
    expect(missing.textContent).toContain('Miembros')
    expect(missing.textContent).toContain('Política')

    const goBtn = byTestId('complete-step-go-to-missing') as HTMLButtonElement
    act(() => {
      goBtn.click()
    })
    // Order-independent of the raw missingSteps array — wizard order says members before policy.
    expect(onNavigateToStep).toHaveBeenCalledWith('members')
  })

  it('(c) 409 defensive — requiredStep without missingSteps still works, navigates to that step', () => {
    const error = new OnboardingSessionError('conflict', 409, 'Conflicto de sesión.', {
      error: 'Conflicto de sesión.',
      requiredStep: 'payment_provider',
    })
    const onNavigateToStep = vi.fn()
    render({ error, onNavigateToStep })

    const missing = byTestId('complete-step-missing')
    expect(missing.textContent).toContain('Medio de pago')

    const goBtn = byTestId('complete-step-go-to-missing') as HTMLButtonElement
    act(() => {
      goBtn.click()
    })
    expect(onNavigateToStep).toHaveBeenCalledWith('payment_provider')
  })

  it('(d) other error kinds render nothing special here — the parent already shows the generic banner', () => {
    const error = new OnboardingSessionError('unavailable', 503, 'El servicio no está disponible.')
    render({ error })

    expect(container.querySelector('[data-testid="complete-step-missing"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="complete-step-form"]')).toBeTruthy()
  })
})
