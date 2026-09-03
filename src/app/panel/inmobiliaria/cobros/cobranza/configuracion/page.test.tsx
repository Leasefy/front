/**
 * CobranzaConfiguracionPage — Phase 2 rewrite (docs/front-cobranza-config.md).
 *
 * Wires the config resources que quedaron: useAgencyPolicy (/policy) y
 * useAutonomy (/cobranza/autonomy). El acuerdo general se mudó a
 * /cobranza/acuerdos y la cadencia salió del panel.
 * Uses createRoot + act (repo convention, no RTL).
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
const mockAutonomyState = {
  data: BASE_AUTONOMY as typeof BASE_AUTONOMY | null,
  isLoading: false,
  error: null as string | null,
  notProvisioned: false,
}

const patchPolicy = vi.fn().mockResolvedValue(undefined)
const refetchPolicy = vi.fn().mockResolvedValue(undefined)
const saveAutonomy = vi.fn().mockResolvedValue(undefined)
const refetchAutonomy = vi.fn().mockResolvedValue(undefined)

// ---------------------------------------------------------------------------
// Mocks (before imports of the module under test)
// ---------------------------------------------------------------------------

// La pantalla lee `?volver=` para ofrecer la vuelta a Acuerdos de pago.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/cobros/cobranza/configuracion',
}))

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

  mockAutonomyState.data = { ...BASE_AUTONOMY }
  mockAutonomyState.isLoading = false
  mockAutonomyState.error = null
  mockAutonomyState.notProvisioned = false

  patchPolicy.mockClear().mockResolvedValue(undefined)
  refetchPolicy.mockClear()
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

// ---------------------------------------------------------------------------
// (a) sections render
// ---------------------------------------------------------------------------
describe('<CobranzaConfiguracionPage> — layout', () => {
  it('renders the config sections that survived', () => {
    render()
    expect(byTestId('section-comercial')).toBeTruthy()
    expect(byTestId('section-autonomia')).toBeTruthy()
    expect(byTestId('section-horario')).toBeTruthy()
  })

  it('ya no monta la cadencia de contacto', () => {
    render()
    // Se sacó del panel: cuándo y por qué canal contacta el agente lo
    // afinamos nosotros. La maquinaria se fue con ella.
    expect(byTestId('section-cadencia')).toBeFalsy()
    expect(byTestId('save-cadencia')).toBeFalsy()
  })

  it('el acuerdo general no aparece acá, ni siquiera como puntero', () => {
    render()
    expect(byTestId('field-maxDiscountPct')).toBeFalsy()
    expect(byTestId('save-negociacion')).toBeFalsy()
    expect(byTestId('section-acuerdo-puntero')).toBeFalsy()
    // Una tarjeta titulada «Acuerdo general» seguiría diciendo que este es su lugar.
    const titulos = [...container.querySelectorAll('h2')].map((h) => h.textContent)
    expect(titulos).not.toContain('Acuerdo general')
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
    const crm = byTestId('field-crmProvider') as HTMLSelectElement
    expect(crm).toBeTruthy()
    expect(crm.disabled).toBe(false)
    expect(byTestId('save-comercial')).toBeTruthy()
  })

  it('renders read-only inputs and no save actions when canAccess(cobranza, configure) is false', () => {
    canConfigure = false
    render()
    const crm = byTestId('field-crmProvider') as HTMLSelectElement
    expect(crm).toBeTruthy()
    expect(crm.disabled).toBe(true)
    expect(byTestId('save-comercial')).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// (c) 404 / notProvisioned handling
// ---------------------------------------------------------------------------

describe('<CobranzaConfiguracionPage> — onboarding incompleto (404)', () => {
  it('shows a dedicated banner per section when notProvisioned, not a generic error', () => {
    mockPolicyState.data = null
    mockPolicyState.notProvisioned = true
    mockAutonomyState.data = null
    mockAutonomyState.notProvisioned = true

    render()

    expect(byTestId('autonomia-not-provisioned')).toBeTruthy()
    // Sin política no se monta la tarjeta comercial.
    expect(byTestId('field-crmProvider')).toBeFalsy()
    // La sección informativa de la ley no depende del onboarding.
    expect(byTestId('section-horario')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// (d) Save wiring per section
// ---------------------------------------------------------------------------

describe('<CobranzaConfiguracionPage> — facturación (PATCH /policy, partial)', () => {
  it('manda SÓLO lo que cambió', async () => {
    render()

    const crm = byTestId('field-crmProvider') as HTMLSelectElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      setter?.call(crm, 'domus')
      crm.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })

    const saveBtn = byTestId('save-comercial') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
    await act(async () => {
      saveBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(patchPolicy).toHaveBeenCalledTimes(1)
    expect(patchPolicy).toHaveBeenCalledWith({ crmProvider: 'domus' })
  })

  it('la comisión se escribe en %, no en fracción', () => {
    render()
    // La política del mock trae 0.08; el campo tiene que decir 8, no 0,08 —
    // que se leería como 0,08 %, cien veces menos.
    const fee = byTestId('field-successFeePct') as HTMLInputElement
    expect(fee.value).toBe('8')
  })

  it('disables the save button when there is nothing dirty', () => {
    render()
    const saveBtn = byTestId('save-comercial') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })
})

describe('<CobranzaConfiguracionPage> — autonomy save (PUT /cobranza/autonomy)', () => {
  it('calls saveAutonomy with the selected level', async () => {
    render()
    const radios = Array.from(
      document.querySelectorAll('input[type="radio"], [role="radio"]'),
    ) as HTMLElement[]
    const target = radios.find((r) => r.getAttribute('value') === 'aprobar')
    expect(target).toBeTruthy()
    await act(async () => {
      target!.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(saveAutonomy).toHaveBeenCalledWith('aprobar')
  })
})
