/**
 * FinanceEquation.test.tsx — the home's "finanzas" beat, ported from the
 * standalone's `#finanzas` section: a checklist of financial capabilities
 * that "adds up" (`fototal`, the `=` line) to a settled cash close. Each
 * checkmark is scroll-scrubbed via `useSectionScroll`, mirroring the
 * standalone's staggered `--dd` reveal — per Strict TDD, only structure and
 * the reduced-motion final state are asserted, never scroll-transform
 * numbers or animation frames.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const useReducedMotionMock = vi.fn(() => false)
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => useReducedMotionMock(),
  }
})

import { FinanceEquation } from './FinanceEquation'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useReducedMotionMock.mockReturnValue(false)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('<FinanceEquation>', () => {
  it('renders the section heading and lead copy', () => {
    act(() => {
      root.render(<FinanceEquation />)
    })
    const section = container.querySelector('[data-testid="finance-equation"]') as HTMLElement
    expect(section.querySelector('h2')?.textContent).toContain('Controla cobros, cartera y pagos')
  })

  it('renders every equation item as a checklist row', () => {
    act(() => {
      root.render(<FinanceEquation />)
    })
    const rows = container.querySelectorAll('[data-testid="finance-equation-item"]')
    expect(rows.length).toBe(5)
    expect(rows[0].textContent).toContain('Cobros y recordatorios automáticos')
    expect(rows[4].textContent).toContain('Comisiones calculadas solas')
  })

  it('renders the settled total line', () => {
    act(() => {
      root.render(<FinanceEquation />)
    })
    expect(container.querySelector('[data-testid="finance-equation-total"]')?.textContent).toContain(
      'Cierre de mes sin sorpresas',
    )
  })

  it('renders the KPI summary panel', () => {
    act(() => {
      root.render(<FinanceEquation />)
    })
    expect(container.querySelector('[data-testid="finance-equation-panel"]')?.textContent).toContain(
      'Pagos recibidos',
    )
  })

  it('renders KPI groups as a valid dl -> div(dt+dd) structure, no stray direct children', () => {
    act(() => {
      root.render(<FinanceEquation />)
    })
    const dl = container.querySelector('.landing-finance__kpis') as HTMLElement
    const groups = Array.from(dl.children)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const childTags = Array.from(group.children).map((child) => child.tagName)
      expect(childTags).toEqual(['DT', 'DD'])
    }
  })

  it('shows a generic month label for the KPI panel header, with no absolute year baked in', () => {
    act(() => {
      root.render(<FinanceEquation />)
    })
    const panel = container.querySelector('[data-testid="finance-equation-panel"]') as HTMLElement
    expect(panel.textContent).toContain('CARTERA · JULIO')
    expect(panel.textContent).not.toMatch(/JULIO\s*\d{4}/)
  })

  it('shows every item and the total fully settled when reduced motion is preferred', () => {
    useReducedMotionMock.mockReturnValue(true)
    act(() => {
      root.render(<FinanceEquation />)
    })
    const rows = Array.from(container.querySelectorAll('[data-testid="finance-equation-item"]')) as HTMLElement[]
    for (const row of rows) {
      expect(row.style.opacity).toBe('1')
    }
    const total = container.querySelector('[data-testid="finance-equation-total"]') as HTMLElement
    expect(total.style.opacity).toBe('1')
  })
})
