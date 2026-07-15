/**
 * CadenceChannelMixChart.test.tsx — Phase 37 plan 37-09
 *
 * Tests for three render branches:
 *   1. populated=true → SVG chart rendered
 *   2. populated=false + reason='agency-gate' → container empty (returns null)
 *   3. populated=false + reason='insufficient-channel-mix' → EmptyState (honest empty)
 *   4. populated=true + 2 channels → x-axis tick count = 2
 *
 * NOTE: @testing-library/react is not installed in this project.
 * Uses createRoot + act pattern (same as RecoveryRateChart.test.tsx baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock recharts entirely — BarChart renders a real <svg> for assertion
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
    React.createElement('svg', { 'data-testid': 'bar-chart', 'data-items': data?.length ?? 0 }, children),
  Bar: () => null,
  XAxis: ({ dataKey }: { dataKey?: string }) =>
    React.createElement('g', { 'data-testid': 'x-axis', 'data-key': dataKey }),
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

// Mock i18n — expose locale for day-label selection
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { CadenceChannelMixChart } from './CadenceChannelMixChart'

// Sample long-format rows for 2 channels × multiple outcomes
const SAMPLE_ROWS = [
  { channel: 'voice' as const,    outcome: 'paid',           count: 12, pct: 0.4 },
  { channel: 'voice' as const,    outcome: 'no_answer',      count: 18, pct: 0.6 },
  { channel: 'whatsapp' as const, outcome: 'paid',           count: 8,  pct: 0.5 },
  { channel: 'whatsapp' as const, outcome: 'broken_promise', count: 8,  pct: 0.5 },
]

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

describe('<CadenceChannelMixChart>', () => {
  it('renders an SVG chart element when populated=true', () => {
    act(() => {
      root.render(
        React.createElement(CadenceChannelMixChart, {
          data: { populated: true, rows: SAMPLE_ROWS },
        })
      )
    })
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders nothing when populated=false + reason=agency-gate', () => {
    act(() => {
      root.render(
        React.createElement(CadenceChannelMixChart, {
          data: { populated: false, reason: 'agency-gate' },
        })
      )
    })
    expect(container.firstChild).toBeNull()
  })

  it('renders EmptyState (no watermark) when populated=false + reason=insufficient-channel-mix', () => {
    act(() => {
      root.render(
        React.createElement(CadenceChannelMixChart, {
          data: { populated: false, reason: 'insufficient-channel-mix' },
        })
      )
    })
    // Honest empty state — no sample-data watermark
    expect(container.querySelector('[role="note"]')).toBeNull()
    expect(container.textContent).toContain('Sin datos suficientes todavía')
  })

  it('renders chart with 2 pivot rows (one per channel) when populated=true with voice + whatsapp', () => {
    act(() => {
      root.render(
        React.createElement(CadenceChannelMixChart, {
          data: { populated: true, rows: SAMPLE_ROWS },
        })
      )
    })
    const svg = container.querySelector('svg[data-testid="bar-chart"]') as HTMLElement | null
    expect(svg).not.toBeNull()
    // BarChart mock receives data array; 2 channels = 2 pivot rows
    expect(svg?.getAttribute('data-items')).toBe('2')
  })
})
