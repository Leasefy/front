/**
 * StepsVignette.test.tsx — vertical timeline vignette (standalone
 * `VG.steps`, `landing-standalone/index.html` ~L3703-3707). Structure/
 * wiring only.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { StepsVignette } from './StepsVignette'
import type { StepsVignetteData } from '@/lib/landing/types'

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

const DATA: StepsVignetteData = {
  steps: [
    { title: 'Solicitud capturada', meta: 'WhatsApp · 8:02 a.m.', status: 'done' },
    { title: 'Asignada a Laura', meta: 'SLA 15 min', status: 'on' },
    { title: 'Visita', meta: 'por agendar' },
  ],
}

describe('<StepsVignette>', () => {
  it('renders one item per step with title and meta', () => {
    act(() => {
      root.render(<StepsVignette data={DATA} />)
    })
    const items = container.querySelectorAll('[data-testid="vg-steps"] .landing-vg-steps__item')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toContain('Solicitud capturada')
    expect(items[0].textContent).toContain('WhatsApp · 8:02 a.m.')
  })

  it('applies the status modifier only when a step carries one', () => {
    act(() => {
      root.render(<StepsVignette data={DATA} />)
    })
    const items = container.querySelectorAll('[data-testid="vg-steps"] .landing-vg-steps__item')
    expect(items[0].classList.contains('landing-vg-steps__item--done')).toBe(true)
    expect(items[1].classList.contains('landing-vg-steps__item--on')).toBe(true)
    expect(items[2].classList.contains('landing-vg-steps__item--done')).toBe(false)
    expect(items[2].classList.contains('landing-vg-steps__item--on')).toBe(false)
  })
})
