/**
 * VgCard.test.tsx — the shared `.scard` shell every vignette lives inside
 * (standalone `vgCard`/`vgHead`, `landing-standalone/index.html`
 * ~L3682-3688; HANDOFF §PRODUCTS v3: "cada viñeta vive dentro de una
 * `.scard` del DS del home"). Structure/wiring only.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { VgCard } from './VgCard'
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

const SYS_VIGNETTE: Vignette = {
  kind: 'rows',
  header: { label: 'Hoy', meta: '23 solicitudes', family: 'sys' },
  data: { rows: [] },
}

describe('<VgCard>', () => {
  it('renders the header label and meta, plus the family variant modifier', () => {
    act(() => {
      root.render(
        <VgCard vignette={SYS_VIGNETTE}>
          <span data-testid="child" />
        </VgCard>,
      )
    })
    const card = container.querySelector('[data-testid="vg-card"]')
    expect(card?.getAttribute('data-kind')).toBe('rows')
    expect(card?.querySelector('.landing-vg-card__label')?.textContent).toBe('Hoy')
    expect(card?.querySelector('.landing-vg-card__meta')?.textContent).toBe('23 solicitudes')
    expect(card?.querySelector('.landing-vg-card__head--sys')).toBeTruthy()
  })

  it('applies the ag and chat family variants for their respective headers', () => {
    const agVignette: Vignette = { ...SYS_VIGNETTE, header: { label: 'Cartera', family: 'ag' } }
    const chatVignette: Vignette = { ...SYS_VIGNETTE, header: { label: 'WhatsApp', family: 'chat' } }
    act(() => {
      root.render(
        <>
          <VgCard vignette={agVignette}>
            <span />
          </VgCard>
          <VgCard vignette={chatVignette}>
            <span />
          </VgCard>
        </>,
      )
    })
    expect(container.querySelector('.landing-vg-card__head--ag')).toBeTruthy()
    expect(container.querySelector('.landing-vg-card__head--chat')).toBeTruthy()
  })

  it('renders children inside the body wrapper', () => {
    act(() => {
      root.render(
        <VgCard vignette={SYS_VIGNETTE}>
          <span data-testid="child">body</span>
        </VgCard>,
      )
    })
    const body = container.querySelector('.landing-vg-card__body')
    expect(body?.querySelector('[data-testid="child"]')?.textContent).toBe('body')
  })

  it('renders the corner stamp only when the vignette carries one', () => {
    act(() => {
      root.render(
        <VgCard vignette={SYS_VIGNETTE}>
          <span />
        </VgCard>,
      )
    })
    expect(container.querySelector('[data-testid="vg-card-stamp"]')).toBeFalsy()

    act(() => {
      root.render(
        <VgCard vignette={{ ...SYS_VIGNETTE, stamp: 'Riesgo bajo' }}>
          <span />
        </VgCard>,
      )
    })
    expect(container.querySelector('[data-testid="vg-card-stamp"]')?.textContent).toBe('Riesgo bajo')
  })

  it('omits the meta span when the header carries none', () => {
    act(() => {
      root.render(
        <VgCard vignette={{ ...SYS_VIGNETTE, header: { label: 'Solo label', family: 'sys' } }}>
          <span />
        </VgCard>,
      )
    })
    expect(container.querySelector('.landing-vg-card__meta')).toBeFalsy()
  })
})
