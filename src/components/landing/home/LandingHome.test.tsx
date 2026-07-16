/**
 * LandingHome.test.tsx — composes the full theatrical scroll narrative:
 * ShaderHero → EclipseSection → CaseRail → FinanceEquation → ClosingBanner,
 * in that exact order (spec: Home Theatrical Scroll Order). Structure/order
 * only — no scroll-transform or WebGL assertions (covered per-component).
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

vi.mock('next/dynamic', () => ({
  default: () =>
    function ShaderCanvasStub(props: Record<string, unknown>) {
      return <div data-testid="shader-canvas-mount" {...props} />
    },
}))

import { LandingHome } from './LandingHome'

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

describe('<LandingHome>', () => {
  it('renders all five narrative beats in order', () => {
    act(() => {
      root.render(<LandingHome />)
    })
    const shell = container.querySelector('[data-testid="landing-home"]') as HTMLElement
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
