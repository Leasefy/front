/**
 * TopObjectionsTable.test.tsx — Phase 37 plan 37-08
 *
 * Tests for three render branches:
 *   1. populated=true + 10 rows → all 10 data rows rendered (11 total with header)
 *   2. populated=false + reason='insufficient-objections' → SampleDataWatermark + stub rows
 *   3. populated=false + reason='agency-gate' → returns null (empty container)
 *
 * NOTE: @testing-library/react is not installed in this project.
 * Uses createRoot + act pattern (same as Mask.test.tsx baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
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

import { TopObjectionsTable } from './TopObjectionsTable'
import { STUB_TOP_OBJECTIONS } from '@/lib/fixtures/cobranza-analytics-stub'

const TEN_OBJECTIONS = [
  { rank: 1,  literal: 'No tengo plata ahorita',                      count: 12, pct: 0.185 },
  { rank: 2,  literal: 'Llámeme la próxima semana',                   count: 11, pct: 0.169 },
  { rank: 3,  literal: 'Ya hablé con mi jefe de eso',                 count:  9, pct: 0.138 },
  { rank: 4,  literal: 'No reconozco esa deuda',                      count:  8, pct: 0.123 },
  { rank: 5,  literal: 'Estoy esperando mi quincena',                 count:  7, pct: 0.108 },
  { rank: 6,  literal: 'Me van a pagar mañana',                       count:  6, pct: 0.092 },
  { rank: 7,  literal: 'No tengo cómo pagar en este momento',         count:  5, pct: 0.077 },
  { rank: 8,  literal: 'Necesito hablar con alguien primero',         count:  4, pct: 0.062 },
  { rank: 9,  literal: 'Ya estoy arreglando eso con la inmobiliaria', count:  3, pct: 0.046 },
  { rank: 10, literal: 'No vivo ahí hace meses',                      count:  3, pct: 0.046 },
]

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

describe('<TopObjectionsTable>', () => {
  it('renders 11 rows (1 header + 10 data) when populated=true with 10 objections', () => {
    act(() => {
      root.render(
        React.createElement(TopObjectionsTable, {
          data: { populated: true, objections: TEN_OBJECTIONS },
          locale: 'es',
        })
      )
    })
    const rows = container.querySelectorAll('tr')
    expect(rows).toHaveLength(11)
  })

  it('renders SampleDataWatermark + stub rows when populated=false + reason=insufficient-objections', () => {
    act(() => {
      root.render(
        React.createElement(TopObjectionsTable, {
          data: { populated: false, reason: 'insufficient-objections', objections: [] },
          locale: 'es',
        })
      )
    })
    // SampleDataWatermark mock renders role="note" when show=true
    const watermark = container.querySelector('[role="note"]')
    expect(watermark).not.toBeNull()
    // Stub rows should be rendered (STUB_TOP_OBJECTIONS has 10 entries → 10 tbody rows + 1 thead = 11)
    const rows = container.querySelectorAll('tr')
    expect(rows.length).toBeGreaterThan(1)
    // Sanity: STUB_TOP_OBJECTIONS has entries
    expect(STUB_TOP_OBJECTIONS.objections.length).toBe(10)
  })

  it('renders nothing when populated=false + reason=agency-gate', () => {
    act(() => {
      root.render(
        React.createElement(TopObjectionsTable, {
          data: { populated: false, reason: 'agency-gate', objections: [] },
          locale: 'es',
        })
      )
    })
    expect(container.firstChild).toBeNull()
  })
})
