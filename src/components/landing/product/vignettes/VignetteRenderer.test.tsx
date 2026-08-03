/**
 * VignetteRenderer.test.tsx — the typed dispatcher that mirrors the
 * standalone's `vgOne(v)` (`landing-standalone/index.html` ~L3722):
 * wraps the correct typed body renderer for `vignette.kind` inside
 * `<VgCard>`. This is what `ProductPage` (SLICE 4b) will actually render
 * for every `window`/`stories[].vignette` entry.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { VignetteRenderer } from './VignetteRenderer'
import type { Vignette } from '@/lib/landing/types'

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

function renderVignette(vignette: Vignette) {
  act(() => {
    root.render(<VignetteRenderer vignette={vignette} />)
  })
}

describe('<VignetteRenderer>', () => {
  it('wraps a rows vignette in VgCard and renders RowsVignette', () => {
    renderVignette({
      kind: 'rows',
      header: { label: 'Hoy', family: 'sys' },
      data: { rows: [{ label: 'Sin atender', value: '0', tone: 'ok' }] },
    })
    expect(container.querySelector('[data-testid="vg-card"][data-kind="rows"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-rows"]')).toBeTruthy()
  })

  it('wraps a chat vignette in VgCard and renders ChatVignette', () => {
    renderVignette({
      kind: 'chat',
      header: { label: 'WhatsApp', family: 'chat' },
      data: { messages: [{ direction: 'in', text: 'hola' }] },
    })
    expect(container.querySelector('[data-testid="vg-card"][data-kind="chat"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-chat"]')).toBeTruthy()
  })

  it('wraps a steps vignette in VgCard and renders StepsVignette', () => {
    renderVignette({
      kind: 'steps',
      header: { label: 'Pipeline', family: 'sys' },
      data: { steps: [{ title: 'Paso 1' }] },
    })
    expect(container.querySelector('[data-testid="vg-card"][data-kind="steps"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-steps"]')).toBeTruthy()
  })

  it('wraps a stat vignette in VgCard and renders StatVignette', () => {
    renderVignette({
      kind: 'stat',
      header: { label: 'Recaudo', family: 'sys' },
      data: { big: '$182.4M', label: 'Recaudado este mes' },
    })
    expect(container.querySelector('[data-testid="vg-card"][data-kind="stat"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-stat"]')).toBeTruthy()
  })

  it('wraps a ledger vignette in VgCard and renders LedgerVignette', () => {
    renderVignette({
      kind: 'ledger',
      header: { label: 'Cobros de hoy', family: 'sys' },
      data: { columns: ['A', 'B', 'C'], rows: [{ cells: ['1', '2', '3'] }] },
    })
    expect(container.querySelector('[data-testid="vg-card"][data-kind="ledger"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-ledger"]')).toBeTruthy()
  })

  it('wraps a doc vignette in VgCard and renders DocVignette', () => {
    renderVignette({
      kind: 'doc',
      header: { label: 'Expediente', family: 'sys' },
      stamp: 'Listo para firma',
      data: { title: 'CT-1042', lines: ['línea 1'] },
    })
    expect(container.querySelector('[data-testid="vg-card"][data-kind="doc"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-doc"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="vg-card-stamp"]')?.textContent).toBe('Listo para firma')
  })
})
