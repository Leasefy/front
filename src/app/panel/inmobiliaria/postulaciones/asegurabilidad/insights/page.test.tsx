/**
 * QA-IA-A (04-10-2026): los insights de la inmobiliaria mostraban el «Registro
 * de supuestos» — notas internas del equipo, en inglés («API exists at
 * conecta.segurosbolivar.com but catalog gated»). No van en su panel.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/hooks/cotizador/use-insights', () => ({
  useInsights: () => ({
    approvalRateMonthly: [],
    primaDistribution: [],
    assumptions: [{ id: 'a1', title: 'API exists at conecta.segurosbolivar.com but catalog gated', description: 'Direct fetch (HTTP 403 without login)', state: 'unvalidated', updatedAt: '2026-10-03T00:00:00Z' }],
    monthlyCostTrend: [],
    isLoading: false,
    error: null,
    refetch: () => {},
  }),
}))
vi.mock('@/components/inmobiliaria/cotizador/ApprovalRateMonthlyChart', () => ({ ApprovalRateMonthlyChart: () => null }))
vi.mock('@/components/inmobiliaria/cotizador/PrimaDistributionChart', () => ({ PrimaDistributionChart: () => null }))
vi.mock('@/components/inmobiliaria/cotizador/InsightsMonthlyCostPreview', () => ({ InsightsMonthlyCostPreview: () => null }))
vi.mock('@/components/inmobiliaria/cotizador/InsightsAssumptionTable', () => ({
  InsightsAssumptionTable: () => <div data-testid="registro-de-supuestos">API exists</div>,
}))
vi.mock('@leasefy/cadence', async (original) => ({
  ...(await original<typeof import('@leasefy/cadence')>()),
  CrossFade: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import CotizadorInsightsPage from './page'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('Insights de asegurabilidad (panel de la inmobiliaria)', () => {
  it('no muestra el registro interno de supuestos', () => {
    act(() => root.render(<CotizadorInsightsPage />))
    expect(container.querySelector('[data-testid="registro-de-supuestos"]')).toBeNull()
    expect(container.textContent).not.toContain('API exists')
    expect(container.textContent).not.toContain('sections.assumptions')
  })
})
