/**
 * ClosingBanner.test.tsx — the home's final beat, ported from the
 * standalone's closing banner (Ken-Burns backdrop + the 234-frame animated
 * WebP "video" + dark veil + headline + mailto CTA). The animated WebP
 * MUST be rendered via the shared `ClosingImage` (S2) as-is — lazy,
 * unoptimized, blur placeholder, never `priority` — not re-implemented
 * here. Per Strict TDD, only structure/wiring is asserted.
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

import { ClosingBanner } from './ClosingBanner'

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

describe('<ClosingBanner>', () => {
  it('renders the closing headline', () => {
    act(() => {
      root.render(<ClosingBanner />)
    })
    expect(container.querySelector('[data-testid="closing-banner"] h2')?.textContent).toContain(
      'piloto automático',
    )
  })

  it('renders the mailto CTA, matching the standalone (no backend endpoint, ADR-4)', () => {
    act(() => {
      root.render(<ClosingBanner />)
    })
    const cta = container.querySelector('[data-testid="closing-banner-cta"]') as HTMLAnchorElement
    expect(cta.getAttribute('href')).toBe('mailto:hola@leasefy.com')
    expect(cta.textContent).toContain('Hablemos')
  })

  it('renders the shared ClosingImage without priority (not initial-viewport LCP)', () => {
    act(() => {
      root.render(<ClosingBanner />)
    })
    const box = container.querySelector('[data-testid="closing-image-box"]')
    expect(box).toBeTruthy()
    const img = box?.querySelector('[data-testid="next-image-mock"]')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('priority')).toBeNull()
  })
})
