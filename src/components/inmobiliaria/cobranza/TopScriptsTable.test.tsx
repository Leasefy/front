/**
 * TopScriptsTable.test.tsx — Phase 37 plan 37-10
 *
 * TopScriptsTable is permanently deferred (LANDMINE-1). This test asserts:
 *   1. NoDataYetBadge is always rendered (sin la píldora «Fase N»: N-11)
 *   2. No table rows / td / tr elements in the DOM
 *   3. (N-11, QA-PAGOS-95) ya no pinta «Fase 38»
 *
 * Uses createRoot + act pattern (same as CadenceChannelMixChart.test.tsx baseline).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // keep import alive under "jsx": "preserve"

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

// Mock @phosphor-icons/react (used by NoDataYetBadge)
vi.mock('@phosphor-icons/react', () => ({
  Hourglass: () => null,
}))

import { TopScriptsTable } from './TopScriptsTable'

// ─── Test Setup ───────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<TopScriptsTable>', () => {
  it('renders NoDataYetBadge sin la píldora interna «Fase N» (N-11, QA-PAGOS-95)', () => {
    act(() => {
      root.render(React.createElement(TopScriptsTable))
    })
    // Antes pintaba «Fase 38»: la fase interna del desarrollo, ilegible para
    // la inmobiliaria. El aviso sigue (role="status"), sin la jerga.
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    expect(container.textContent).not.toMatch(/Fase \d+/)
  })

  it('renders no table rows or cells', () => {
    act(() => {
      root.render(React.createElement(TopScriptsTable))
    })
    expect(container.querySelectorAll('tr').length).toBe(0)
    expect(container.querySelectorAll('td').length).toBe(0)
  })

  it('renders no table element at all', () => {
    act(() => {
      root.render(React.createElement(TopScriptsTable))
    })
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('tbody')).toBeNull()
  })
})
