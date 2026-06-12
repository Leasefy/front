/**
 * page.test.tsx — Phase 37 plan 37-11 (Task 3 TDD)
 *
 * Tests for AIAgentsPage refactor: 4 agent cards + cobranza/cotizador KPI data.
 *
 * Coverage matrix (37-11-PLAN.md §Task 3 <behavior>):
 *   (1) 4 cards render when both permissions + data populated (TenantScoring + SmartMatching + Cobranza + Cotizador)
 *   (2) populated:false renders NoDataYetBadge for cobranza card; footer shows "Sin actividad reciente"
 *   (3) relative-time footer: lastActivityAt 2h ago renders "hace"
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── Mock next/navigation ─────────────────────────────────────────────────
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: pushMock }),
}))

// ── Mock auth ─────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test' }, user: { id: 'user-test' } }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test' }, user: { id: 'user-test' } }),
}))

// ── Mock i18n ─────────────────────────────────────────────────────────────
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

// ── Mock hooks ────────────────────────────────────────────────────────────
vi.mock('@/lib/hooks/use-agent-metrics', () => ({
  useAgentMetrics: () => ({
    metrics: {
      scoring: { evaluationsThisMonth: 12, avgTimeMin: '2min', accuracyRate: '94%', escalationRate: '3%' },
      matching: { suggestionsSent: 45, conversionRate: '31%', candidatesRedirected: 14, avgCompatibility: '78%' },
      summary: { actionsThisWeek: 57, hoursSavedThisMonth: '48h' },
    },
    isLoading: false,
  }),
}))

vi.mock('@/lib/hooks/use-agent-activity', () => ({
  useAgentActivity: () => ({ activities: [] }),
}))

vi.mock('@/lib/hooks/use-agent', () => ({
  useAgentExecution: () => ({
    isRunning: false,
    error: null,
    result: null,
    trace: null,
    runScoring: vi.fn(),
    runMatching: vi.fn(),
    clearResult: vi.fn(),
  }),
}))

// ── Types for mock ────────────────────────────────────────────────────────
interface MockAgentCard {
  permitted: boolean
  heroKpi: { label: string; value: string; populated: boolean } | null
  secondaryKpi: { label: string; value: string | number } | null
  lastActivityAt: string | null
}

interface MockLandingData {
  cobranza: MockAgentCard
  cotizador: MockAgentCard
  generatedAt: string
}

interface MockLandingState {
  data: MockLandingData | null
  isLoading: boolean
  error: string | null
  refetch: ReturnType<typeof vi.fn>
}

// Controllable useAiHubLanding mock
let _mockLanding: MockLandingState = createBothPermsMock()

function createBothPermsMock(): MockLandingState {
  return {
    data: {
      cobranza: {
        permitted: true,
        heroKpi: { label: 'recovery_rate_30d_pct', value: '12.4%', populated: true },
        secondaryKpi: { label: 'open_escalations', value: 3 },
        lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      cotizador: {
        permitted: true,
        heroKpi: { label: 'approval_rate_30d_pct', value: '78.2%', populated: true },
        secondaryKpi: { label: 'quotes_today', value: 5 },
        lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      generatedAt: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }
}

vi.mock('@/lib/hooks/use-ai-hub-landing', () => ({
  useAiHubLanding: () => _mockLanding,
}))

// ── Mock child components ─────────────────────────────────────────────────
vi.mock('@/components/inmobiliaria/ai/AIAgentCard', () => ({
  AIAgentCard: ({ agent, metrics }: { agent: { id: string; nameEs?: string }; metrics?: unknown[] }) =>
    React.createElement(
      'div',
      { 'data-testid': `agent-card-${agent.id}`, 'data-agent-id': agent.id },
      React.createElement('span', { 'data-testid': `agent-name-${agent.id}` }, agent.nameEs ?? agent.id),
      metrics && React.createElement(
        'div',
        { 'data-testid': `metrics-${agent.id}` },
        (metrics as Array<{ label: string; value: string | number }>).map((m, i) =>
          React.createElement('span', { key: i, 'data-testid': `metric-${agent.id}-${i}` }, `${m.label}: ${m.value}`)
        )
      ),
    ),
}))

vi.mock('@/components/inmobiliaria/ai/AIAgentActivityFeed', () => ({
  AIAgentActivityFeed: () => React.createElement('div', { 'data-testid': 'activity-feed' }),
}))

vi.mock('@/components/data-display/no-data-yet-badge', () => ({
  NoDataYetBadge: ({ reason }: { reason: string; phase: number }) =>
    React.createElement('div', { 'data-testid': 'no-data-yet-badge' }, reason),
}))

vi.mock('@/components/inmobiliaria/ai/AIAgentDetailSidebar', () => ({
  AIAgentDetailSidebar: () => null,
}))

vi.mock('@/components/inmobiliaria/ai/AIAgentExecutionPanel', () => ({
  AIAgentExecutionPanel: () => null,
}))

// ── Import page AFTER mocks ──────────────────────────────────────────────
import AIAgentsPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _mockLanding = createBothPermsMock()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe('AIAgentsPage — 4 agent cards', () => {
  it('(1) renders 4 agent cards when both permissions populated', async () => {
    await act(async () => {
      root.render(React.createElement(AIAgentsPage))
    })

    const cards = container.querySelectorAll('[data-testid^="agent-card-"]')
    expect(cards.length).toBeGreaterThanOrEqual(4)

    // All 4 agent IDs present
    expect(container.querySelector('[data-testid="agent-card-tenant-scoring"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="agent-card-smart-matching"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="agent-card-cobranza"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="agent-card-cotizador"]')).not.toBeNull()

    // Cobranza card has hero KPI value
    const cobranzaMetrics = container.querySelector('[data-testid="metrics-cobranza"]')
    expect(cobranzaMetrics?.textContent).toContain('12.4%')

    // Cotizador card has hero KPI value
    const cotizadorMetrics = container.querySelector('[data-testid="metrics-cotizador"]')
    expect(cotizadorMetrics?.textContent).toContain('78.2%')

    // No NoDataYetBadge shown when both populated=true
    const badges = container.querySelectorAll('[data-testid="no-data-yet-badge"]')
    expect(badges.length).toBe(0)
  })

  it('(2) cobranza heroKpi.populated=false → NoDataYetBadge shown; footer shows "Sin actividad reciente"', async () => {
    _mockLanding = {
      ..._mockLanding,
      data: {
        ..._mockLanding.data!,
        cobranza: {
          permitted: true,
          heroKpi: { label: 'recovery_rate_30d_pct', value: '0.0%', populated: false },
          secondaryKpi: { label: 'open_escalations', value: 0 },
          lastActivityAt: null,
        },
      },
    }

    await act(async () => {
      root.render(React.createElement(AIAgentsPage))
    })

    // NoDataYetBadge should be rendered for cobranza
    const badges = container.querySelectorAll('[data-testid="no-data-yet-badge"]')
    expect(badges.length).toBeGreaterThanOrEqual(1)

    // Footer metric should show "Sin actividad reciente"
    const cobranzaMetrics = container.querySelector('[data-testid="metrics-cobranza"]')
    expect(cobranzaMetrics?.textContent).toContain('Sin actividad reciente')
  })

  it('(3) relative-time footer: lastActivityAt 2h ago renders "hace"', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    _mockLanding = {
      ..._mockLanding,
      data: {
        ..._mockLanding.data!,
        cobranza: {
          permitted: true,
          heroKpi: { label: 'recovery_rate_30d_pct', value: '12.4%', populated: true },
          secondaryKpi: { label: 'open_escalations', value: 2 },
          lastActivityAt: twoHoursAgo,
        },
      },
    }

    await act(async () => {
      root.render(React.createElement(AIAgentsPage))
    })

    // Footer metric for cobranza should contain "hace" (es locale relative time)
    const cobranzaMetrics = container.querySelector('[data-testid="metrics-cobranza"]')
    expect(cobranzaMetrics?.textContent).toContain('hace')
  })
})
