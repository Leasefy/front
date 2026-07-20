/**
 * ConfigFacturacion — must render a safe empty state (not crash) when the
 * billing payload is absent or incomplete (billing-less / un-provisioned
 * agency, or a partial response missing usage/limits).
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

import { ConfigFacturacion } from './ConfigFacturacion'
import { PLAN_LIMITS, type AgencyBilling } from '@/lib/types/inmobiliaria'

const FULL_BILLING: AgencyBilling = {
  plan: 'starter',
  cycle: 'monthly',
  pricePerMonth: 99000,
  nextBillingDate: '2026-02-01T00:00:00Z',
  usage: { properties: 3, users: 2, agents: 1 },
  limits: PLAN_LIMITS.starter,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(billing: AgencyBilling) {
  await act(async () => {
    root.render(<ConfigFacturacion billing={billing} invoices={[]} />)
  })
}

describe('ConfigFacturacion — missing / incomplete billing', () => {
  it('renders the empty state (no crash) when billing is entirely absent', async () => {
    await render(undefined as unknown as AgencyBilling)
    expect(container.textContent).toContain('inmobiliaria.config.billing.unavailable')
  })

  it('renders the empty state (no crash) when usage/limits are missing (partial billing)', async () => {
    const partial = {
      plan: 'starter',
      cycle: 'monthly',
      pricePerMonth: 99000,
      nextBillingDate: '2026-02-01T00:00:00Z',
      // usage + limits intentionally omitted
    } as unknown as AgencyBilling

    await render(partial)
    expect(container.textContent).toContain('inmobiliaria.config.billing.unavailable')
  })

  it('renders the full billing UI normally when data is present (behavior unchanged)', async () => {
    await render(FULL_BILLING)
    // Not the empty state; the usage section is shown.
    expect(container.textContent).not.toContain('inmobiliaria.config.billing.unavailable')
    expect(container.textContent).toContain('inmobiliaria.config.billing.planUsage')
  })
})
