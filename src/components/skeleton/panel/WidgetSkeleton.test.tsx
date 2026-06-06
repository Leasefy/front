/**
 * WidgetSkeleton tests — Phase 38 plan 38-02 (D-38-02).
 *
 * Three variants: kpi (label + big number + trend), table (header + 5 RowSkeleton
 * rows), chart (title + tall body + 6 mini ticks).
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { WidgetSkeleton } from './WidgetSkeleton'

void React

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

describe('WidgetSkeleton', () => {
  it('variant="kpi" renders a label, big number (h-8), and trend skeleton', () => {
    act(() => {
      root.render(React.createElement(WidgetSkeleton, { variant: 'kpi' }))
    })

    const bigNumberCells = container.querySelectorAll('.animate-pulse.h-8')
    expect(bigNumberCells.length).toBeGreaterThanOrEqual(1)

    const allCells = container.querySelectorAll('.animate-pulse')
    expect(allCells.length).toBeGreaterThanOrEqual(3) // label + big + trend
  })

  it('variant="table" renders a header skeleton + exactly 5 RowSkeleton rows', () => {
    act(() => {
      root.render(React.createElement(WidgetSkeleton, { variant: 'table' }))
    })

    const rows = container.querySelectorAll('[data-testid="row-skeleton"]')
    expect(rows).toHaveLength(5)

    // 5 rows × 3 cells + 1 header skeleton = 16 .animate-pulse elements
    const allCells = container.querySelectorAll('.animate-pulse')
    expect(allCells).toHaveLength(16)
  })

  it('variant="chart" renders a tall (h-64) chart body skeleton', () => {
    act(() => {
      root.render(React.createElement(WidgetSkeleton, { variant: 'chart' }))
    })

    const tallBody = container.querySelectorAll('.animate-pulse.h-64')
    expect(tallBody.length).toBeGreaterThanOrEqual(1)
  })
})
