/**
 * ChatVignette.test.tsx — WhatsApp-bubble vignette (standalone `VG.chat`,
 * `landing-standalone/index.html` ~L3695-3702). Structure/wiring only.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { ChatVignette } from './ChatVignette'
import type { ChatVignetteData } from '@/lib/landing/types'

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

const DATA: ChatVignetteData = {
  messages: [
    { direction: 'in', text: 'Busco apto de 2 alcobas en Laureles', time: '8:02' },
    { direction: 'out', text: 'Te tengo 3 opciones que encajan', time: '8:14' },
  ],
}

describe('<ChatVignette>', () => {
  it('renders one bubble per message with the right in/out modifier', () => {
    act(() => {
      root.render(<ChatVignette data={DATA} />)
    })
    const bubbles = container.querySelectorAll('[data-testid="vg-chat"] .landing-vg-chat__bubble')
    expect(bubbles).toHaveLength(2)
    expect(bubbles[0].classList.contains('landing-vg-chat__bubble--in')).toBe(true)
    expect(bubbles[1].classList.contains('landing-vg-chat__bubble--out')).toBe(true)
    expect(bubbles[0].textContent).toBe('Busco apto de 2 alcobas en Laureles')
  })

  it('renders the timestamp meta for messages that carry a time', () => {
    act(() => {
      root.render(<ChatVignette data={DATA} />)
    })
    const metas = container.querySelectorAll('[data-testid="vg-chat"] .landing-vg-chat__meta')
    expect(metas).toHaveLength(2)
    expect(metas[0].textContent).toBe('8:02')
  })

  it('omits the meta line for a message with no time', () => {
    const data: ChatVignetteData = { messages: [{ direction: 'in', text: 'Hola' }] }
    act(() => {
      root.render(<ChatVignette data={data} />)
    })
    expect(container.querySelector('.landing-vg-chat__meta')).toBeFalsy()
  })
})
