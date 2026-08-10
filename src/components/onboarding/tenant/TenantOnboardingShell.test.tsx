/**
 * TenantOnboardingShell — direct-to-dashboard completion.
 *
 * Owner rule: a successful wizard submit lands DIRECTLY on the tenant panel
 * (/inquilino), with navigation fired only AFTER submitOnboarding resolves
 * (the context awaits refreshUser() before resolving, so the dashboard never
 * flashes the empty state). A failed submit stays in the wizard (the context
 * surfaces the toast) and never navigates.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pushMock, submitMock, authState, wizardState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  submitMock: vi.fn(),
  authState: { user: undefined as Record<string, unknown> | undefined },
  wizardState: { isSubmitting: false },
}))

let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => searchParams,
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: authState.user }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

// The shell consumes the context via this hook — mock it with a last-step
// state so the primary button is the submit ("Completar perfil"). Partial
// mock: the shell also imports TENANT_ONBOARDING_STEPS from this module.
vi.mock('@/lib/context/TenantOnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/lib/context/TenantOnboardingContext')
  >()
  return {
    ...actual,
    useTenantOnboarding: () => ({
      currentStep: 2,
      totalSteps: 2,
      completedSteps: [1],
      goToStep: vi.fn(),
      prevStep: vi.fn(),
      nextStep: vi.fn(),
      submitOnboarding: submitMock,
      isSubmitting: wizardState.isSubmitting,
      canProceed: true,
      progressPercentage: 50,
    }),
  }
})

import { TenantOnboardingShell } from './TenantOnboardingShell'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  authState.user = { id: 'u1', role: 'tenant' }
  wizardState.isSubmitting = false
  pushMock.mockClear()
  submitMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function renderShell() {
  await act(async () => {
    root.render(
      <TenantOnboardingShell>
        <div data-testid="step" />
      </TenantOnboardingShell>,
    )
  })
}

function submitButton(): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    (b.textContent || '').includes('Completar perfil'),
  )
  expect(button, 'submit button').toBeTruthy()
  return button as HTMLButtonElement
}

describe('TenantOnboardingShell — completion navigation', () => {
  beforeEach(() => { searchParams = new URLSearchParams() })
  it('routes straight to /inquilino AFTER submitOnboarding resolves (post-refreshUser)', async () => {
    let resolveSubmit!: () => void
    submitMock.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve }),
    )
    await renderShell()

    await act(async () => {
      submitButton().click()
    })
    expect(submitMock).toHaveBeenCalledTimes(1)
    // Still in flight (refreshUser not done) — no navigation yet.
    expect(pushMock).not.toHaveBeenCalled()

    await act(async () => {
      resolveSubmit()
    })
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/inquilino')
  })

  it('routes a not-yet-hydrated user (null pre-submit) to the tenant dashboard, never to /', async () => {
    authState.user = undefined
    submitMock.mockResolvedValue(undefined)
    await renderShell()

    await act(async () => {
      submitButton().click()
    })

    expect(pushMock).toHaveBeenCalledWith('/inquilino')
  })

  it('guards against double submit: while isSubmitting the button is disabled and shows the saving label', async () => {
    wizardState.isSubmitting = true
    await renderShell()

    // The submit CTA is replaced by a disabled loading button.
    const saving = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Guardando...'),
    ) as HTMLButtonElement
    expect(saving, 'saving button').toBeTruthy()
    expect(saving.disabled).toBe(true)
    expect(container.textContent).not.toContain('Completar perfil')

    saving.click()
    await act(async () => {})
    expect(submitMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('honra un returnUrl seguro — el recorrido de aprobación venía a ver SU catálogo', async () => {
    // Sin esto el onboarding descartaba el destino y la persona terminaba en la
    // home, no en el catálogo que se le prometió dos pantallas atrás.
    searchParams = new URLSearchParams({ returnUrl: '/inquilino/para-ti' })
    submitMock.mockResolvedValue(undefined)
    await renderShell()

    await act(async () => {
      submitButton().click()
    })
    expect(pushMock).toHaveBeenCalledWith('/inquilino/para-ti')
  })

  it('un returnUrl externo NO secuestra el aterrizaje', async () => {
    // El link de confirmación viaja por correo: un destino absoluto sacaría a
    // la persona del sitio justo después de autenticarse.
    searchParams = new URLSearchParams({ returnUrl: 'https://evil.example.com' })
    submitMock.mockResolvedValue(undefined)
    await renderShell()

    await act(async () => {
      submitButton().click()
    })
    expect(pushMock).toHaveBeenCalledWith('/inquilino')
  })

  it('stays in the wizard on submit failure — no navigation', async () => {
    submitMock.mockRejectedValue(new Error('400 Bad Request'))
    await renderShell()

    await act(async () => {
      submitButton().click()
    })

    expect(submitMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
  })
})
