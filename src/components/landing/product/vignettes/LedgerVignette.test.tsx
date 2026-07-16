/**
 * LedgerVignette.test.tsx — 3-column ledger table vignette (standalone
 * `VG.ledger`, `landing-standalone/index.html` ~L3711-3715). Structure/
 * wiring only.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { LedgerVignette } from './LedgerVignette'
import type { LedgerVignetteData } from '@/lib/landing/types'

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

const DATA: LedgerVignetteData = {
  columns: ['Contrato', 'Pago', 'Estado'],
  rows: [
    { cells: ['CT-1042', '$2.450.000', 'Conciliado'], tone: 'ok' },
    { cells: ['CT-0977', '$3.120.000', '→ Cobranza'], tone: 'mb' },
  ],
}

describe('<LedgerVignette>', () => {
  it('renders a header row with the 3 column labels', () => {
    act(() => {
      root.render(<LedgerVignette data={DATA} />)
    })
    const head = container.querySelector('[data-testid="vg-ledger"] .landing-vg-ledger__row--head')
    expect(head?.textContent).toBe('ContratoPagoEstado')
  })

  it('renders one data row per entry with its cells in order', () => {
    act(() => {
      root.render(<LedgerVignette data={DATA} />)
    })
    const rows = container.querySelectorAll(
      '[data-testid="vg-ledger"] .landing-vg-ledger__row:not(.landing-vg-ledger__row--head)',
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toBe('CT-1042$2.450.000Conciliado')
  })

  it('applies the tone modifier to the 3rd cell only when the row carries a tone', () => {
    act(() => {
      root.render(<LedgerVignette data={DATA} />)
    })
    const rows = container.querySelectorAll(
      '[data-testid="vg-ledger"] .landing-vg-ledger__row:not(.landing-vg-ledger__row--head)',
    )
    expect(rows[0].querySelector('.landing-vg-ledger__cell--ok')).toBeTruthy()
    expect(rows[1].querySelector('.landing-vg-ledger__cell--mb')).toBeTruthy()
  })
})
