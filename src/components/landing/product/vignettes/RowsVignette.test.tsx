/**
 * RowsVignette.test.tsx — label→value rows vignette (standalone `VG.rows`,
 * `landing-standalone/index.html` ~L3690-3694). Structure/wiring only.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { RowsVignette } from './RowsVignette'
import type { RowsVignetteData } from '@/lib/landing/types'

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

const DATA: RowsVignetteData = {
  rows: [
    { label: 'Sin atender', value: '0', tone: 'ok' },
    { label: 'Respuesta media', value: '12 min' },
    { label: 'Visitas agendadas', value: '7', tone: 'mb' },
  ],
}

describe('<RowsVignette>', () => {
  it('renders one row per data.rows entry with label and value', () => {
    act(() => {
      root.render(<RowsVignette data={DATA} />)
    })
    const rows = container.querySelectorAll('[data-testid="vg-rows"] .landing-vg-rows__row')
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain('Sin atender')
    expect(rows[0].textContent).toContain('0')
  })

  it('applies the tone modifier class only to rows that carry a tone', () => {
    act(() => {
      root.render(<RowsVignette data={DATA} />)
    })
    const rows = container.querySelectorAll('[data-testid="vg-rows"] .landing-vg-rows__row')
    expect(rows[0].querySelector('.landing-vg-rows__value--ok')).toBeTruthy()
    expect(rows[1].querySelector('.landing-vg-rows__value--ok')).toBeFalsy()
    expect(rows[1].querySelector('.landing-vg-rows__value--mb')).toBeFalsy()
    expect(rows[2].querySelector('.landing-vg-rows__value--mb')).toBeTruthy()
  })
})
