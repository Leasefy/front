/**
 * useHeaderScrollState.test.ts — header state machine seam. `solid`
 * toggles past the ~24px scroll threshold (replaces the standalone's
 * `onScrollHdr`/`__syncHdr`); internal pages force `solid` from first
 * paint via `forceSolid` (no dark hero to sit over).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { useHeaderScrollState } from './useHeaderScrollState'

let container: HTMLDivElement
let root: Root

type Hook = ReturnType<typeof useHeaderScrollState>

function renderHook(forceSolid?: boolean): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    latest = useHeaderScrollState(forceSolid)
    return null
  }
  act(() => {
    root.render(React.createElement(TestComponent))
  })
  return { get: () => latest as Hook }
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  setScrollY(0)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('useHeaderScrollState', () => {
  it('starts not-solid at the top of the page', () => {
    const hook = renderHook()
    expect(hook.get().solid).toBe(false)
  })

  it('becomes solid once scrollY passes the threshold', () => {
    const hook = renderHook()
    setScrollY(48)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(hook.get().solid).toBe(true)
  })

  it('returns to non-solid when scrolling back above the threshold', () => {
    const hook = renderHook()
    setScrollY(48)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(hook.get().solid).toBe(true)

    setScrollY(0)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(hook.get().solid).toBe(false)
  })

  it('is solid from first paint on internal pages via forceSolid, regardless of scroll', () => {
    const hook = renderHook(true)
    expect(hook.get().solid).toBe(true)

    setScrollY(0)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(hook.get().solid).toBe(true)
  })
})
