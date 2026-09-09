/**
 * page.test.tsx — Rules-of-Hooks regression + fetch-parity guard for the
 * tenant dashboard home.
 *
 * `useTenantCases()` used to be called AFTER three early returns (loading,
 * onboarding-incomplete, error) — a `react-hooks/rules-of-hooks` violation
 * (`react-hooks/rules-of-hooks`, caught by `pnpm lint`) that crashes React at
 * runtime the moment a mounted instance transitions from one of those early
 * states into the fully-loaded state, because the hook count changes between
 * renders of the SAME component instance.
 *
 * The fix hoists the call above every early return (fixing the violation) but
 * must NOT start fetching case data for a visitor who previously never
 * triggered that fetch — most importantly, every user still mid-onboarding.
 * This suite proves both: no crash across the loading -> loaded transition,
 * and no new fetch while the dashboard isn't actually rendering.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const {
  authMock,
  applicationsMock,
  leasesMock,
  tenantCasesMock,
  featuredPropsMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  applicationsMock: vi.fn(),
  leasesMock: vi.fn(),
  tenantCasesMock: vi.fn(),
  featuredPropsMock: vi.fn(),
}))

vi.mock('@/lib/hooks/useProperties', () => ({
  useFeaturedProperties: () => featuredPropsMock(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authMock(),
}))

vi.mock('@/lib/hooks/use-time-greeting', () => ({
  useTimeGreeting: () => ({ greeting: 'Buenos días' }),
}))

vi.mock('@/lib/hooks/useEvaluation', () => ({
  useEvaluation: () => ({
    evaluation: null,
    isPaid: false,
    score: null,
    purchaseEvaluation: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/useApplications', () => ({
  useTenantApplications: () => applicationsMock(),
}))

vi.mock('@/lib/hooks/useLeases', () => ({
  useLeases: () => leasesMock(),
  useMyPayments: () => ({ getNextPayment: () => null }),
}))

// The aggregator under test — its own network/aggregation behavior has its
// dedicated suite in `use-tenant-cases.test.ts`. Here we only care whether
// the PAGE calls it unconditionally and with the right skip signal.
vi.mock('@/lib/hooks/use-tenant-cases', () => ({
  useTenantCases: (...args: unknown[]) => tenantCasesMock(...args),
}))

vi.mock('@/lib/hooks/use-aprobacion', () => ({
  useAprobacion: () => ({ aprobacion: null, vigente: false }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'es',
    formatCurrency: (n: number) => String(n),
  }),
}))

vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: () => React.createElement('div', { 'data-testid': 'fallo-de-carga' }),
}))

vi.mock('@/components/tenant/PropertyDetailSheet', () => ({
  PropertyDetailSheet: () => null,
}))

vi.mock('@/components/tenant/TenantDashboardEmpty', () => ({
  TenantDashboardEmpty: () => React.createElement('div', { 'data-testid': 'tenant-dashboard-empty' }),
}))

vi.mock('@/components/tenant/TopeAprobadoBanner', () => ({
  TopeAprobadoBanner: () => null,
}))

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: () => null,
}))

vi.mock('@/components/tenant/ScoreCard', () => ({
  ScoreCard: () => React.createElement('div', { 'data-testid': 'score-card' }),
}))

vi.mock('@/components/tenant/ScoreDetailSheet', () => ({
  ScoreDetailSheet: () => null,
}))

vi.mock('@/components/tenant/ScoreShareModal', () => ({
  ScoreShareModal: () => null,
}))

import InquilinoPage from './page'

let container: HTMLDivElement
let root: Root

function loadingAuth() {
  authMock.mockReturnValue({ user: null, isLoading: true })
  applicationsMock.mockReturnValue({
    active: [],
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  })
  leasesMock.mockReturnValue({
    getActive: () => [],
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  })
}

function loadedUser(overrides: { onboardingCompleted?: boolean } = {}) {
  authMock.mockReturnValue({
    user: {
      id: 'u1',
      name: 'Ana Test',
      profileSource: 'backend',
      onboardingCompleted: overrides.onboardingCompleted ?? true,
    },
    isLoading: false,
  })
  applicationsMock.mockReturnValue({
    active: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  leasesMock.mockReturnValue({
    getActive: () => [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  featuredPropsMock.mockReturnValue({ properties: [], isLoading: false })
  tenantCasesMock.mockReturnValue({ openCasesCount: 0 })
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => {
    root.render(React.createElement(InquilinoPage))
  })
}

describe('InquilinoPage — Rules of Hooks across loading -> loaded transition', () => {
  it('does not crash when the SAME mounted instance goes from loading to fully loaded', () => {
    loadingAuth()
    expect(() => render()).not.toThrow()

    // Same root/instance re-renders once auth + data resolve — this is
    // exactly the transition that used to change the hook call count.
    loadedUser()
    expect(() => render()).not.toThrow()
  })

  it('does not crash transitioning from onboarding-incomplete to loaded', () => {
    loadedUser({ onboardingCompleted: false })
    expect(() => render()).not.toThrow()
    expect(container.querySelector('[data-testid="tenant-dashboard-empty"]')).toBeTruthy()

    loadedUser({ onboardingCompleted: true })
    expect(() => render()).not.toThrow()
  })
})

describe('InquilinoPage — useTenantCases is called unconditionally, fetch gated', () => {
  it('calls useTenantCases even while auth/data are still loading (fixes the hook-order bug)', () => {
    loadingAuth()
    render()
    expect(tenantCasesMock).toHaveBeenCalled()
  })

  it('does NOT signal a fetch while onboarding is incomplete (no new network call for a new user)', () => {
    loadedUser({ onboardingCompleted: false })
    render()

    expect(tenantCasesMock).toHaveBeenCalled()
    const [options] = tenantCasesMock.mock.calls.at(-1) ?? []
    expect((options as { skip?: boolean } | undefined)?.skip).toBe(true)
  })

  it('does NOT signal a fetch while still loading (auth/apps/leases)', () => {
    loadingAuth()
    render()

    const [options] = tenantCasesMock.mock.calls.at(-1) ?? []
    expect((options as { skip?: boolean } | undefined)?.skip).toBe(true)
  })

  it('does NOT signal a fetch while the applications/leases sources errored', () => {
    loadedUser()
    applicationsMock.mockReturnValue({
      active: [],
      isLoading: false,
      error: 'boom',
      refetch: vi.fn(),
    })
    render()

    const [options] = tenantCasesMock.mock.calls.at(-1) ?? []
    expect((options as { skip?: boolean } | undefined)?.skip).toBe(true)
  })

  it('signals a real fetch once the dashboard actually renders (unchanged happy-path behavior)', () => {
    loadedUser()
    render()

    const [options] = tenantCasesMock.mock.calls.at(-1) ?? []
    expect((options as { skip?: boolean } | undefined)?.skip).not.toBe(true)
  })
})
