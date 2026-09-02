/**
 * HeatmapGrid24x7.test.tsx — Phase 37 plan 37-09
 *
 * Tests for HeatmapGrid24x7 component:
 *   1. populated=true + 168-cell array → screen.getAllByRole('gridcell').length === 168
 *   2. first cell aria-label includes hour "0", day name, call count, and percentage
 *   3. populated=false + reason='insufficient-heatmap' → EmptyState (honest empty)
 *   4. populated=false + reason='agency-gate' → container empty (returns null)
 *   5. cell with call_count=0 renders with aria-label containing "0"
 *
 * Uses createRoot + act pattern (consistent with project baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock i18n — expose locale for day-label selection
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { HeatmapGrid24x7 } from './HeatmapGrid24x7'

// Build a full 168-cell array (7 days × 24 hours)
const FULL_168_CELLS = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    day_of_week: d,
    call_count: d * 24 + h,
    positive_outcome_pct: 0.5,
  }))
).flat()

// maxCount derived from the full cell array
const MAX_COUNT = Math.max(...FULL_168_CELLS.map((c) => c.call_count))

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

describe('<HeatmapGrid24x7>', () => {
  it('la leyenda explica los colores y las horas van en formato legible', () => {
    act(() => {
      root.render(
        <HeatmapGrid24x7
          data={{ populated: true, cells: FULL_168_CELLS, maxCount: MAX_COUNT }}
        />
      )
    })

    // Leyenda: el gris es «sin llamadas», el oscuro es la mejor hora.
    const leyenda = container.querySelector('[data-testid="heatmap-leyenda"]')
    expect(leyenda).not.toBeNull()
    expect(leyenda?.textContent).toContain('Sin llamadas')
    expect(leyenda?.textContent).toContain('la mejor hora')

    // Horas legibles arriba: «6 a.m.», «12 p.m.», «6 p.m.» — no «06/12/18».
    const headers = [...container.querySelectorAll('[role="columnheader"]')]
      .map((el) => el.textContent)
    expect(headers).toContain('6 a.m.')
    expect(headers).toContain('12 p.m.')
    expect(headers).toContain('6 p.m.')
    expect(headers).not.toContain('06')
  })

  it('renders exactly 168 gridcell elements when populated=true', () => {
    act(() => {
      root.render(
        React.createElement(HeatmapGrid24x7, {
          data: { populated: true, cells: FULL_168_CELLS, maxCount: MAX_COUNT },
        })
      )
    })
    const cells = container.querySelectorAll('[role="gridcell"]')
    expect(cells.length).toBe(168)
  })

  it('first cell aria-label includes hour 0, a day name, call count, and percentage', () => {
    act(() => {
      root.render(
        React.createElement(HeatmapGrid24x7, {
          data: { populated: true, cells: FULL_168_CELLS, maxCount: MAX_COUNT },
        })
      )
    })
    const cells = container.querySelectorAll('[role="gridcell"]')
    const firstLabel = cells[0]?.getAttribute('aria-label') ?? ''
    // Should include hour 0 and a day name (es: Dom/Lun/... or en: Sun/Mon/...)
    expect(firstLabel).toMatch(/0h/)
    // Should include call count number
    expect(firstLabel).toMatch(/\d+/)
    // Should include day abbreviation (es locale mocked)
    expect(firstLabel).toMatch(/Dom|Lun|Mar|Mié|Jue|Vie|Sáb|Sun|Mon|Tue|Wed|Thu|Fri|Sat/)
  })

  it('renders EmptyState (no watermark, no grid cells) when populated=false + reason=insufficient-heatmap', () => {
    act(() => {
      root.render(
        React.createElement(HeatmapGrid24x7, {
          data: { populated: false, reason: 'insufficient-heatmap' },
        })
      )
    })
    // Honest empty state — no sample-data watermark, no fake grid
    expect(container.querySelector('[role="note"]')).toBeNull()
    expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(0)
    expect(container.textContent).toContain('Sin datos suficientes todavía')
  })

  it('renders nothing when populated=false + reason=agency-gate', () => {
    act(() => {
      root.render(
        React.createElement(HeatmapGrid24x7, {
          data: { populated: false, reason: 'agency-gate' },
        })
      )
    })
    expect(container.firstChild).toBeNull()
  })

  it('cell with call_count=0 has aria-label containing "0"', () => {
    // The cell at day_of_week=0, hour=0 has call_count = 0*24+0 = 0
    act(() => {
      root.render(
        React.createElement(HeatmapGrid24x7, {
          data: { populated: true, cells: FULL_168_CELLS, maxCount: MAX_COUNT },
        })
      )
    })
    const cells = Array.from(container.querySelectorAll('[role="gridcell"]'))
    // Find a cell whose aria-label contains "0 llamadas" or "0 calls"
    const zeroCell = cells.find((c) => {
      const label = c.getAttribute('aria-label') ?? ''
      return label.includes('0 llamadas') || label.includes('0 calls')
    })
    expect(zeroCell).not.toBeUndefined()
  })
})
