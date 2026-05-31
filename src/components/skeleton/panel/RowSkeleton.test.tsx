/**
 * RowSkeleton tests — Phase 38 plan 38-02 (D-38-02).
 *
 * RowSkeleton is the single table-row primitive used inside PageSkeleton (list
 * variant) and WidgetSkeleton (table variant). Carries `data-testid="row-skeleton"`
 * for reliable targeting without @testing-library/react.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { RowSkeleton } from './RowSkeleton'

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

describe('RowSkeleton', () => {
  it('renders a row container with 3 Skeleton cells by default', () => {
    act(() => {
      root.render(React.createElement(RowSkeleton))
    })

    const row = container.querySelector('[data-testid="row-skeleton"]')
    expect(row).not.toBeNull()

    const cells = container.querySelectorAll('.animate-pulse')
    expect(cells).toHaveLength(3)
  })

  it('applies custom column widths via col1Width / col2Width / col3Width', () => {
    act(() => {
      root.render(
        React.createElement(RowSkeleton, {
          col1Width: 'w-48',
          col2Width: 'w-36',
          col3Width: 'w-20',
        }),
      )
    })

    const cells = container.querySelectorAll('.animate-pulse')
    expect(cells).toHaveLength(3)
    expect(cells[0].className).toContain('w-48')
    expect(cells[1].className).toContain('w-36')
    expect(cells[2].className).toContain('w-20')
  })
})
