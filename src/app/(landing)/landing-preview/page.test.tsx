/**
 * page.test.tsx — /landing-preview staging shell for the home theatrical
 * scroll. SEO guard: metadata.robots MUST spread `landingRobots()` so this
 * in-progress page never gets indexed while LANDING_STAGE is true (spec:
 * Staging Route Isolation).
 *
 * SLICE 3b replaces S3a's interim direct two-section wire (ShaderHero,
 * EclipseSection) with the `<LandingHome>` composer (T3.6), which now
 * renders all five narrative beats in order.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

vi.mock('next/dynamic', () => ({
  default: () =>
    function ShaderCanvasStub(props: Record<string, unknown>) {
      return <div data-testid="shader-canvas-mount" {...props} />
    },
}))

import LandingPreviewPage, { metadata } from './page'
import { landingRobots } from '@/lib/landing/landing-stage'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useReducedMotionMock.mockReturnValue(false)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('/landing-preview page', () => {
  it('spreads landingRobots() into metadata.robots', () => {
    expect(metadata.robots).toEqual(landingRobots())
  })

  it('renders the theatrical scroll shell', () => {
    act(() => {
      root.render(<LandingPreviewPage />)
    })
    expect(container.querySelector('[data-testid="landing-preview-shell"]')).toBeTruthy()
  })

  it('renders the LandingHome composer with all five narrative beats, in order (SLICE 3b)', () => {
    act(() => {
      root.render(<LandingPreviewPage />)
    })
    const shell = container.querySelector('[data-testid="landing-preview-shell"]') as HTMLElement
    expect(shell.querySelector('[data-testid="landing-home"]')).toBeTruthy()
    const beats = Array.from(
      shell.querySelectorAll(
        '[data-testid="shader-hero"], [data-testid="eclipse-section"], [data-testid="case-rail"], [data-testid="finance-equation"], [data-testid="closing-banner"]',
      ),
    )
    expect(beats.map((el) => el.getAttribute('data-testid'))).toEqual([
      'shader-hero',
      'eclipse-section',
      'case-rail',
      'finance-equation',
      'closing-banner',
    ])
  })
})
