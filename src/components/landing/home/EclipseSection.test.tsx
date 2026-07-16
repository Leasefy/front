/**
 * EclipseSection.test.tsx — the "eclipse": a plain `var(--night)` dot (NO
 * gradient — locked per HANDOFF "reglas de oro", the user explicitly
 * rejected a full-color orb) that grows into a dark panel as the section
 * scrolls through view. Ring glow fades before full coverage (`nfu`,
 * ported algebraically from the standalone's `update()`).
 *
 * Strict TDD rule: never assert scroll-transform numbers or animation
 * frames — only structure (orb exists, no gradient token, panel content
 * renders, reduced-motion shows the final "night" state).
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

import { EclipseSection } from './EclipseSection'

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

describe('<EclipseSection>', () => {
  it('renders the orb structure', () => {
    act(() => {
      root.render(<EclipseSection />)
    })
    expect(container.querySelector('[data-testid="eclipse-section"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="eclipse-orb"]')).toBeTruthy()
  })

  it('never applies a gradient to the orb — the user explicitly rejected a full-color orb', () => {
    act(() => {
      root.render(<EclipseSection />)
    })
    const orb = container.querySelector('[data-testid="eclipse-orb"]') as HTMLElement
    expect(orb.style.background).toBe('var(--night)')
    expect(orb.getAttribute('style')).not.toMatch(/gradient/i)
  })

  it('renders the panel content (heading) that emerges from the eclipse', () => {
    act(() => {
      root.render(<EclipseSection />)
    })
    expect(container.querySelector('[data-testid="eclipse-panel"] h2')).toBeTruthy()
  })

  it('renders the final "night" state with content fully visible when reduced motion is preferred', () => {
    useReducedMotionMock.mockReturnValue(true)
    act(() => {
      root.render(<EclipseSection />)
    })
    const panel = container.querySelector('[data-testid="eclipse-panel"]') as HTMLElement
    // useSectionScroll freezes scrollYProgress at 1 under reduced motion,
    // which this section maps to full coverage/settle — panel content must
    // still be visible (opacity 1), not hidden mid-transition.
    expect(panel.style.opacity).toBe('1')
  })
})
