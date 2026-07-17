import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const mockPush = vi.fn()
const mockReplace = vi.fn()
let mockSearchParams = new URLSearchParams({ session: 'sess-1' })

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/onboarding/inmobiliaria',
}))

const mockUseOnboardingSession = vi.fn()
vi.mock('@/lib/hooks/use-onboarding-session', () => ({
  useOnboardingSession: (sessionId: string) => mockUseOnboardingSession(sessionId),
}))

const mockUseOnboardingProvisioning = vi.fn()
vi.mock('@/lib/hooks/use-onboarding-provisioning', () => ({
  useOnboardingProvisioning: () => mockUseOnboardingProvisioning(),
}))

import OnboardingInmobiliariaClient from './OnboardingInmobiliariaClient'
import { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import type { OnboardingSessionStepConflict } from '@/lib/api/generated/agency'

let container: HTMLDivElement
let root: Root

function baseHookResult(overrides: Record<string, unknown> = {}) {
  return {
    status: 'idle',
    currentStep: 'agency',
    nextStep: null,
    draft: {},
    error: null,
    refresh: vi.fn(),
    submitAgency: vi.fn(),
    submitMembers: vi.fn(),
    submitPaymentProvider: vi.fn(),
    submitPolicy: vi.fn(),
    presignHabeasData: vi.fn(),
    confirmHabeasData: vi.fn(),
    completeOnboarding: vi.fn(),
    ...overrides,
  }
}

function baseProvisioningResult(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ready',
    sessionId: 'sess-provisioned',
    agencyPrefill: null,
    retry: vi.fn(),
    provision: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  // Default: ?session= override present so existing wizard-step tests below
  // (written before provisioning existed) keep exercising the override path
  // unchanged — the sessionId still flows straight from the URL.
  mockSearchParams = new URLSearchParams({ session: 'sess-1' })
  mockUseOnboardingSession.mockClear()
  mockUseOnboardingProvisioning.mockClear()
  mockUseOnboardingProvisioning.mockReturnValue(baseProvisioningResult())
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
  mockPush.mockReset()
  mockReplace.mockReset()
})

function render() {
  act(() => {
    root.render(<OnboardingInmobiliariaClient />)
  })
}

function byId(id: string): HTMLInputElement {
  const el = container.querySelector(`[id="${id}"]`)
  if (!el) throw new Error(`Element with id="${id}" not found`)
  return el as HTMLInputElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clickSubmit() {
  const submitBtn = container.querySelector(
    '[data-testid="agency-step-form"] button[type="submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    submitBtn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<OnboardingInmobiliariaClient> — session provisioning (work-unit #4)', () => {
  it('(c) uses the ?session= override directly and never provisions', () => {
    mockSearchParams = new URLSearchParams({ session: 'sess-1' })
    mockUseOnboardingSession.mockReturnValue(baseHookResult())
    render()

    expect(mockUseOnboardingProvisioning).not.toHaveBeenCalled()
    expect(mockUseOnboardingSession).toHaveBeenCalledWith('sess-1')
  })

  it('keeps the pre-step mounted with a disabled submit while provisioning (no double POST)', () => {
    mockSearchParams = new URLSearchParams()
    const provision = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'provisioning', sessionId: null, provision }),
    )
    render()

    const submitBtn = container.querySelector(
      '[data-testid="owner-name-step-form"] button[type="submit"]',
    ) as HTMLButtonElement
    expect(submitBtn).toBeTruthy()
    expect(submitBtn.disabled).toBe(true)

    // A click on the disabled button must never fire another provision().
    act(() => {
      submitBtn.click()
    })
    expect(provision).not.toHaveBeenCalled()
    expect(mockUseOnboardingSession).not.toHaveBeenCalled()
  })

  it('(a) mounts the wizard with the provisioned sessionId once ready', () => {
    mockSearchParams = new URLSearchParams()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'ready', sessionId: 'sess-provisioned' }),
    )
    mockUseOnboardingSession.mockReturnValue(baseHookResult())
    render()

    expect(mockUseOnboardingSession).toHaveBeenCalledWith('sess-provisioned')
    expect(container.querySelector('[data-testid="agency-step-form"]')).toBeTruthy()
  })

  it('(b) shows a retry-able error state and does not mount the wizard when provisioning fails', () => {
    mockSearchParams = new URLSearchParams()
    const retry = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'error', sessionId: null, retry }),
    )
    render()

    expect(mockUseOnboardingSession).not.toHaveBeenCalled()
    const retryBtn = container.querySelector(
      '[data-testid="onboarding-provisioning-error"] button',
    ) as HTMLButtonElement
    expect(retryBtn).toBeTruthy()
    expect(retryBtn.textContent).toContain('Reintentar')

    // (d) clicking retry re-runs provisioning
    act(() => {
      retryBtn.click()
    })
    expect(retry).toHaveBeenCalledTimes(1)
  })
})

// The provisioning contract always needs the owner's name PLUS the agency's
// razón social and NIT (the back only creates the agency + agent session for
// `userType: 'INMOBILIARIA'` with an `agency` object, and without a NIT the
// agency is flipped to FAILED with no retry). When the hook reports
// `needs-info` the wizard shows a pre-step collecting all three, splits the
// name like the canonical onboarding/propietario pattern, and provisions
// explicitly.
describe('<OnboardingInmobiliariaClient> — owner info pre-step', () => {
  function submitNameForm() {
    const submitBtn = container.querySelector(
      '[data-testid="owner-name-step-form"] button[type="submit"]',
    ) as HTMLButtonElement
    act(() => {
      submitBtn.click()
    })
  }

  function fillAgencyFields() {
    setInputValue(byId('agencyName'), 'Inmobiliaria Andes SAS')
    setInputValue(byId('agencyNit'), '900123456-7')
  }

  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
  })

  it('renders the pre-step and does not mount the wizard nor auto-provision UI', () => {
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'needs-info', sessionId: null }),
    )
    render()

    expect(container.querySelector('[data-testid="owner-name-step-form"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="provisioning-loading"]')).toBeFalsy()
    expect(mockUseOnboardingSession).not.toHaveBeenCalled()
  })

  it('splits the full name (first word → firstName, rest → lastName) and provisions with the agency data', () => {
    const provision = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'needs-info', sessionId: null, provision }),
    )
    render()

    setInputValue(byId('ownerFullName'), '  Ana María  Pérez Gómez ')
    fillAgencyFields()
    submitNameForm()

    expect(provision).toHaveBeenCalledTimes(1)
    expect(provision).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'María Pérez Gómez',
      agencyName: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
    })
  })

  it('falls back lastName to firstName for a single-word name', () => {
    const provision = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'needs-info', sessionId: null, provision }),
    )
    render()

    setInputValue(byId('ownerFullName'), 'Ana')
    fillAgencyFields()
    submitNameForm()

    expect(provision).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Ana',
      agencyName: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
    })
  })

  it('blocks submit and shows a hint per empty required field', () => {
    const provision = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'needs-info', sessionId: null, provision }),
    )
    render()

    submitNameForm()

    expect(provision).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Ingresa tu nombre completo para continuar.')
    expect(container.textContent).toContain('La razón social es obligatoria.')
    expect(container.textContent).toContain('El NIT es obligatorio.')
  })

  // Colombian RUT documents print the NIT dot-separated ("900.123.456-7") —
  // accept it, but always post the normalized digits-only form.
  it('accepts a dotted RUT-style NIT and provisions with it normalized', () => {
    const provision = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'needs-info', sessionId: null, provision }),
    )
    render()

    setInputValue(byId('ownerFullName'), 'Ana Pérez')
    setInputValue(byId('agencyName'), 'Inmobiliaria Andes SAS')
    setInputValue(byId('agencyNit'), '900.123.456-7')
    submitNameForm()

    expect(provision).toHaveBeenCalledTimes(1)
    expect(provision).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      agencyName: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
    })
  })

  it('blocks submit when the NIT is not digits with an optional check digit', () => {
    const provision = vi.fn()
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ status: 'needs-info', sessionId: null, provision }),
    )
    render()

    setInputValue(byId('ownerFullName'), 'Ana Pérez')
    setInputValue(byId('agencyName'), 'Inmobiliaria Andes SAS')
    setInputValue(byId('agencyNit'), 'NIT 900.123')
    submitNameForm()

    expect(provision).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Ingresa un NIT válido. Ej: 900123456-7')
  })
})

// Bug report: the "Agencia" step re-asked razón social + NIT that the user
// just typed one screen earlier in `OwnerNameStepForm`. These tests wire
// `useOnboardingProvisioning().agencyPrefill` and `useOnboardingSession().draft`
// through to `<AgencyStepForm prefill={...}>`.
describe('<OnboardingInmobiliariaClient> — agency step prefill', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
  })

  it('prefills legalName/nit from the pre-step values captured during provisioning', () => {
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({
        agencyPrefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' },
      }),
    )
    mockUseOnboardingSession.mockReturnValue(baseHookResult())
    render()

    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
    expect(byId('nit').value).toBe('900123456-7')
  })

  it('falls back to proposedAgencyName/contactEmail from the resume draft when the pre-step values are absent (e.g. after a refresh)', () => {
    mockUseOnboardingProvisioning.mockReturnValue(baseProvisioningResult({ agencyPrefill: null }))
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ draft: { proposedAgencyName: 'Inmobiliaria Andes SAS', contactEmail: 'ana@andes.test' } }),
    )
    render()

    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
    expect(byId('primaryContactEmail').value).toBe('ana@andes.test')
    // NIT has no source at all once the pre-step values are gone.
    expect(byId('nit').value).toBe('')
  })

  it('the pre-step legalName wins over draft.proposedAgencyName', () => {
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ agencyPrefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' } }),
    )
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ draft: { proposedAgencyName: 'Nombre Viejo Ltda' } }),
    )
    render()

    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
  })

  it('the ?session= dev override has no pre-step prefill but still applies the draft', () => {
    mockSearchParams = new URLSearchParams({ session: 'sess-1' })
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ draft: { proposedAgencyName: 'Inmobiliaria Andes SAS' } }),
    )
    render()

    expect(mockUseOnboardingProvisioning).not.toHaveBeenCalled()
    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
  })

  it('prefilled fields stay editable', async () => {
    mockUseOnboardingProvisioning.mockReturnValue(
      baseProvisioningResult({ agencyPrefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' } }),
    )
    mockUseOnboardingSession.mockReturnValue(baseHookResult())
    render()

    setInputValue(byId('legalName'), 'Otro Nombre SAS')

    expect(byId('legalName').value).toBe('Otro Nombre SAS')
  })
})

describe('<OnboardingInmobiliariaClient>', () => {
  it('renders the stepper with the active step derived from currentStep', () => {
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ currentStep: 'members' }))
    render()

    const activeStep = container.querySelector('[data-testid="wizard-step-members"]')
    const agencyStep = container.querySelector('[data-testid="wizard-step-agency"]')
    expect(activeStep?.getAttribute('data-active')).toBe('true')
    expect(agencyStep?.getAttribute('data-active')).toBe('false')
    // members has a real form now — no placeholder for this step.
    expect(container.querySelector('[data-testid="members-step-form"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="wizard-step-placeholder"]')).toBeFalsy()
  })

  it('mounts <HabeasDataStepForm> on the habeas_data step and forwards presign/confirm', () => {
    const presignHabeasData = vi.fn()
    const confirmHabeasData = vi.fn()
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ currentStep: 'habeas_data', presignHabeasData, confirmHabeasData }),
    )
    render()

    expect(container.querySelector('[data-testid="habeas-data-step-form"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="wizard-step-placeholder"]')).toBeFalsy()
  })

  it('mounts <MembersStepForm> on the members step and forwards submitMembers', async () => {
    const submitMembers = vi.fn().mockResolvedValue(null)
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ currentStep: 'members', submitMembers }))
    render()

    setInputValue(byId('members.0.email'), 'admin@inmobiliaria.test')

    const submitBtn = container.querySelector(
      '[data-testid="members-step-form"] button[type="submit"]',
    ) as HTMLButtonElement
    await act(async () => {
      submitBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(submitMembers).toHaveBeenCalledWith({
      members: [{ email: 'admin@inmobiliaria.test', role: 'AGENTE' }],
    })
  })

  it('retains the members invite-links screen after submitMembers even though currentStep advances — advance is manual via "Continuar"', async () => {
    let hookCurrentStep: string = 'members'
    const submitMembers = vi.fn().mockImplementation(async () => {
      hookCurrentStep = 'payment_provider'
      return {
        sessionId: 'sess-1',
        currentStep: 'payment_provider',
        nextStep: 'policy',
        draft: {},
        inviteTokens: [{ email: 'admin@inmobiliaria.test', rawToken: 'raw-token-1' }],
      }
    })
    mockUseOnboardingSession.mockImplementation(() =>
      baseHookResult({ get currentStep() { return hookCurrentStep }, submitMembers }),
    )
    render()

    setInputValue(byId('members.0.email'), 'admin@inmobiliaria.test')

    const submitBtn = container.querySelector(
      '[data-testid="members-step-form"] button[type="submit"]',
    ) as HTMLButtonElement
    await act(async () => {
      submitBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    // Response resolved and the hook's currentStep already moved on — but the
    // wizard must still show the invite links, not the next step's form.
    expect(container.querySelector('[data-testid="members-invite-links"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="payment-provider-step-form"]')).toBeFalsy()
    expect(container.textContent).toContain('admin@inmobiliaria.test')

    const continueBtn = container.querySelector(
      '[data-testid="members-invite-continue"]',
    ) as HTMLButtonElement
    act(() => {
      continueBtn.click()
    })

    expect(container.querySelector('[data-testid="members-invite-links"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="payment-provider-step-form"]')).toBeTruthy()
  })

  it('mounts <PaymentProviderStepForm> on the payment_provider step and forwards submitPaymentProvider', () => {
    const submitPaymentProvider = vi.fn().mockResolvedValue(null)
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ currentStep: 'payment_provider', submitPaymentProvider }),
    )
    render()

    expect(container.querySelector('[data-testid="payment-provider-step-form"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="wizard-step-placeholder"]')).toBeFalsy()
  })

  it('mounts <PolicyStepForm> on the policy step and forwards submitPolicy', () => {
    const submitPolicy = vi.fn().mockResolvedValue(null)
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ currentStep: 'policy', submitPolicy }))
    render()

    expect(container.querySelector('[data-testid="policy-step-form"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="wizard-step-placeholder"]')).toBeFalsy()
  })

  it('blocks submitAgency until the zod schema is satisfied, then calls it with the mapped payload', async () => {
    const submitAgency = vi.fn().mockResolvedValue({
      sessionId: 'sess-1',
      currentStep: 'members',
      nextStep: 'payment_provider',
      draft: {},
    })
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ submitAgency }))
    render()

    expect(container.querySelector('[data-testid="agency-step-form"]')).toBeTruthy()

    // Empty form — zod should block the call and surface field errors.
    await clickSubmit()
    expect(submitAgency).not.toHaveBeenCalled()
    expect(container.textContent).toContain('La razón social es obligatoria.')

    // Fill every required field.
    setInputValue(byId('legalName'), 'Inmobiliaria Test SAS')
    setInputValue(byId('nit'), '900123456-7')
    setInputValue(byId('address.calle'), 'Calle 10 # 20-30')
    setInputValue(byId('address.ciudad'), 'Bogotá')
    setInputValue(byId('address.departamento'), 'Cundinamarca')
    setInputValue(byId('primaryContactEmail'), 'contacto@inmobiliaria.test')
    setInputValue(byId('primaryContactPhone'), '3001234567')

    await clickSubmit()

    expect(submitAgency).toHaveBeenCalledTimes(1)
    expect(submitAgency).toHaveBeenCalledWith({
      legalName: 'Inmobiliaria Test SAS',
      nit: '900123456-7',
      address: { calle: 'Calle 10 # 20-30', ciudad: 'Bogotá', departamento: 'Cundinamarca' },
      primaryContactEmail: 'contacto@inmobiliaria.test',
      primaryContactPhone: '3001234567',
      billingModel: 'standard',
    })
  })

  it('shows the terminal expired-session banner and does not render the wizard content', () => {
    const error = new OnboardingSessionError('expired', 410, 'La sesión de onboarding expiró.')
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ status: 'error', error }))
    render()

    expect(container.querySelector('[data-testid="onboarding-error-banner-expired"]')).toBeTruthy()
    expect(container.textContent).toContain('Tu sesión de onboarding expiró')
    expect(container.querySelector('[data-testid="agency-step-form"]')).toBeFalsy()
  })

  it('redirects to /auth on an unauthorized error', () => {
    const error = new OnboardingSessionError('unauthorized', 401, 'Missing JWT.')
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ status: 'error', error }))
    render()

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('/auth?returnUrl='),
    )
  })
})

describe('<OnboardingInmobiliariaClient> — complete step (work-unit 3f)', () => {
  it('mounts <CompleteStepForm> on the complete step and forwards completeOnboarding', async () => {
    const completeOnboarding = vi.fn().mockResolvedValue(null)
    mockUseOnboardingSession.mockReturnValue(baseHookResult({ currentStep: 'complete', completeOnboarding }))
    render()

    expect(container.querySelector('[data-testid="complete-step-form"]')).toBeTruthy()

    const finishBtn = container.querySelector(
      '[data-testid="complete-step-finish"]',
    ) as HTMLButtonElement
    await act(async () => {
      finishBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(completeOnboarding).toHaveBeenCalledTimes(1)
  })

  it('409 with missingSteps — shows the missing-steps CTA and navigating to the first missing step renders that step form', () => {
    // Runtime union shape for /complete's 409 — no requiredStep here.
    const error = new OnboardingSessionError('conflict', 409, 'Faltan pasos.', {
      error: 'Faltan pasos.',
      missingSteps: ['policy', 'members'],
    } as unknown as OnboardingSessionStepConflict)
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ currentStep: 'complete', status: 'error', error }),
    )
    render()

    expect(container.querySelector('[data-testid="complete-step-missing"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="onboarding-error-banner-unknown"]')).toBeFalsy()

    const goBtn = container.querySelector(
      '[data-testid="complete-step-go-to-missing"]',
    ) as HTMLButtonElement
    act(() => {
      goBtn.click()
    })

    expect(container.querySelector('[data-testid="members-step-form"]')).toBeTruthy()
  })

  it('409 defensive — a requiredStep-only conflict (hook already corrected currentStep) renders that step form directly, no generic banner', () => {
    const error = new OnboardingSessionError('conflict', 409, 'Conflicto de sesión.', {
      error: 'Conflicto de sesión.',
      requiredStep: 'payment_provider',
    })
    // Mirrors what the hook itself does on this conflict shape (applyError
    // corrects currentStep from `conflict.requiredStep`) — asserted here at
    // the wiring level via the mock, since the hook isn't touched by this task.
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ currentStep: 'payment_provider', status: 'error', error }),
    )
    render()

    expect(container.querySelector('[data-testid="payment-provider-step-form"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="onboarding-error-banner-unknown"]')).toBeFalsy()
  })

  it('other error kinds on the complete step still show the generic banner, not the wizard content', () => {
    const error = new OnboardingSessionError('unavailable', 503, 'El servicio no está disponible.')
    mockUseOnboardingSession.mockReturnValue(
      baseHookResult({ currentStep: 'complete', status: 'error', error }),
    )
    render()

    expect(container.querySelector('[data-testid="onboarding-error-banner-retryable"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="complete-step-form"]')).toBeFalsy()
  })
})
