/**
 * RecoveryRateChart.test.tsx — Phase 37 plan 37-08
 *
 * Tests for three render branches:
 *   1. populated=true → SVG chart rendered
 *   2. populated=false + reason='agency-gate' → NoDataYetBadge (no SVG)
 *   3. populated=false + reason='insufficient-buckets' → SampleDataWatermark + SVG
 *
 * NOTE: @testing-library/react is not installed in this project.
 * Uses createRoot + act pattern (same as Mask.test.tsx baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock recharts entirely to avoid ResizeObserver / SVG rendering issues in happy-dom.
// LineChart is replaced with a real <svg> element so tests can assert svg presence.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  LineChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('svg', { 'data-testid': 'line-chart' }, children),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

// Mock NoDataYetBadge
vi.mock('@/components/data-display/no-data-yet-badge', () => ({
  NoDataYetBadge: ({ reason }: { reason: string }) =>
    React.createElement('div', { 'data-testid': 'no-data-yet-badge' }, reason),
}))

// Mock SampleDataWatermark
vi.mock('@/components/data-display/SampleDataWatermark', () => ({
  SampleDataWatermark: ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    React.createElement(
      'div',
      { role: show ? 'note' : undefined, 'data-testid': 'sample-data-watermark', 'data-show': String(show) },
      children
    ),
}))

import { RecoveryRateChart } from './RecoveryRateChart'
import { STUB_RECOVERY_RATE } from '@/lib/fixtures/cobranza-analytics-stub'

// Minimal populated fixture — 3 rows for two bucket_dates × stages
const POPULATED_ROWS = [
  {
    bucket_date: '2026-05-01',
    stage: 'S0',
    pct_n: 0.48,
    pct_cop: 0.43,
    debtors_recovered_count: 8,
    debtors_in_stage_count: 17,
    recovered_cop: '1750000',
    total_cop_in_stage: '4100000',
  },
  {
    bucket_date: '2026-05-01',
    stage: 'S1',
    pct_n: 0.32,
    pct_cop: 0.28,
    debtors_recovered_count: 5,
    debtors_in_stage_count: 16,
    recovered_cop: '1200000',
    total_cop_in_stage: '4300000',
  },
  {
    bucket_date: '2026-05-08',
    stage: 'S0',
    pct_n: 0.50,
    pct_cop: 0.45,
    debtors_recovered_count: 9,
    debtors_in_stage_count: 18,
    recovered_cop: '1900000',
    total_cop_in_stage: '4200000',
  },
] as const

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
})

describe('<RecoveryRateChart>', () => {
  it('renders an SVG chart element when populated=true', () => {
    act(() => {
      root.render(
        React.createElement(RecoveryRateChart, {
          data: { populated: true, rows: [...POPULATED_ROWS] },
          locale: 'es',
        })
      )
    })
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders NoDataYetBadge (no chart SVG) when populated=false + reason=agency-gate', () => {
    act(() => {
      root.render(
        React.createElement(RecoveryRateChart, {
          data: { populated: false, reason: 'agency-gate', rows: [] },
          locale: 'es',
        })
      )
    })
    const badge = container.querySelector('[data-testid="no-data-yet-badge"]')
    expect(badge).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders SampleDataWatermark (role=note) AND SVG when populated=false + reason=insufficient-buckets', () => {
    act(() => {
      root.render(
        React.createElement(RecoveryRateChart, {
          data: { populated: false, reason: 'insufficient-buckets', rows: [] },
          locale: 'es',
        })
      )
    })
    // SampleDataWatermark mock renders role="note" when show=true
    const watermark = container.querySelector('[role="note"]')
    expect(watermark).not.toBeNull()
    // Stub data renders behind the watermark — SVG should be present
    expect(container.querySelector('svg')).not.toBeNull()
    // Sanity: STUB_RECOVERY_RATE has rows
    expect(STUB_RECOVERY_RATE.rows.length).toBeGreaterThan(0)
  })
})
