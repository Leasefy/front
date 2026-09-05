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

import { ConfigFacturacion } from './ConfigFacturacion'
import type { AgencyBilling, BillingInvoice } from '@/lib/types/inmobiliaria'
import type { AgencyPlan } from '@/lib/types/subscription'

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    currentPlanId: 'pro',
    state: { subscription: { currentPeriodEnd: '2026-03-01T00:00:00Z' } },
    isLoading: false,
    error: null as Error | null,
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

  it('navigates to /upgrade on the upgrade button (no mock dialog)', async () => {
    await render(BILLING)
    const buttons = Array.from(container.querySelectorAll('button'))
    const upgradeBtn = buttons.find((b) =>
      b.textContent?.includes('inmobiliaria.config.billing.upgradePlan'),
    )
    expect(upgradeBtn).toBeTruthy()
    await act(async () => {
      upgradeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/upgrade')
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
