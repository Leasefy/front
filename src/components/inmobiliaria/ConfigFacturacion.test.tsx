/**
 * ConfigFacturacion — the current plan/price/limits/features come from the REAL
 * agency subscription (useAgencySubscription + useAgencyPlans), NOT the legacy
 * BillingPlan enum. `billing` (useAgencyBilling) only feeds usage/paymentMethod/
 * invoices. Upgrade navigates to /upgrade (no mock dialog).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  toast: { success: (...a: unknown[]) => mockToastSuccess(...a), error: (...a: unknown[]) => mockToastError(...a) },
}))

const mockSelectPlan = vi.fn()
const mockCancelPendingChange = vi.fn()
vi.mock('@/lib/api/agency-subscription.service', () => ({
  agencySubscriptionApi: {
    selectPlan: (...a: unknown[]) => mockSelectPlan(...a),
    cancelPendingChange: (...a: unknown[]) => mockCancelPendingChange(...a),
  },
}))

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

// Hook mocks — driven per test via the mutable holders below.
const subState: { value: ReturnType<typeof makeSub> } = { value: makeSub() }
const plansState: { value: { plans: unknown[]; isLoading: boolean } } = {
  value: { plans: [], isLoading: false },
}

vi.mock('@/lib/hooks/useAgencySubscription', () => ({
  useAgencySubscription: () => subState.value,
}))
vi.mock('@/lib/hooks/useSubscription', () => ({
  useAgencyPlans: () => plansState.value,
}))

import { ApiError } from '@/lib/api/client'
import { ConfigFacturacion } from './ConfigFacturacion'
import type { AgencyBilling, BillingInvoice } from '@/lib/types/inmobiliaria'
import type { AgencyPlan } from '@/lib/types/subscription'

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    currentPlanId: 'pro',
    state: {
      subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' },
      pendingPlanTier: null,
      pendingPlanEffectiveAt: null,
    },
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
    ...overrides,
  }
}

const PRO_PLAN: AgencyPlan = {
  id: 'pro',
  name: 'Pro',
  description: 'Plan pro real',
  pricingModel: 'flat',
  price: { monthly: 250000, yearly: null },
  evaluation: { price: 0, discount: 0, limit: null },
  limits: { properties: 100, users: 10 },
  features: ['Hasta 100 propiedades', 'Scoring premium'],
  level: 1,
  isDefault: false,
}

const STARTER_PLAN: AgencyPlan = {
  id: 'starter',
  name: 'Starter',
  description: 'Plan gratis',
  pricingModel: 'free',
  price: { monthly: 0, yearly: 0 },
  evaluation: { price: 42000, discount: 0, limit: null },
  limits: { properties: 10, users: 2 },
  features: ['Scoring básico'],
  level: 0,
  isDefault: true,
}

const BILLING: AgencyBilling = {
  plan: 'starter',
  cycle: 'monthly',
  pricePerMonth: 99000,
  nextBillingDate: '2026-02-01T00:00:00Z',
  usage: { properties: 12, users: 3, agents: 2 },
  limits: {} as AgencyBilling['limits'],
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  pushMock.mockClear()
  mockToastSuccess.mockClear()
  mockToastError.mockClear()
  mockSelectPlan.mockReset().mockResolvedValue({ subscription: {}, charge: null, outcome: 'SCHEDULED_DOWNGRADE' })
  mockCancelPendingChange.mockReset().mockResolvedValue({})
  subState.value = makeSub()
  plansState.value = { plans: [PRO_PLAN], isLoading: false }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(
  billing: AgencyBilling | null,
  invoices: BillingInvoice[] = [],
) {
  await act(async () => {
    root.render(<ConfigFacturacion billing={billing} invoices={invoices} />)
  })
}

const FACTURA_PAGA: BillingInvoice = {
  id: 'inv-1',
  date: '2026-01-05T00:00:00Z',
  amount: 250000,
  status: 'paid',
  pdfUrl: 'https://facturas.leasefy.co/inv-1.pdf',
} as unknown as BillingInvoice

describe('ConfigFacturacion — real subscription as source of truth', () => {
  it('renders the plan name + features resolved from the agency catalog', async () => {
    await render(BILLING)
    expect(container.textContent).toContain('Plan pro real')
    expect(container.textContent).toContain('Hasta 100 propiedades')
    expect(container.textContent).toContain('Scoring premium')
  })

  it('shows real usage counters against the real plan limits', async () => {
    await render(BILLING)
    // Properties: 12 used / 100 limit from the real plan (not a legacy hardcode).
    expect(container.textContent).toContain('12')
    expect(container.textContent).toContain('/ 100')
  })

  it('shows a safe usage state when billing/usage is absent', async () => {
    await render(null)
    expect(container.textContent).toContain('inmobiliaria.config.billing.usageUnavailable')
    // Plan still renders from the subscription even with no billing payload.
    expect(container.textContent).toContain('Plan pro real')
  })

  it('shows a loading skeleton while the subscription/catalog is loading', async () => {
    subState.value = makeSub({ isLoading: true })
    await render(BILLING)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('falls back to a safe state when the plan cannot be resolved (error)', async () => {
    subState.value = makeSub({ currentPlanId: undefined, state: null, error: new Error('x') })
    await render(BILLING)
    expect(container.textContent).toContain('inmobiliaria.config.billing.planUnavailable')
  })

  // 🔴 El plan lo cambia SÓLO Leasefy (Nico, 04-10-2026): pedirlo, no hacerlo.
  it('«Pedir un cambio de plan» es un correo a Leasefy con el plan actual; no lleva al checkout', async () => {
    await render(BILLING)
    const pedir = container.querySelector<HTMLAnchorElement>('[data-testid="pedir-cambio-de-plan"]')
    expect(pedir?.getAttribute('href')).toMatch(/^mailto:hola@leasefy\.co\?subject=Cambio%20de%20plan/)
    expect(decodeURIComponent(pedir?.getAttribute('href') ?? '')).toContain('Plan actual: Pro')
    expect(container.textContent).not.toContain('inmobiliaria.config.billing.upgradePlan')
    expect(container.querySelector('[data-testid="plan-solo-leasefy"]')?.textContent).toContain(
      'Tu plan y su precio los define Leasefy',
    )
    expect(pushMock).not.toHaveBeenCalledWith('/panel/inmobiliaria/upgrade')
  })

  /*
   * ── Lo que decía y no hacía ────────────────────────────────────────────
   *
   * · «Descargar» tiraba `toast.success('Descargando factura X…')` y NO
   *   descargaba nada, teniendo el PDF en la misma fila (`invoice.pdfUrl`).
   * · «Actualizar» (medio de pago) tiraba DOS avisos —uno acá y otro en el
   *   padre— los dos diciendo «Abriendo formulario de pago…», sin abrir uno.
   */

  it('🔴 «Descargar» abre el PDF de ESA factura, no un aviso', async () => {
    const abrir = vi.fn()
    const original = window.open
    ;(window as unknown as { open: unknown }).open = abrir

    try {
      await render(BILLING, [FACTURA_PAGA])
      const boton = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('common.download'),
      )
      expect(boton).toBeTruthy()
      await act(async () => {
        boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(abrir).toHaveBeenCalledWith(
        'https://facturas.leasefy.co/inv-1.pdf',
        '_blank',
        'noopener,noreferrer',
      )
    } finally {
      ;(window as unknown as { open: unknown }).open = original
    }
  })

  it('🔴 «Actualizar» el medio de pago lleva a /upgrade, que es donde se toca de verdad', async () => {
    const onUpdate = vi.fn()
    await act(async () => {
      root.render(
        <ConfigFacturacion billing={BILLING} invoices={[]} onUpdatePaymentMethod={onUpdate} />,
      )
    })
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.config.billing.update'),
    )
    expect(boton).toBeTruthy()
    await act(async () => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/upgrade')
  })

  it('no repite el título de la sección: el marco de Configuración ya lo pone', async () => {
    await render(BILLING)
    expect(container.querySelectorAll('h2')).toHaveLength(0)
  })
})

function findButton(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  ) as HTMLButtonElement | undefined
}

describe('ConfigFacturacion — cancel at period end / pending change (T-0089)', () => {
  it('shows a pending-change block labeled as CANCELLATION when the pending tier is the catalog default', async () => {
    subState.value = makeSub({
      state: {
        subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' },
        pendingPlanTier: 'starter',
        pendingPlanEffectiveAt: '2026-03-01T00:00:00Z',
      },
    })
    plansState.value = { plans: [PRO_PLAN, STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(container.textContent).toMatch(/cancelaci[oó]n programada/i)
    expect(container.textContent).not.toMatch(/cambio de plan programado/i)
  })

  it('labels a non-default pending tier as a PLAN CHANGE, not a cancellation', async () => {
    subState.value = makeSub({
      state: {
        subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' },
        pendingPlanTier: 'flex',
        pendingPlanEffectiveAt: '2026-03-01T00:00:00Z',
      },
      currentPlanId: 'pro',
    })
    plansState.value = { plans: [PRO_PLAN, STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(container.textContent).toMatch(/cambio de plan programado/i)
    expect(container.textContent).not.toMatch(/cancelaci[oó]n programada/i)
  })

  it('🔴 con un cambio programado, deshacerlo también se PIDE a Leasefy (no llama al back)', async () => {
    subState.value = makeSub({
      state: {
        subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' },
        pendingPlanTier: 'starter',
        pendingPlanEffectiveAt: '2026-03-01T00:00:00Z',
      },
    })
    plansState.value = { plans: [PRO_PLAN, STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(findButton('Deshacer')).toBeFalsy()
    expect(container.querySelector('[data-testid="pedir-deshacer"]')?.getAttribute('href')).toMatch(/^mailto:hola@leasefy\.co/)
    expect(mockCancelPendingChange).not.toHaveBeenCalled()
  })

  it('🔴 «Pedir la cancelación» es un correo a Leasefy: ya no programa la baja directo', async () => {
    subState.value = makeSub({ currentPlanId: 'pro' })
    plansState.value = { plans: [PRO_PLAN, STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(findButton('Cancelar plan')).toBeFalsy()
    const pedir = container.querySelector<HTMLAnchorElement>('[data-testid="pedir-cancelacion"]')
    expect(pedir?.getAttribute('href')).toMatch(/^mailto:hola@leasefy\.co\?subject=Cancelaci%C3%B3n%20del%20plan/)
    expect(mockSelectPlan).not.toHaveBeenCalled()
  })

  it('no ofrece pedir la cancelación en el plan gratuito / por defecto', async () => {
    subState.value = makeSub({ currentPlanId: 'starter' })
    plansState.value = { plans: [STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(container.querySelector('[data-testid="pedir-cancelacion"]')).toBeNull()
  })

  it('ni mientras ya hay un cambio programado', async () => {
    subState.value = makeSub({
      currentPlanId: 'pro',
      state: {
        subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' },
        pendingPlanTier: 'starter',
        pendingPlanEffectiveAt: '2026-03-01T00:00:00Z',
      },
    })
    plansState.value = { plans: [PRO_PLAN, STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(container.querySelector('[data-testid="pedir-cancelacion"]')).toBeNull()
  })

  it('sin voseo: «Pasas a…»', async () => {
    subState.value = makeSub({
      state: {
        subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' },
        pendingPlanTier: 'starter',
        pendingPlanEffectiveAt: '2026-03-01T00:00:00Z',
      },
    })
    plansState.value = { plans: [PRO_PLAN, STARTER_PLAN], isLoading: false }
    await render(BILLING)
    expect(container.textContent).toContain('Pasas a')
    expect(container.textContent).not.toContain('Pasás')
  })
})
