/**
 * useMySubscription.test.ts
 *
 * Verifies the fail-closed contract introduced in stg-demo:
 *   (1) On success  → subscription has data, error is null
 *   (2) On API error → subscription is null (NOT defaulted to 'starter'),
 *                      error message is set
 *   (3) refetch clears error and reloads fresh data
 *
 * This contract underpins every consumer that renders plan info:
 * PlanHeader, configuracion/page, and both upgrade pages must check `error`
 * before rendering a plan name.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetMySubscription = vi.fn()

vi.mock('@/lib/api/subscriptions.service', () => ({
  subscriptionsApi: {
    getMySubscription: (...args: unknown[]) => mockGetMySubscription(...args),
    validateCoupon: vi.fn(),
    getPlans: vi.fn().mockResolvedValue([]),
  },
}))

import { useMySubscription } from './useSubscription'

// ── Fixture ───────────────────────────────────────────────────────────────────

const MOCK_SUBSCRIPTION = {
  planId: 'pro',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodEnd: '2026-12-31T00:00:00Z',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Hook = ReturnType<typeof useMySubscription>

let container: HTMLDivElement
let root: Root

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    latest = useMySubscription()
    return null
  }
  act(() => { root.render(React.createElement(TestComponent)) })
  return { get: () => latest as Hook }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
})

// ── (1) Success path ──────────────────────────────────────────────────────────

describe('useMySubscription — success', () => {
  it('returns subscription data and null error on successful fetch', async () => {
    mockGetMySubscription.mockResolvedValueOnce(MOCK_SUBSCRIPTION)

    const hook = renderHook()
    // Initially loading
    expect(hook.get().isLoading).toBe(true)
    expect(hook.get().subscription).toBeNull()

    await act(async () => {})

    expect(hook.get().isLoading).toBe(false)
    expect(hook.get().error).toBeNull()
    expect(hook.get().subscription).toEqual(MOCK_SUBSCRIPTION)
    expect(hook.get().subscription?.planId).toBe('pro')
  })

  it('exposes a refetch function', async () => {
    mockGetMySubscription.mockResolvedValue(MOCK_SUBSCRIPTION)
    const hook = renderHook()
    await act(async () => {})

    expect(typeof hook.get().refetch).toBe('function')
  })
})

// ── (2) Error path ────────────────────────────────────────────────────────────

describe('useMySubscription — error (fail-closed contract)', () => {
  it('sets error and leaves subscription null — does NOT fall back to starter', async () => {
    mockGetMySubscription.mockRejectedValueOnce(new Error('Internal Server Error'))

    const hook = renderHook()
    await act(async () => {})

    expect(hook.get().isLoading).toBe(false)
    // subscription must be null — callers cannot derive a planId from it
    expect(hook.get().subscription).toBeNull()
    // error must be set so callers can show an honest error state
    expect(hook.get().error).not.toBeNull()
    expect(typeof hook.get().error).toBe('string')
  })

  it('preserves the original error message', async () => {
    mockGetMySubscription.mockRejectedValueOnce(new Error('Network timeout'))

    const hook = renderHook()
    await act(async () => {})

    expect(hook.get().error).toBe('Network timeout')
  })

  it('uses a generic message for non-Error throws', async () => {
    mockGetMySubscription.mockRejectedValueOnce('oops')

    const hook = renderHook()
    await act(async () => {})

    expect(hook.get().error).toBeTruthy()
    expect(typeof hook.get().error).toBe('string')
  })
})

// ── (3) refetch recovers from error ──────────────────────────────────────────

describe('useMySubscription — refetch', () => {
  it('clears error and reloads subscription on refetch', async () => {
    // First call fails
    mockGetMySubscription.mockRejectedValueOnce(new Error('5xx'))
    const hook = renderHook()
    await act(async () => {})

    expect(hook.get().error).toBeTruthy()
    expect(hook.get().subscription).toBeNull()

    // Second call succeeds
    mockGetMySubscription.mockResolvedValueOnce(MOCK_SUBSCRIPTION)
    await act(async () => { hook.get().refetch() })
    await act(async () => {})

    expect(hook.get().error).toBeNull()
    expect(hook.get().subscription).toEqual(MOCK_SUBSCRIPTION)
  })
})

// ── mergeBackendIntoAgencyPlan — planes que el front no conoce ───────────────
//
// La base tiene 5 planes de inmobiliaria (starter, pro, pro-plus, ultra, flex)
// y `AGENCY_PLANS` sólo define 4 (starter, pro, flex, enterprise). El fallback
// era `?? AGENCY_PLANS[0]` —Starter—, así que `pro-plus` y `ultra` salían con
// el nombre, la descripción, las features Y EL ID de Starter, conservando sólo
// el precio: «STARTER · 999.000/mes · Scoring básico · Dashboard limitado».

import { mergeBackendIntoAgencyPlan } from './useSubscription'

function backendPlan(over: Record<string, unknown> = {}) {
  return {
    id: 'uuid-1',
    planType: 'AGENCY' as const,
    tier: 'ultra',
    name: 'Ultra',
    monthlyPrice: 999000,
    annualPrice: 0,
    maxProperties: -1,
    hasPremiumScoring: true,
    evaluationCreditPrice: 0,
    ...over,
  }
}

describe('mergeBackendIntoAgencyPlan — un plan desconocido no se disfraza de Starter', () => {
  it('conserva el nombre real que manda el back', () => {
    expect(mergeBackendIntoAgencyPlan(backendPlan()).name).toBe('Ultra')
    expect(
      mergeBackendIntoAgencyPlan(
        backendPlan({ tier: 'pro-plus', name: 'Pro Plus', monthlyPrice: 599000 }),
      ).name,
    ).toBe('Pro Plus')
  })

  it('NO hereda el id de Starter — era lo que encendía tres «SELECCIONADO»', () => {
    // `PricingTable` marca la tarjeta con `plan.id === currentPlanId`. Con
    // todos en 'starter', un usuario en Starter veía tres seleccionadas.
    const ids = ['ultra', 'pro-plus'].map(
      (tier) => mergeBackendIntoAgencyPlan(backendPlan({ tier })).id,
    )
    expect(ids).toEqual(['ultra', 'pro-plus'])
    expect(ids).not.toContain('starter')
  })

  it('NO promete las features del plan gratis a precio de 999.000', () => {
    const p = mergeBackendIntoAgencyPlan(backendPlan())
    expect(p.features).toEqual([])
    expect(p.features).not.toContain('Dashboard limitado')
    expect(p.price.monthly).toBe(999000)
  })

  it('un tier CONOCIDO sigue mezclándose con su plan estático', () => {
    const p = mergeBackendIntoAgencyPlan(
      backendPlan({ tier: 'pro', name: 'Pro', monthlyPrice: 349000, maxProperties: 100 }),
    )
    expect(p.id).toBe('pro')
    expect(p.price.monthly).toBe(349000) // precio del back
    expect(p.features.length).toBeGreaterThan(0) // features del estático
  })

  it('maxProperties -1 sigue significando ilimitado', () => {
    expect(mergeBackendIntoAgencyPlan(backendPlan()).limits.properties).toBeNull()
  })
})
