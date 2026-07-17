/**
 * page.test.tsx — PostulacionesPage loading/empty-state behavior.
 *
 * Bug under test: with `useAuth().agency === null` the page used to spin
 * forever (isLoading initialized to true and `load` bailed out early without
 * clearing it). It must fall through to the empty state instead.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { FunnelApplicationsResponse } from '@/lib/api/funnel-applications.service'

void React // jsx-preserve

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { fetchMock, refreshAgencyMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  refreshAgencyMock: vi.fn(),
}))

// ── Controllable auth mock ────────────────────────────────────────────────
let _agency: { id: string } | null = null

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: _agency, user: { id: 'user-test' }, refreshAgency: refreshAgencyMock }),
}))

// ── Mock the service module (keep real helpers) ──────────────────────────
vi.mock('@/lib/api/funnel-applications.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/funnel-applications.service')>()
  return {
    ...actual,
    fetchFunnelApplications: (...args: unknown[]) => fetchMock(...args),
  }
})

// ── Mock presentational leaves (avoid pulling the whole DS in) ───────────
vi.mock('@/components/ui', () => ({
  Spinner: ({ label }: { label?: string }) =>
    React.createElement('div', { 'data-testid': 'spinner' }, label ?? 'Loading'),
}))

vi.mock('@/components/data-display/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' }, title),
}))

vi.mock('@/components/ui/error-state', () => ({
  ErrorState: ({ title, onRetry }: { title: string; onRetry?: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'error-state' },
      title,
      onRetry
        ? React.createElement(
            'button',
            { 'data-testid': 'error-state-retry', onClick: onRetry },
            'Intentar de nuevo',
          )
        : null,
    ),
}))

vi.mock('@leasefy/cadence', () => ({
  StatusBadge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'status-badge' }, children),
}))

// The table shim re-exports cadence primitives — replace it with plain elements.
vi.mock('@/components/ui/table', () => {
  const el = (tag: string) => {
    const MockEl = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(tag, null, children)
    MockEl.displayName = `MockTable_${tag}`
    return MockEl
  }
  return {
    Table: el('table'),
    TableHeader: el('thead'),
    TableBody: el('tbody'),
    TableRow: el('tr'),
    TableHead: el('th'),
    TableCell: el('td'),
  }
})

// ── Import page AFTER mocks ───────────────────────────────────────────────
import PostulacionesPage from './page'

const RESPONSE: FunnelApplicationsResponse = {
  items: [
    {
      applicationId: 'app-aaaa1111bbbb',
      verdict: 'approved',
      score: 82,
      level: 'A',
      requiresManualReview: false,
      escalate: false,
      scoredAt: '2026-06-09T10:00:00.000Z',
    },
    {
      applicationId: 'app-cccc2222dddd',
      verdict: 'review',
      score: 55,
      level: 'C',
      requiresManualReview: true,
      escalate: false,
      scoredAt: '2026-06-08T10:00:00.000Z',
    },
  ],
  generatedAt: '2026-06-09T11:00:00.000Z',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _agency = null
  fetchMock.mockReset()
  refreshAgencyMock.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(PostulacionesPage))
  })
}

describe('PostulacionesPage — no agency in session', () => {
  it('does not spin forever: renders a retryable error, never the definitive empty state', async () => {
    _agency = null
    await renderPage()

    expect(container.querySelector('[data-testid="spinner"]')).toBeNull()
    // No fetch happened, so "Aún no hay postulaciones" would be a false claim.
    expect(container.querySelector('[data-testid="empty-state"]')).toBeNull()
    const error = container.querySelector('[data-testid="error-state"]')
    expect(error).not.toBeNull()
    expect(error?.textContent).toContain('No pudimos cargar la información de tu inmobiliaria')
  })

  it('fetches and replaces the error with rows when the agency arrives after mount', async () => {
    _agency = null
    fetchMock.mockResolvedValue(RESPONSE)
    await renderPage()
    expect(container.querySelector('[data-testid="error-state"]')).not.toBeNull()

    _agency = { id: 'agency-test' }
    await renderPage()

    expect(container.querySelector('[data-testid="error-state"]')).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith('agency-test', { limit: 50 })
    expect(container.querySelectorAll('tbody tr').length).toBe(2)
  })

  it('does not call the service without an agencyId', async () => {
    _agency = null
    await renderPage()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retry button calls refreshAgency() instead of reloading the page', async () => {
    _agency = null
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    })

    await renderPage()
    const retryButton = container.querySelector<HTMLButtonElement>('[data-testid="error-state-retry"]')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton!.click()
    })

    expect(refreshAgencyMock).toHaveBeenCalledTimes(1)
    expect(reloadSpy).not.toHaveBeenCalled()
  })
})

describe('PostulacionesPage — agency present', () => {
  it('loads applications and renders one row per item', async () => {
    _agency = { id: 'agency-test' }
    fetchMock.mockResolvedValue(RESPONSE)

    await renderPage()

    expect(fetchMock).toHaveBeenCalledWith('agency-test', { limit: 50 })
    expect(container.querySelector('[data-testid="spinner"]')).toBeNull()
    expect(container.querySelector('[data-testid="empty-state"]')).toBeNull()

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(container.textContent).toContain('app-aaaa…')
    expect(container.textContent).toContain('Pre-aprobada')
    expect(container.textContent).toContain('En revisión')
  })

  it('renders the empty state when the service returns no items', async () => {
    _agency = { id: 'agency-test' }
    fetchMock.mockResolvedValue({ items: [], generatedAt: '2026-06-09T11:00:00.000Z' })

    await renderPage()

    expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull()
  })

  it('renders the error state when the service rejects', async () => {
    _agency = { id: 'agency-test' }
    fetchMock.mockRejectedValue(new Error('boom'))

    await renderPage()

    const error = container.querySelector('[data-testid="error-state"]')
    expect(error).not.toBeNull()
    expect(error?.textContent).toContain('No se pudieron cargar las postulaciones')
  })
})
