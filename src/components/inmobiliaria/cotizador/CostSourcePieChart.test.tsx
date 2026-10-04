import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { CostSourcePieChart } from './CostSourcePieChart'

void React

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

// QA-IA-A (04-10-2026): con gasto cero se dibujaba una torta ENTERA de «IA (Anthropic)».
describe('CostSourcePieChart', () => {
  it('sin gasto dice que no hay gasto, no una torta del 100 % de una fuente', () => {
    act(() =>
      root.render(
        <CostSourcePieChart
          sources={{ anthropicTotal: 0, carrierApiTotal: 0, sekureCommissionTotal: 0, datacreditoTotal: 0 }}
          costSources={[{ key: 'anthropic', label: 'IA (Anthropic)', populated: true, notes: null }] as never}
        />,
      ),
    )
    expect(container.textContent).toContain('Todavía no hay gasto')
    expect(container.textContent).not.toContain('IA (Anthropic)')
    expect(container.querySelector('svg.recharts-surface')).toBeNull()
  })
})
