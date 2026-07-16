/**
 * ShaderHero.test.tsx — the home's opening beat. Per design (§4 Scroll
 * substrate architecture + §8 Testing architecture): render hero heading
 * text immediately as real DOM (LCP), mount the WebGL canvas via
 * `dynamic(..., { ssr:false })` only after WebGL support is confirmed and
 * motion is not reduced; otherwise render a static poster
 * (`LANDING_HERO_FALLBACK`). Coverage here is structural/wiring only —
 * NO shader-internal assertions.
 *
 * `next/dynamic` is mocked to synchronously return a stub component
 * (ignoring the real loader/chunk) — the behavior under test is ShaderHero's
 * own mount/no-mount decision, not real webpack chunk-splitting or
 * `ShaderCanvas`'s WebGL internals (covered separately, minimally, in
 * ShaderCanvas.test.tsx). This avoids flaky multi-hop promise/effect timing
 * for something that isn't part of this component's contract.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const useReducedMotionMock = vi.fn(() => false)
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => useReducedMotionMock(),
  }
})

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

let capturedShaderCanvasProps: Record<string, unknown> = {}
vi.mock('next/dynamic', () => ({
  default: () =>
    function ShaderCanvasStub(props: Record<string, unknown>) {
      capturedShaderCanvasProps = props
      return <div data-testid="shader-canvas-mount" />
    },
}))

import { ShaderHero } from './ShaderHero'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useReducedMotionMock.mockReturnValue(false)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('<ShaderHero>', () => {
  it('renders the hero heading and CTAs as real DOM (LCP), independent of canvas support', () => {
    act(() => {
      root.render(<ShaderHero />)
    })
    expect(container.querySelector('h1')?.textContent).toContain('piloto automático')
    const ctas = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(ctas).toContain('/registro')
    expect(ctas).toContain('/pricing')
  })

  it('renders the static fallback poster when WebGL is unavailable', () => {
    act(() => {
      root.render(<ShaderHero />)
    })
    expect(container.querySelector('[data-testid="shader-hero-fallback"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="shader-canvas-mount"]')).toBeNull()
  })

  it('mounts the shader canvas when WebGL is supported and motion is not reduced', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({}) as unknown as RenderingContext,
    )
    act(() => {
      root.render(<ShaderHero />)
    })
    expect(container.querySelector('[data-testid="shader-canvas-mount"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="shader-hero-fallback"]')).toBeNull()
  })

  it('falls back to the static poster when the shader canvas reports a texture load error', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({}) as unknown as RenderingContext,
    )
    act(() => {
      root.render(<ShaderHero />)
    })
    expect(container.querySelector('[data-testid="shader-canvas-mount"]')).toBeTruthy()

    act(() => {
      ;(capturedShaderCanvasProps.onError as () => void)()
    })

    expect(container.querySelector('[data-testid="shader-hero-fallback"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="shader-canvas-mount"]')).toBeNull()
  })

  it('renders the static fallback when reduced motion is preferred, even if WebGL is supported', () => {
    useReducedMotionMock.mockReturnValue(true)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({}) as unknown as RenderingContext,
    )
    act(() => {
      root.render(<ShaderHero />)
    })
    expect(container.querySelector('[data-testid="shader-hero-fallback"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="shader-canvas-mount"]')).toBeNull()
  })
})
