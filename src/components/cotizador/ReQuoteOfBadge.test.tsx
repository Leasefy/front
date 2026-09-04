/**
 * ReQuoteOfBadge tests — Phase 33 plan 33-05 (D-33-11)
 *
 * Strategy: mount inside happy-dom, mock useI18n + next/link.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// ----- Mocks (declare BEFORE importing the component) ------------------------

const tSpy = vi.fn(
  (key: string, params?: Record<string, string | number>) => {
    if (params?.shortId !== undefined) return `#${params.shortId}`
    return key
  },
)

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: tSpy,
    formatCurrency: (v: number | null) => (v == null ? '—' : `$${v}`),
    formatNumber: (v: number | null) => (v == null ? '—' : String(v)),
    formatDate: () => '',
    formatRelativeDate: () => '',
    setLocale: () => {},
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => {
    void React
    return React.createElement('a', { href, ...rest }, children)
  },
}))

import { ReQuoteOfBadge } from './ReQuoteOfBadge'

void React

// ----- Test harness ---------------------------------------------------------

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  tSpy.mockClear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function mount(parentId: string | null | undefined) {
  act(() => {
    root.render(React.createElement(ReQuoteOfBadge, { parentId }))
  })
}

// ----- Tests ----------------------------------------------------------------

describe('ReQuoteOfBadge', () => {
  it('returns null (no DOM) when parentId is null', () => {
    mount(null)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent ?? '').toBe('')
  })

  it('returns null (no DOM) when parentId is undefined', () => {
    mount(undefined)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent ?? '').toBe('')
  })

  it('renders an anchor with correct href when parentId is a valid UUID', () => {
    const id = 'a1b2c3d4-1111-2222-3333-444455556666'
    mount(id)
    const a = container.querySelector('a')
    expect(a).not.toBeNull()
    expect(a?.getAttribute('href')).toBe(`/panel/inmobiliaria/postulaciones/asegurabilidad/${id}`)
  })

  it('renders the short id (first 8 chars) in the badge label text', () => {
    const id = 'a1b2c3d4-1111-2222-3333-444455556666'
    mount(id)
    expect(container.textContent ?? '').toContain('a1b2c3d4')
  })

  it('calls the i18n t() with the reQuoteOfBadge key and shortId param', () => {
    const id = 'deadbeef-1111-2222-3333-444455556666'
    mount(id)
    expect(tSpy).toHaveBeenCalledWith(
      'inmobiliaria.ai.cotizador.detail.reQuoteOfBadge',
      { shortId: 'deadbeef' },
    )
  })
})
