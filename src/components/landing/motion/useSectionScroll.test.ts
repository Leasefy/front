/**
 * useSectionScroll.test.ts — thin wrapper over framer-motion's `useScroll`
 * shared by every scrubbed landing section (shader hero, eclipse orb,
 * finance equation). Structural coverage only: assert the hook returns a
 * MotionValue and honors reduced-motion with a frozen value — never
 * assert scroll-transform numbers (Strict TDD rule).
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

import { useSectionScroll } from './useSectionScroll'

let container: HTMLDivElement
let root: Root

type Hook = ReturnType<typeof useSectionScroll>

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    const ref = React.useRef<HTMLDivElement>(null)
    latest = useSectionScroll(ref)
    return React.createElement('div', { ref })
  }
  act(() => {
    root.render(React.createElement(TestComponent))
  })
  return { get: () => latest as Hook }
}

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

describe('useSectionScroll', () => {
  it('returns a scrollYProgress MotionValue', () => {
    const hook = renderHook()
    expect(hook.get().scrollYProgress).toBeDefined()
    expect(typeof hook.get().scrollYProgress.get).toBe('function')
  })

  it('returns a frozen MotionValue pinned to 1 when reduced motion is preferred', () => {
    useReducedMotionMock.mockReturnValue(true)
    const hook = renderHook()
    expect(hook.get().scrollYProgress.get()).toBe(1)
  })
})
