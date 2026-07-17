/**
 * TenantOnboardingContext — submit guards (mirrors commit f067a97a for the
 * inmobiliaria wizard).
 *
 * The back rejects empty firstName/lastName with a 400 (@IsNotEmpty), so:
 *  - step 1 must require a trimmed non-empty displayName,
 *  - the name split follows the canonical convention (first word → firstName,
 *    rest → lastName, lastName falls back to firstName),
 *  - a restored draft that reaches submit with a blank name must NOT fire the
 *    POST — it routes back to the name step with a Spanish message,
 *  - a rejected submit must surface a toast (was console.error only) and keep
 *    the entered data so the user can retry.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { postMock, toastErrorMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ refreshUser: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: toastErrorMock, info: vi.fn() },
}))

import {
  TenantOnboardingProvider,
  useTenantOnboarding,
} from './TenantOnboardingContext'

type ContextValue = ReturnType<typeof useTenantOnboarding>

const STORAGE_KEY = 'plan_onboarding_tenant'

let container: HTMLDivElement
let root: Root
let captured: ContextValue | null = null

function Probe() {
  captured = useTenantOnboarding()
  return null
}

async function renderProvider() {
  await act(async () => {
    root.render(
      <TenantOnboardingProvider>
        <Probe />
      </TenantOnboardingProvider>,
    )
  })
}

beforeEach(() => {
  localStorage.clear()
  captured = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  postMock.mockReset()
  toastErrorMock.mockReset()
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('TenantOnboardingContext — step 1 name gate', () => {
  it('step 1 is invalid until a trimmed non-empty displayName exists', async () => {
    await renderProvider()

    expect(captured!.isStepValid(1)).toBe(false)

    await act(async () => {
      captured!.updateDraft({ displayName: '   ' })
    })
    expect(captured!.isStepValid(1)).toBe(false)

    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana María' })
    })
    expect(captured!.isStepValid(1)).toBe(true)
  })
})

describe('TenantOnboardingContext — name splitting on submit', () => {
  it('splits first word → firstName, rest → lastName', async () => {
    postMock.mockResolvedValue({})
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({ displayName: '  Ana María  Pérez Gómez ' })
    })
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/users/me/onboarding', {
      firstName: 'Ana',
      lastName: 'María Pérez Gómez',
      phone: undefined,
      userType: 'TENANT',
    })
  })

  it('falls back lastName to firstName for a single-word name', async () => {
    postMock.mockResolvedValue({})
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana' })
    })
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledWith(
      '/users/me/onboarding',
      expect.objectContaining({ firstName: 'Ana', lastName: 'Ana' }),
    )
  })
})

describe('TenantOnboardingContext — blank-name defense (restored draft)', () => {
  it('does not POST, routes back to step 1, and surfaces a Spanish message', async () => {
    // A restored draft can reach the final step with a blank name.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft: { displayName: '   ', phone: '3001234567' },
        currentStep: 2,
        completedSteps: [1],
      }),
    )
    await renderProvider()
    expect(captured!.currentStep).toBe(2)

    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).not.toHaveBeenCalled()
    expect(captured!.currentStep).toBe(1)
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(String(toastErrorMock.mock.calls[0][0])).toMatch(/nombre/i)
    expect(captured!.isComplete).toBe(false)
    expect(captured!.isSubmitting).toBe(false)
  })
})

describe('TenantOnboardingContext — rejected submit', () => {
  it('shows a toast, keeps the entered data, and allows a retry', async () => {
    postMock.mockRejectedValueOnce(new Error('400 Bad Request'))
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana Pérez' })
    })
    await act(async () => {
      await expect(captured!.submitOnboarding()).rejects.toThrow()
    })

    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(captured!.isComplete).toBe(false)
    expect(captured!.isSubmitting).toBe(false)
    // Entered data stays intact for the retry.
    expect(captured!.draft.displayName).toBe('Ana Pérez')

    // Retry succeeds with the same data.
    postMock.mockResolvedValueOnce({})
    await act(async () => {
      await captured!.submitOnboarding()
    })
    expect(postMock).toHaveBeenLastCalledWith(
      '/users/me/onboarding',
      expect.objectContaining({ firstName: 'Ana', lastName: 'Pérez' }),
    )
    expect(captured!.isComplete).toBe(true)
  })
})
