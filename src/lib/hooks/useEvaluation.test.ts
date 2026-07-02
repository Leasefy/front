/**
 * useEvaluation.test.ts
 *
 * Verifies fail-closed behavior after the mock elimination (Grupo 1):
 *   (1) on mount, any legacy score is purged from localStorage
 *   (2) purchaseEvaluation() does NOT persist anything and score stays null
 *   (3) isPaid is always false
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { useEvaluation } from './useEvaluation'

const STORAGE_KEY = 'leasefy_evaluation'

type Hook = ReturnType<typeof useEvaluation>

let container: HTMLDivElement
let root: Root

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    latest = useEvaluation()
    return null
  }
  act(() => { root.render(React.createElement(TestComponent)) })
  return { get: () => latest as Hook }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  localStorage.clear()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
})

// ── (1) legacy data purge ─────────────────────────────────────────────────────

describe('useEvaluation — mount', () => {
  it('removes legacy mock score from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'old-fake', status: 'paid', score: { numericScore: 90 } }))

    const hook = renderHook()
    await act(async () => {})

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(hook.get().score).toBeNull()
    expect(hook.get().evaluation).toBeNull()
    expect(hook.get().isPaid).toBe(false)
  })

  it('evaluation and score are always null even when localStorage was empty', async () => {
    const hook = renderHook()
    await act(async () => {})

    expect(hook.get().evaluation).toBeNull()
    expect(hook.get().score).toBeNull()
  })
})

// ── (2) purchaseEvaluation is a no-op ────────────────────────────────────────

describe('useEvaluation — purchaseEvaluation', () => {
  it('does not persist anything to localStorage and score stays null', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const hook = renderHook()
    await act(async () => {})

    act(() => { hook.get().purchaseEvaluation() })

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(hook.get().score).toBeNull()
    expect(hook.get().isPaid).toBe(false)
    expect(hook.get().evaluation).toBeNull()
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('isPaid remains false after purchaseEvaluation', async () => {
    const hook = renderHook()
    await act(async () => {})

    act(() => { hook.get().purchaseEvaluation() })
    expect(hook.get().isPaid).toBe(false)
  })
})
