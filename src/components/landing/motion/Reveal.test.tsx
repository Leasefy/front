/**
 * Reveal.test.tsx — scroll-in wrapper used across every landing section.
 * Structural coverage only: children mount, and reduced-motion users get
 * the final-state content with no transition wrapper (per Strict TDD
 * rule: never assert animation frames/transform values).
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

import { Reveal } from './Reveal'

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

describe('<Reveal>', () => {
  it('renders its children', () => {
    act(() => {
      root.render(
        <Reveal>
          <p data-testid="child">hola</p>
        </Reveal>,
      )
    })
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe('hola')
  })

  it('renders final-state children when reduced motion is preferred, with no transition wrapper', () => {
    useReducedMotionMock.mockReturnValue(true)
    act(() => {
      root.render(
        <Reveal>
          <p data-testid="child">hola</p>
        </Reveal>,
      )
    })
    const child = container.querySelector('[data-testid="child"]')
    expect(child?.textContent).toBe('hola')
    // Reduced-motion path bypasses motion.div entirely — no framer-motion
    // style attribute (transform/opacity inline style) should be present.
    expect(child?.parentElement?.hasAttribute('style')).toBe(false)
  })

  it('applies the passed className to the reveal wrapper', () => {
    act(() => {
      root.render(
        <Reveal className="my-class">
          <p>hola</p>
        </Reveal>,
      )
    })
    expect(container.querySelector('.my-class')).toBeTruthy()
  })
})
