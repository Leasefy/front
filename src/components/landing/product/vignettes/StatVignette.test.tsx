/**
 * StatVignette.test.tsx — display-figure vignette (standalone `VG.stat`,
 * `landing-standalone/index.html` ~L3708-3710). Structure/wiring only.
 * `big` may contain a literal `<em>` for verbatim inline emphasis (see
 * types.ts StatVignetteData.big doc comment) — asserted via innerHTML.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { StatVignette } from './StatVignette'
import type { StatVignetteData } from '@/lib/landing/types'

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

describe('<StatVignette>', () => {
  it('renders the big figure, label, and sub line', () => {
    const data: StatVignetteData = { big: '2.4×', label: 'Ingresos sobre el canon', sub: 'obligaciones al día' }
    act(() => {
      root.render(<StatVignette data={data} />)
    })
    expect(container.querySelector('[data-testid="vg-stat-big"]')?.textContent).toBe('2.4×')
    expect(container.querySelector('[data-testid="vg-stat"]')?.textContent).toContain('Ingresos sobre el canon')
    expect(container.querySelector('[data-testid="vg-stat"]')?.textContent).toContain('obligaciones al día')
  })

  it('renders a literal <em> inside big as real emphasis markup, verbatim', () => {
    const data: StatVignetteData = { big: 'Día <em>1</em>', label: 'Detección del atraso' }
    act(() => {
      root.render(<StatVignette data={data} />)
    })
    const big = container.querySelector('[data-testid="vg-stat-big"]')
    expect(big?.querySelector('em')?.textContent).toBe('1')
    expect(big?.textContent).toBe('Día 1')
  })

  it('omits the sub line when not provided', () => {
    const data: StatVignetteData = { big: '$182.4M', label: 'Recaudado este mes' }
    act(() => {
      root.render(<StatVignette data={data} />)
    })
    expect(container.querySelector('.landing-vg-stat__sub')).toBeFalsy()
  })
})
