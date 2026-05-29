/**
 * page.test.tsx — Phase 35 plan 35-10
 *
 * Smoke test for CostosPage: verifies the page renders without crashing
 * when useCostos returns null data (simulates loading / no-data state).
 * Guards against null-pointer errors on all optional props.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Mock useCostos — returns all-null state (loading + no data)
vi.mock('@/lib/hooks/cotizador/use-costos', () => ({
  useCostos: () => ({
    summaryData: null,
    seriesData: null,
    isLoadingSummary: true,
    isLoadingSeries: true,
    summaryError: null,
    seriesError: null,
    refetchSummary: vi.fn(),
    refetchSeries: vi.fn(),
  }),
}))

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

// Mock child components to isolate page rendering
vi.mock('@/components/inmobiliaria/cotizador/CostKpiStrip', () => ({
  CostKpiStrip: ({ kpis, isLoading }: { kpis: unknown; isLoading: boolean }) =>
    React.createElement('div', { 'data-testid': 'cost-kpi-strip', 'data-loading': isLoading }),
}))

vi.mock('@/components/inmobiliaria/cotizador/CostSourcePieChart', () => ({
  CostSourcePieChart: () => React.createElement('div', { 'data-testid': 'cost-source-pie' }),
}))

vi.mock('@/components/inmobiliaria/cotizador/MonthlyCostTrendChart', () => ({
  MonthlyCostTrendChart: () => React.createElement('div', { 'data-testid': 'monthly-cost-trend' }),
}))

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

import CostosPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('CostosPage', () => {
  it('renders without crashing when summaryData and seriesData are null (null-guard validation)', () => {
    expect(() => {
      act(() => {
        root.render(React.createElement(CostosPage))
      })
    }).not.toThrow()

    // Verify key sub-components are mounted
    expect(container.querySelector('[data-testid="cost-kpi-strip"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="cost-source-pie"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="monthly-cost-trend"]')).not.toBeNull()
  })

  it('renders page title and subtitle i18n keys', () => {
    act(() => {
      root.render(React.createElement(CostosPage))
    })

    const text = container.textContent ?? ''
    expect(text).toContain('inmobiliaria.ai.cotizador.costos.pageTitle')
    expect(text).toContain('inmobiliaria.ai.cotizador.costos.pageSubtitle')
  })

  it('renders table section with column headers', () => {
    act(() => {
      root.render(React.createElement(CostosPage))
    })

    const text = container.textContent ?? ''
    // Table column header i18n keys should be rendered
    expect(text).toContain('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colSource')
    expect(text).toContain('inmobiliaria.ai.cotizador.costos.sourceBreakdown.colTotal')
  })
})
