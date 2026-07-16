/**
 * CaseRail.test.tsx — the home's case-study beat (standalone's
 * `#testimonios` section: Portofino founders story). Structure only per
 * Strict TDD testing architecture — content reveals via `Reveal`
 * (`whileInView`), no scroll-scrubbing here (that's FinanceEquation).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

import { CaseRail } from './CaseRail'
import { LANDING_PHOTOS } from '@/lib/landing/assets'

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
  vi.restoreAllMocks()
})

describe('<CaseRail>', () => {
  it('renders the case-study heading', () => {
    act(() => {
      root.render(<CaseRail />)
    })
    expect(container.querySelector('[data-testid="case-rail"] h2')?.textContent).toContain('Portofino')
  })

  it('renders the client quote with attribution', () => {
    act(() => {
      root.render(<CaseRail />)
    })
    const blockquote = container.querySelector('[data-testid="case-rail"] blockquote')
    expect(blockquote?.textContent).toContain('cobranza se haga sola')
    expect(container.querySelector('[data-testid="case-rail"] .who')?.textContent).toContain('Juan López')
  })

  it('renders the founders portrait via the shared LANDING_PHOTOS asset', () => {
    act(() => {
      root.render(<CaseRail />)
    })
    const img = container.querySelector('[data-testid="case-rail-portrait"]') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe(LANDING_PHOTOS.foundersPortofino.src)
  })

  it('renders the closing note card', () => {
    act(() => {
      root.render(<CaseRail />)
    })
    expect(container.querySelector('[data-testid="case-rail"] h3')?.textContent).toContain('Operación en calma')
  })
})
