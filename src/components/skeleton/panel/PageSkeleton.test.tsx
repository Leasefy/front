/**
 * PageSkeleton tests — Phase 38 plan 38-02 (D-38-02).
 *
 * 4 variants — dashboard (4 kpi cards + 2 chart placeholders), list
 * (search + 5 RowSkeleton rows), wizard (progress + form + buttons),
 * detail (sidebar + main content blocks).
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { PageSkeleton } from './PageSkeleton'

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

describe('PageSkeleton', () => {
  it('variant="dashboard" renders exactly 4 KPI card skeletons', () => {
    act(() => {
      root.render(React.createElement(PageSkeleton, { variant: 'dashboard' }))
    })

    const kpiCards = container.querySelectorAll('[data-testid="kpi-card-skeleton"]')
    expect(kpiCards).toHaveLength(4)
  })

  it('variant="list" renders exactly 5 RowSkeleton rows', () => {
    act(() => {
      root.render(React.createElement(PageSkeleton, { variant: 'list' }))
    })

    const rows = container.querySelectorAll('[data-testid="row-skeleton"]')
    expect(rows).toHaveLength(5)
  })

  it('variant="wizard" renders progress indicator + form fields + button bar', () => {
    act(() => {
      root.render(React.createElement(PageSkeleton, { variant: 'wizard' }))
    })

    const wizard = container.querySelector('[data-testid="wizard-skeleton"]')
    expect(wizard).not.toBeNull()

    // 3 progress steps + (3 fields × 2 skeletons each) + 2 buttons = 11
    const allCells = container.querySelectorAll('.animate-pulse')
    expect(allCells.length).toBeGreaterThanOrEqual(11)
  })

  it('variant="detail" renders a main content column + sidebar column', () => {
    act(() => {
      root.render(React.createElement(PageSkeleton, { variant: 'detail' }))
    })

    const main = container.querySelector('[data-testid="detail-main"]')
    const sidebar = container.querySelector('[data-testid="detail-sidebar"]')
    expect(main).not.toBeNull()
    expect(sidebar).not.toBeNull()

    const mainBlocks = main?.querySelectorAll('.animate-pulse') ?? []
    expect(mainBlocks.length).toBeGreaterThanOrEqual(4)
  })
})
