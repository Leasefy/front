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
// N-13 (QA-PAGOS-95 r2): la autonomía se guarda como modo del Piloto.
const { putPiloto } = vi.hoisted(() => ({ putPiloto: vi.fn() }))
vi.mock('@/lib/api/piloto', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/piloto')>()),
  putPilotoAutonomia: (...a: unknown[]) => putPiloto(...a),
}))
const refetchAutonomy = vi.fn().mockResolvedValue(undefined)

// ---------------------------------------------------------------------------
// Mocks (before imports of the module under test)
// ---------------------------------------------------------------------------

// La pantalla lee `?volver=` para ofrecer la vuelta a Acuerdos de pago.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/pagos/cobranza/configuracion',
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

// Promesas de pago (07-10-2026): su propia prueba vive junto al componente.
vi.mock('@/lib/hooks/cobranza/use-ajustes-de-la-cobranza', () => ({
  useAjustesDeLaCobranza: () => ({
    data: {
      disponible: true,
      diasDeGraciaDeLaPromesa: 7,
      experimentosPrendidos: true,
      porDefecto: true,
      actualizadoPor: null,
      actualizadoAt: null,
    },
    isLoading: false,
    fallo: null,
    refetch: vi.fn(),
    guardar: vi.fn(),
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
  putPiloto.mockReset().mockResolvedValue({ ok: true, data: {} })
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

/** Con la sesión de una inmobiliaria (los modos del Piloto se guardan por agencia). */
async function renderConAgencia() {
  const { AuthContext } = await import('@/lib/auth/auth-context')
  const auth = { agency: { id: 'ag-1', name: 'Inmobiliaria' } } as unknown as React.ContextType<typeof AuthContext>
  act(() => {
    root.render(
      <AuthContext.Provider value={auth}>
        <CobranzaConfiguracionPage />
      </AuthContext.Provider>,
    )
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

  it('monta «Promesas de pago» con los días de gracia', () => {
    render()
    expect(byTestId('section-promesas')).toBeTruthy()
    expect((byTestId('dias-de-gracia-de-la-promesa') as HTMLInputElement).value).toBe('7')
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
    const crm = byTestId('field-crmProvider') as HTMLButtonElement
    expect(crm).toBeTruthy()
    expect(crm.disabled).toBe(false)
    expect(byTestId('save-comercial')).toBeTruthy()
  })

  it('renders read-only inputs and no save actions when canAccess(cobranza, configure) is false', () => {
    canConfigure = false
    render()
    const crm = byTestId('field-crmProvider') as HTMLButtonElement
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

// 🔴 El modelo de cobro con Leasefy lo cambia SÓLO Leasefy (Nico, 04-10-2026):
// la inmobiliaria lo ve en sólo lectura, con «Para cambiarlo, escríbenos».
describe('<CobranzaConfiguracionPage> — el modelo de cobro es de sólo lectura', () => {
  it('muestra el modelo y la comisión en %, sin campos para cambiarlos', () => {
    render()
    expect(byTestId('valor-billingModel')?.textContent).toBe('Por resultado')
    expect(byTestId('valor-successFeePct')?.textContent).toBe('8 %')
    expect(byTestId('field-billingModel')).toBeFalsy()
    expect(byTestId('field-successFeePct')).toBeFalsy()
    expect(byTestId('modelo-de-cobro-solo-leasefy')?.textContent).toContain('Para cambiarlo, escríbenos')
  })

  it('también el administrador de la inmobiliaria lo ve sólo para leer', () => {
    canConfigure = true
    render()
    expect(byTestId('field-successFeePct')).toBeFalsy()
    expect(byTestId('modelo-de-cobro')).toBeTruthy()
  })

  it('el guardado de integraciones arranca apagado (no hay nada que guardar)', () => {
    render()
    const saveBtn = byTestId('save-comercial') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })
})

describe('<CobranzaConfiguracionPage> — autonomy save (PUT /cobranza/autonomy)', () => {
  // N-13 (QA-PAGOS-95 r2; decisión de Nico 17-09): los TRES modos del Piloto;
  // elegir uno lo guarda en el Piloto, no en el nivel de cuatro peldaños.
  it('elegir «Copiloto» lo guarda en el Piloto (PUT …/agentes/cobranza/autonomia)', async () => {
    await renderConAgencia()
    const radios = Array.from(
      document.querySelectorAll('input[type="radio"], [role="radio"]'),
    ) as HTMLElement[]
    expect(radios.some((r) => r.getAttribute('value') === 'aprobar')).toBe(false)
    const target = radios.find((r) => r.getAttribute('value') === 'copiloto')
    expect(target).toBeTruthy()
    await act(async () => {
      target!.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(putPiloto).toHaveBeenCalledWith('ag-1', 'cobranza', 'copiloto')
    expect(saveAutonomy).not.toHaveBeenCalled()
  })
})

// ── Errores: la regla de oro (02-10-2026) ────────────────────────────────────
// Antes los dos guardados decían «…Intenta de nuevo.» ante cualquier fallo, y
// el de la política ni se pintaba (se guardaba en un estado que nadie leía).

describe('<CobranzaConfiguracionPage> — errores al guardar', () => {
  // El modelo de cobro ya no se edita acá (04-10-2026): el PATCH de la
  // política se dispara con el aviso diario por WhatsApp.
  async function guardarComision() {
    const interruptor = byTestId('field-dailyReportWhatsappEnabled') as HTMLButtonElement
    await act(async () => {
      interruptor.click()
      await Promise.resolve()
    })
    await act(async () => {
      ;(byTestId('save-aviso') as HTMLButtonElement).click()
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('la política: un 400 del micro muestra su `message` junto al botón, no «Intenta de nuevo»', async () => {
    const { ApiError } = await import('@/lib/api/client')
    patchPolicy.mockRejectedValue(
      new ApiError(400, 'La comisión no puede pasar del 50 %.', 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        message: 'La comisión no puede pasar del 50 %.',
      }),
    )
    render()
    await guardarComision()
    const error = byTestId('aviso-save-error')
    expect(error?.textContent).toBe('La comisión no puede pasar del 50 %.')
    expect(error?.getAttribute('role')).toBe('alert')
  })

  it('la política: un PATCH que no sale (status 0) habla de la conexión', async () => {
    patchPolicy.mockRejectedValue(new TypeError('Failed to fetch'))
    render()
    await guardarComision()
    expect(byTestId('aviso-save-error')?.textContent).toMatch(/conexi[oó]n/i)
  })

  it('la autonomía: un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    const { ApiError } = await import('@/lib/api/client')
    putPiloto.mockResolvedValue({
      ok: false,
      fallo: new ApiError(500, '', 'internal_error', { error: 'internal_error', requestId: '9f8e7d6c-0000-4000-8000-000000000000' }),
    })
    await renderConAgencia()
    const radios = Array.from(
      document.querySelectorAll('input[type="radio"], [role="radio"]'),
    ) as HTMLElement[]
    await act(async () => {
      radios.find((r) => r.getAttribute('value') === 'copiloto')!.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    const texto = byTestId('autonomia-save-error')?.textContent ?? ''
    expect(texto).toContain('No pudimos guardar el modo de la cobranza: algo falló de nuestro lado')
    expect(texto).toContain('9f8e7d6c')
    expect(texto).not.toMatch(/conexi[oó]n|Intenta de nuevo/i)
  })
})
