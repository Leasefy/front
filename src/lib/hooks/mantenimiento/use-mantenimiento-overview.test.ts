/**
 * use-mantenimiento-overview.test.ts — Phase 7 plan 07-01 (Task 3 TDD)
 *
 * Pattern: createRoot + act + a local renderHook probe (NO @testing-library).
 * Mock mode (NEXT_PUBLIC_USE_MOCK_API unset) resolves the KPI envelope after the delay.
 * C7-02: data is the { kpis, generatedAt } ENVELOPE, not bare MaintenanceKpis.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

let _mockAgency: { id: string } | null = { id: 'agency-test-mant' }
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: _mockAgency }),
}))

import { useMantenimientoOverview } from './use-mantenimiento-overview'

let container: HTMLDivElement
let root: Root
const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API
const ORIGINAL_DELAY = process.env.NEXT_PUBLIC_MOCK_DELAY_MS

function renderHook(): { current: ReturnType<typeof useMantenimientoOverview> | null } {
  const result: { current: ReturnType<typeof useMantenimientoOverview> | null } = { current: null }
  function Wrapper() {
    result.current = useMantenimientoOverview()
    return null
  }
  act(() => {
    root.render(React.createElement(Wrapper))
  })
  return result
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_USE_MOCK_API // → mock mode default
  process.env.NEXT_PUBLIC_MOCK_DELAY_MS = '10' // fast mock delay
  _mockAgency = { id: 'agency-test-mant' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
  if (ORIGINAL_MOCK === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK_API
  else process.env.NEXT_PUBLIC_USE_MOCK_API = ORIGINAL_MOCK
  if (ORIGINAL_DELAY === undefined) delete process.env.NEXT_PUBLIC_MOCK_DELAY_MS
  else process.env.NEXT_PUBLIC_MOCK_DELAY_MS = ORIGINAL_DELAY
})

describe('useMantenimientoOverview', () => {
  it('returns the { data, isLoading, error, refetch } shape', () => {
    const result = renderHook()
    expect(result.current).toHaveProperty('data')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
    expect(typeof result.current!.refetch).toBe('function')
  })

  it('resolves the { kpis, generatedAt } envelope in mock mode (C7-02)', async () => {
    const result = renderHook()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    expect(result.current!.isLoading).toBe(false)
    expect(result.current!.error).toBeNull()
    expect(result.current!.data).not.toBeNull()
    // C7-02 envelope shape
    expect(result.current!.data).toHaveProperty('kpis')
    expect(result.current!.data).toHaveProperty('generatedAt')
    expect(result.current!.data!.kpis.reaperturas30dPct).toBeGreaterThan(0)
    expect(typeof result.current!.data!.generatedAt).toBe('string')
    expect(new Date(result.current!.data!.generatedAt).toISOString()).toBe(
      result.current!.data!.generatedAt,
    )
  })

  it('resolves mock data even when agency is null (mock seam needs no agencyId)', async () => {
    _mockAgency = null
    const result = renderHook()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    expect(result.current!.data).not.toBeNull()
    expect(result.current!.data!.kpis).toBeDefined()
  })

  it('real branch bails to isLoading=false when agency is null', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = 'false'
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
    _mockAgency = null
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = renderHook()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(result.current!.isLoading).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    delete process.env.NEXT_PUBLIC_AGENT_URL
  })
})
