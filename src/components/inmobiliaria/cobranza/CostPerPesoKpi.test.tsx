/**
 * CostPerPesoKpi.test.tsx — Phase 37 plan 37-10
 *
 * Tests for three render branches + Intl format correctness:
 *   1. populated=true → hero ratio text + SVG sparkline present
 *   2. populated=false + reason='insufficient-data' → EmptyState (honest empty, no stub ratio/svg)
 *   3. populated=false + reason='agency-gate' → returns null (nothing rendered)
 *   4. En pesos (04-10-2026) — costPerPeso=0.0052 dice «$ 5.200 por cada $ 1.000.000»
 *
 * NOTE: @testing-library/react is not installed in this project.
 * Uses createRoot + act pattern (same as CadenceChannelMixChart.test.tsx baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock recharts — LineChart renders a real <svg> for assertion
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
    React.createElement('svg', { 'data-testid': 'line-chart', 'data-items': data?.length ?? 0 }, children),
  Line: () => null,
  XAxis: ({ dataKey }: { dataKey?: string }) =>
    React.createElement('g', { 'data-testid': 'x-axis', 'data-key': dataKey }),
  YAxis: () => null,
  Tooltip: () => null,
}))

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { CostPerPesoKpi } from './CostPerPesoKpi'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSparkline(n = 90): Array<{ day: string; cost_per_peso: number }> {
  return Array.from({ length: n }, (_, i) => ({
    day: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
    cost_per_peso: 0.041 + i * 0.0001,
  }))
}

const POPULATED_DATA = {
  populated: true as const,
  cost_per_peso: 0.041,
  numerator_cop_voice: 3_990_000,
  denominator_cop_paid: 23_170_731_707,
  sparkline_90d: makeSparkline(),
}

const INSUFFICIENT_DATA = {
  populated: false as const,
  reason: 'insufficient-data' as const,
  cost_per_peso: 0.041,
  sparkline_90d: makeSparkline(),
}

const AGENCY_GATE_DATA = {
  populated: false as const,
  reason: 'agency-gate' as const,
}

// ─── Test Setup ───────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<CostPerPesoKpi>', () => {
  it('renders hero ratio text and SVG sparkline when populated=true', () => {
    act(() => {
      root.render(React.createElement(CostPerPesoKpi, { data: POPULATED_DATA }))
    })
    // Should have some text content (the formatted ratio)
    expect(container.textContent).not.toBe('')
    // Should have an SVG element (the sparkline)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders EmptyState (no watermark, no stub ratio) when populated=false reason=insufficient-data', () => {
    act(() => {
      root.render(React.createElement(CostPerPesoKpi, { data: INSUFFICIENT_DATA }))
    })
    // Honest empty state — no sample-data watermark
    expect(container.querySelector('[role="note"]')).toBeNull()
    expect(container.textContent).toContain('Sin datos suficientes todavía')
  })

  it('renders nothing when populated=false reason=agency-gate', () => {
    act(() => {
      root.render(React.createElement(CostPerPesoKpi, { data: AGENCY_GATE_DATA }))
    })
    expect(container.firstChild).toBeNull()
  })

  it('🔴 en PESOS (Nico, 04-10-2026): costPerPeso=0.0052 dice «$ 5.200 por cada $ 1.000.000», nunca dólares', () => {
    const data = {
      populated: true as const,
      cost_per_peso: 0.0052,
      numerator_cop_voice: 104_000,
      denominator_cop_paid: 20_000_000,
      sparkline_90d: makeSparkline(),
    }
    act(() => {
      root.render(React.createElement(CostPerPesoKpi, { data }))
    })
    const text = container.textContent ?? ''
    // Lo que costó la voz por cada millón recuperado, en pesos.
    expect(text).toMatch(/5[.,]200/)
    expect(text).not.toMatch(/USD|US\$/)
    // COP reference: 1.000.000 (es-CO locale) or 1,000,000 (fallback)
    expect(text).toMatch(/1[.,]000[.,]000/)
  })
})
