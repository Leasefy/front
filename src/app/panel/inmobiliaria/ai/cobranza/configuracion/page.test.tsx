/**
 * CobranzaConfiguracionPage — Phase 2 rewrite (docs/front-cobranza-config.md).
 *
 * Wires the 3 REAL config resources (useAgencyPolicy /policy, useCadence
 * /cobranza/cadence, useAutonomy /cobranza/autonomy) instead of the decorative
 * /policies (plural) journal. Uses createRoot + act (repo convention, no RTL).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mock state (mutable per-test)
// ---------------------------------------------------------------------------

const BASE_POLICY = {
  tenantId: 'agency-001',
  maxDiscountPct: 0.1,
  maxPlanMonths: 6,
  minPaymentCop: 50000,
  autoEscalateAfterDays: 60,
  allowHardshipPath: true,
  billingModel: 'performance',
  successFeePct: 0.08,
  monthlyMinCop: 0,
  perDeudorCop: 0,
  baseFeeCop: 0,
  hybridPct: 0,
  alegraAccountId: null,
  crmCredentialsConfigured: false,
  centralCredentialsConfigured: false,
  legalCredentialsConfigured: false,
  paymentCredentialsConfigured: false,
  wasiAccountId: null,
  datacreditoAccountId: null,
  transunionAccountId: null,
  certicamaraAccountId: null,
  wompiAccountId: null,
  boldAccountId: null,
  allowedPaymentPlans: [3, 6, 12],
  negotiationMaxAttempts: 3,
  crmProvider: 'wasi' as const,
  erpProvider: 'alegra' as const,
  dailyReportThresholds: null,
  dailyReportWhatsappEnabled: false,
  siniestroCanonesThreshold: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const BASE_CADENCE = {
  S0: [{ dayOffset: -7, channel: 'whatsapp' as const, reason: 'pre_due_t_minus_7', retryUntilConnect: false }],
  S1: [],
  S2: [],
  S3: [],
  S4: [],
  S5: [],
  SX: [],
}

const BASE_AUTONOMY = {
  agencyId: 'agency-001',
  autonomyLevel: 'automatico_completo' as const,
  requiresHumanApproval: false,
  isDefault: true,
}

let canConfigure = true

const mockPolicyState = {
  data: BASE_POLICY as typeof BASE_POLICY | null,
  isLoading: false,
  error: null as string | null,
  notProvisioned: false,
}
const mockCadenceState = {
  cadenceConfig: null as typeof BASE_CADENCE | null,
  effectiveConfig: BASE_CADENCE as typeof BASE_CADENCE | null,
  source: 'agency' as 'agency' | 'default',
  isLoading: false,
  error: null as string | null,
  notProvisioned: false,
}
const mockAutonomyState = {
  data: BASE_AUTONOMY as typeof BASE_AUTONOMY | null,
  isLoading: false,
  error: null as string | null,
  notProvisioned: false,
}

const patchPolicy = vi.fn().mockResolvedValue(undefined)
const refetchPolicy = vi.fn().mockResolvedValue(undefined)
const saveCadence = vi.fn().mockResolvedValue(undefined)
const refetchCadence = vi.fn().mockResolvedValue(undefined)
const saveAutonomy = vi.fn().mockResolvedValue(undefined)
const refetchAutonomy = vi.fn().mockResolvedValue(undefined)

// ---------------------------------------------------------------------------
// Mocks (before imports of the module under test)
// ---------------------------------------------------------------------------

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    permissions: null,
    isLoading: false,
    error: null,
    canAccess: (_module: string, action: string) => (action === 'configure' ? canConfigure : true),
    isAdmin: false,
    agencyRole: canConfigure ? 'ADMIN' : 'VIEWER',
    refetch: vi.fn(),
  }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/hooks/cobranza/use-agency-policy', () => ({
  useAgencyPolicy: () => ({
    data: mockPolicyState.data,
    isLoading: mockPolicyState.isLoading,
    error: mockPolicyState.error,
    notProvisioned: mockPolicyState.notProvisioned,
    refetch: refetchPolicy,
    patchPolicy,
  }),
}))

vi.mock('@/lib/hooks/cobranza/use-cadence', () => ({
  useCadence: () => ({
    cadenceConfig: mockCadenceState.cadenceConfig,
    effectiveConfig: mockCadenceState.effectiveConfig,
    source: mockCadenceState.source,
    isLoading: mockCadenceState.isLoading,
    error: mockCadenceState.error,
    notProvisioned: mockCadenceState.notProvisioned,
    refetch: refetchCadence,
    saveCadence,
  }),
}))

vi.mock('@/lib/hooks/cobranza/use-autonomy', () => ({
  useAutonomy: () => ({
    data: mockAutonomyState.data,
    isLoading: mockAutonomyState.isLoading,
    error: mockAutonomyState.error,
    notProvisioned: mockAutonomyState.notProvisioned,
    refetch: refetchAutonomy,
    saveAutonomy,
  }),
}))

import CobranzaConfiguracionPage from './page'

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  canConfigure = true
  mockPolicyState.data = { ...BASE_POLICY, allowedPaymentPlans: [...BASE_POLICY.allowedPaymentPlans] }
  mockPolicyState.isLoading = false
  mockPolicyState.error = null
  mockPolicyState.notProvisioned = false

  mockCadenceState.cadenceConfig = null
  mockCadenceState.effectiveConfig = {
    S0: BASE_CADENCE.S0.map((e) => ({ ...e })),
    S1: [],
    S2: [],
    S3: [],
    S4: [],
    S5: [],
    SX: [],
  }
  mockCadenceState.source = 'agency'
  mockCadenceState.isLoading = false
  mockCadenceState.error = null
  mockCadenceState.notProvisioned = false

  mockAutonomyState.data = { ...BASE_AUTONOMY }
  mockAutonomyState.isLoading = false
  mockAutonomyState.error = null
  mockAutonomyState.notProvisioned = false

  patchPolicy.mockClear().mockResolvedValue(undefined)
  refetchPolicy.mockClear()
  saveCadence.mockClear().mockResolvedValue(undefined)
  refetchCadence.mockClear()
  saveAutonomy.mockClear().mockResolvedValue(undefined)
  refetchAutonomy.mockClear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(<CobranzaConfiguracionPage />)
  })
}

function byTestId(testId: string) {
  return container.querySelector(`[data-testid="${testId}"]`)
}

function setValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

// ---------------------------------------------------------------------------
// (a) 4 sections render
// ---------------------------------------------------------------------------

describe('<CobranzaConfiguracionPage> — layout', () => {
  it('renders all 4 config sections', () => {
    render()
    expect(byTestId('section-negociacion')).toBeTruthy()
    expect(byTestId('section-autonomia')).toBeTruthy()
    expect(byTestId('section-cadencia')).toBeTruthy()
    expect(byTestId('section-horario')).toBeTruthy()
  })

  it('renders the fixed Ley 2300 schedule with no editable inputs', () => {
    render()
    const section = byTestId('section-horario') as HTMLElement
    expect(section).toBeTruthy()
    expect(section.querySelectorAll('input, select, button').length).toBe(0)
    expect(section.textContent).toMatch(/07:00/)
    expect(section.textContent).toMatch(/2300/)
  })
})

// ---------------------------------------------------------------------------
// (b) Role gate
// ---------------------------------------------------------------------------

describe('<CobranzaConfiguracionPage> — role gate', () => {
  it('renders editable inputs and a save button when canAccess(cobranza, configure) is true', () => {
    render()
    const discountInput = byTestId('field-maxDiscountPct') as HTMLInputElement
    expect(discountInput).toBeTruthy()
    expect(discountInput.disabled).toBe(false)
    expect(byTestId('save-negociacion')).toBeTruthy()
  })

  it('renders read-only inputs and no save actions when canAccess(cobranza, configure) is false', () => {
    canConfigure = false
    render()
    const discountInput = byTestId('field-maxDiscountPct') as HTMLInputElement
    expect(discountInput).toBeTruthy()
    expect(discountInput.disabled).toBe(true)
    expect(byTestId('save-negociacion')).toBeFalsy()
    expect(byTestId('save-cadencia')).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// (c) 404 / notProvisioned handling
// ---------------------------------------------------------------------------

describe('<CobranzaConfiguracionPage> — onboarding incompleto (404)', () => {
  it('shows a dedicated banner per section when notProvisioned, not a generic error', () => {
    mockPolicyState.data = null
    mockPolicyState.notProvisioned = true
    mockCadenceState.effectiveConfig = null
    mockCadenceState.notProvisioned = true
    mockAutonomyState.data = null
    mockAutonomyState.notProvisioned = true

    render()

    expect(byTestId('negociacion-not-provisioned')).toBeTruthy()
    expect(byTestId('cadencia-not-provisioned')).toBeTruthy()
    expect(byTestId('autonomia-not-provisioned')).toBeTruthy()
    // Fields for the not-provisioned section must not render.
    expect(byTestId('field-maxDiscountPct')).toBeFalsy()
    // The static, law-mandated section is unaffected by onboarding status.
    expect(byTestId('section-horario')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// (d) Save wiring per section
// ---------------------------------------------------------------------------

describe('<CobranzaConfiguracionPage> — negotiation save (PATCH /policy, partial)', () => {
  it('calls patchPolicy with ONLY the changed fields', async () => {
    render()

    const discountInput = byTestId('field-maxDiscountPct') as HTMLInputElement
    await act(async () => {
      setValue(discountInput, '0.25')
      await Promise.resolve()
    })

    const saveBtn = byTestId('save-negociacion') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
    await act(async () => {
      saveBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(patchPolicy).toHaveBeenCalledTimes(1)
    expect(patchPolicy).toHaveBeenCalledWith({ maxDiscountPct: 0.25 })
  })

  it('disables the save button when there is nothing dirty', () => {
    render()
    const saveBtn = byTestId('save-negociacion') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })
})

describe('<CobranzaConfiguracionPage> — autonomy save (PUT /cobranza/autonomy)', () => {
  it('calls saveAutonomy with the selected level', async () => {
    render()

    const option = byTestId('autonomy-option-aprobar') as HTMLElement
    expect(option).toBeTruthy()
    await act(async () => {
      option.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(saveAutonomy).toHaveBeenCalledTimes(1)
    expect(saveAutonomy).toHaveBeenCalledWith('aprobar')
  })
})

describe('<CobranzaConfiguracionPage> — cadence save (PUT /cobranza/cadence)', () => {
  it('calls saveCadence with the updated effectiveConfig after adding a touch to S0', async () => {
    render()

    const addBtn = byTestId('cadence-add-S0') as HTMLButtonElement
    await act(async () => {
      addBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const saveBtn = byTestId('save-cadencia') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
    await act(async () => {
      saveBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(saveCadence).toHaveBeenCalledTimes(1)
    const sentConfig = saveCadence.mock.calls[0][0]
    expect(sentConfig.S0).toHaveLength(2)
    expect(sentConfig.S1).toEqual([])
  })

  it('renders the source chip reflecting the hook source', () => {
    mockCadenceState.source = 'default'
    render()
    expect(byTestId('cadence-source-chip')?.textContent).toMatch(/defecto/i)
  })
})
