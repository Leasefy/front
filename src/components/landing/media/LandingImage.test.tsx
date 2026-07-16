/**
 * LandingImage.test.tsx — asserts the shared next/image wrapper always
 * carries explicit width/height + sizes (prevents CLS), and that the
 * closing-WebP-specific wrapper is lazy (never `priority`) with a
 * blurDataURL placeholder — it sits at the end of a long scroll narrative,
 * not the initial-viewport LCP element (design ADR-7).
 *
 * `next/image`'s real blur placeholder wraps `blurDataURL` inside a
 * generated SVG filter written straight to the `style` attribute; that
 * markup doesn't round-trip reliably through happy-dom's CSSOM, so this
 * test mocks `next/image` and asserts the *props* it receives instead of
 * the rendered CSS — the thing the design/task actually requires (lazy,
 * never priority, blurDataURL passed through).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} data-props={JSON.stringify(props)} />
  },
}))

import { LandingImage, ClosingImage } from './LandingImage'

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

describe('<LandingImage>', () => {
  it('renders an img with explicit width, height and sizes', () => {
    act(() => {
      root.render(
        <LandingImage
          src="/landing/textures/t1.webp"
          alt=""
          width={1600}
          height={1600}
          sizes="(min-width: 1024px) 50vw, 100vw"
        />,
      )
    })
    const img = container.querySelector('img')!
    expect(img).toBeTruthy()
    expect(img.getAttribute('width')).toBe('1600')
    expect(img.getAttribute('height')).toBe('1600')
    expect(img.getAttribute('sizes')).toBe('(min-width: 1024px) 50vw, 100vw')
  })
})

describe('<ClosingImage>', () => {
  it('passes loading="lazy", never priority, and a blurDataURL placeholder to next/image', () => {
    act(() => {
      root.render(<ClosingImage />)
    })
    const img = container.querySelector('[data-testid="next-image-mock"]')!
    expect(img).toBeTruthy()
    const props = JSON.parse(img.getAttribute('data-props')!)
    expect(props.loading).toBe('lazy')
    expect(props.priority).toBeUndefined()
    expect(props.placeholder).toBe('blur')
    expect(props.blurDataURL).toMatch(/^data:image\/webp;base64,/)
    expect(props.src).toContain('cierre.webp')
  })

  it('renders inside a fixed-aspect-ratio box to avoid layout shift', () => {
    act(() => {
      root.render(<ClosingImage />)
    })
    const box = container.querySelector('[data-testid="closing-image-box"]')
    expect(box).toBeTruthy()
  })
})
