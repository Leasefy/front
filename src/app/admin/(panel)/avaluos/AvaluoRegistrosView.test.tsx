/**
 * AvaluoRegistrosView tests — the pure "records by state" table.
 *
 * Strategy: mount in happy-dom via createRoot + act (repo convention; no
 * @testing-library). Because the view is pure (props in, callbacks out), no
 * next/navigation or fetch mocking is needed.
 *
 * Covers: renders items with their state badge, empty/error/loading states,
 * the state filter changes the query (tab click → onStateChange), pagination
 * advances the page (Siguiente → onPage), and row click navigates.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { AvaluoRegistrosView, type AvaluoRegistrosViewProps } from './AvaluoRegistrosView'
import type { AvaluoListItem } from '@/lib/admin/avaluos'

void React

function makeItem(over: Partial<AvaluoListItem> = {}): AvaluoListItem {
  return {
    id: 'cert-1',
    slug: 'AV-001',
    state: 'firmado',
    valueCop: 250_000_000,
    signedBy: 'admin@leasefy.co',
    signedAt: '2026-07-01T10:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-02T09:00:00Z',
    city: null,
    method: 'comparación de mercado',
    ...over,
  }
}

function baseProps(over: Partial<AvaluoRegistrosViewProps> = {}): AvaluoRegistrosViewProps {
  return {
    activeState: '',
    onStateChange: vi.fn(),
    page: 0,
    onPage: vi.fn(),
    items: [makeItem()],
    total: 1,
    pageSize: 100,
    isLoading: false,
    error: null,
    onRowClick: vi.fn(),
    ...over,
  }
}

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

function render(props: AvaluoRegistrosViewProps) {
  act(() => {
    root.render(<AvaluoRegistrosView {...props} />)
  })
}

/** The rendered filter <button> whose text is exactly `label` (excludes the pills). */
function tabButton(label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === label,
  ) as HTMLButtonElement | undefined
}

describe('AvaluoRegistrosView', () => {
  it('renders one row per item with its state badge and slug', () => {
    render(
      baseProps({
        items: [
          makeItem({ id: 'a', slug: 'AV-001', state: 'firmado' }),
          makeItem({ id: 'b', slug: 'AV-002', state: 'borrador', signedBy: null, signedAt: null }),
        ],
        total: 2,
      }),
    )

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    // State badges rendered with their user-facing labels.
    expect(container.textContent).toContain('Firmado')
    expect(container.textContent).toContain('Borrador')
    // Certificate slugs rendered.
    expect(container.textContent).toContain('AV-001')
    expect(container.textContent).toContain('AV-002')
  })

  it('renders "—" for a refused valuation (null valueCop)', () => {
    render(baseProps({ items: [makeItem({ valueCop: null })], total: 1 }))
    expect(container.textContent).toContain('—')
  })

  it('renders the empty state when there are no items', () => {
    render(baseProps({ items: [], total: 0 }))
    expect(container.textContent).toContain('Sin registros')
  })

  it('renders the error state', () => {
    render(baseProps({ items: undefined, total: undefined, error: new Error('boom') }))
    expect(container.textContent?.toLowerCase()).toContain('error')
    expect(container.textContent).toContain('boom')
  })

  it('renders the loading state', () => {
    render(baseProps({ items: undefined, total: undefined, isLoading: true }))
    expect(container.textContent).toContain('cargando')
  })

  it('marks the active state tab as pressed', () => {
    render(baseProps({ activeState: 'firmado' }))
    expect(tabButton('Firmado')?.getAttribute('aria-pressed')).toBe('true')
    expect(tabButton('Todos')?.getAttribute('aria-pressed')).toBe('false')
  })

  it('changes the query when a state tab is clicked', () => {
    const onStateChange = vi.fn()
    render(baseProps({ onStateChange }))

    act(() => {
      tabButton('Rechazado')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onStateChange).toHaveBeenCalledWith('rechazado')

    act(() => {
      tabButton('Todos')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onStateChange).toHaveBeenCalledWith('')
  })

  it('advances the page when "Siguiente" is clicked', () => {
    const onPage = vi.fn()
    // total > pageSize so the pager renders and "Siguiente" is enabled at page 0.
    render(baseProps({ items: [makeItem()], total: 250, pageSize: 100, page: 0, onPage }))

    const next = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Siguiente'),
    )
    expect(next).toBeTruthy()
    act(() => {
      next?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('navigates on row click', () => {
    const onRowClick = vi.fn()
    render(baseProps({ items: [makeItem({ id: 'cert-42' })], total: 1, onRowClick }))

    const row = container.querySelector('tbody tr')
    act(() => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRowClick).toHaveBeenCalledWith('cert-42')
  })
})
