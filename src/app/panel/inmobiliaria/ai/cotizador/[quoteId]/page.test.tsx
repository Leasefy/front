/**
 * QuoteDetailPage tests — Phase 33 plan 33-05 (COTI-UI-04, COTI-UI-05, XR-05)
 *
 * Strategy: mount QuoteDetailContent directly (PageGuard not exercised here —
 * it's covered by integration tests). Mock every hook + child component so we
 * can assert on the buttons / badge / modal wiring in isolation.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// ----- Mocks ----------------------------------------------------------------

const mockRouterPush = vi.fn()
const mockToastError = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test', name: 'Test Agency', email: 'a@b.co' } }),
}))

let mockCanView = true
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (_mod: string, _action: string) => mockCanView,
  }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

let mockCarriers: Array<{
  carrier: string
  status: string
  isStub: boolean
  condiciones: string[]
  motivoRechazo: string | null
  primaMensualCop: number | null
}> = []
vi.mock('@/lib/hooks/cotizador/use-quote-stream', () => ({
  useQuoteStream: () => ({
    carriers: mockCarriers,
    totalCostUsd: 0,
    isConnected: true,
    error: null,
    reconnect: vi.fn(),
  }),
}))

let mockMetadata: {
  cedulaHashPrefix8: string
  canonCop: number
  ciudad: string
  tipoInmueble: string
  createdAt: string
  reQuoteOf: string | null
} | null = null
vi.mock('@/lib/hooks/cotizador/use-quote-metadata', () => ({
  useQuoteMetadata: () => ({ data: mockMetadata, isLoading: false, error: null }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string) => k,
    formatCurrency: (v: number | null) => (v == null ? '—' : `$${v}`),
    formatNumber: (v: number | null) => (v == null ? '—' : String(v)),
    formatDate: () => '',
    formatRelativeDate: () => '',
    setLocale: () => {},
  }),
}))

// Stub the heavy children so we can assert on their presence/props.
vi.mock('@/components/inmobiliaria/cotizador/QuoteHeader', () => ({
  QuoteHeader: () => React.createElement('div', { 'data-testid': 'quote-header' }),
}))
vi.mock('@/components/inmobiliaria/cotizador/CarrierStreamGrid', () => ({
  CarrierStreamGrid: () => React.createElement('div', { 'data-testid': 'carrier-grid' }),
}))
vi.mock('@/components/inmobiliaria/cotizador/StreamCompleteBanner', () => ({
  StreamCompleteBanner: () => React.createElement('div', { 'data-testid': 'complete-banner' }),
}))

// CounterfactualModal stub — exposes open flag + onQuote404 trigger.
let lastModalProps: {
  open: boolean
  onQuote404: () => void
  onClose: () => void
} | null = null
vi.mock('@/components/cotizador/CounterfactualModal', () => ({
  CounterfactualModal: (props: {
    open: boolean
    onQuote404: () => void
    onClose: () => void
  }) => {
    lastModalProps = props
    return props.open
      ? React.createElement('div', { 'data-testid': 'modal-open' })
      : null
  },
}))

vi.mock('@/components/cotizador/ReQuoteOfBadge', () => ({
  ReQuoteOfBadge: ({ parentId }: { parentId: string | null | undefined }) =>
    parentId
      ? React.createElement('span', { 'data-testid': 're-quote-badge' }, parentId)
      : null,
}))

vi.mock('@/components/ui/toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    default: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}))

// Import AFTER mocks.
import QuoteDetailPage from './page'

void React

// ----- Harness --------------------------------------------------------------

let container: HTMLDivElement
let root: Root
const TEST_QUOTE_ID = '11112222-3333-4444-5555-666677778888'

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockRouterPush.mockClear()
  mockToastError.mockClear()
  mockCanView = true
  mockCarriers = []
  mockMetadata = null
  lastModalProps = null
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function mount() {
  act(() => {
    root.render(
      React.createElement(QuoteDetailPage, { params: { quoteId: TEST_QUOTE_ID } }),
    )
  })
}

function findButtonByText(text: string): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'))
  return (
    (buttons.find(b => (b.textContent ?? '').includes(text)) as HTMLButtonElement) ?? null
  )
}

// ----- Tests ----------------------------------------------------------------

describe('QuoteDetailPage — Phase 33 header actions', () => {
  it('hides both action buttons when canAccess returns false', () => {
    mockCanView = false
    mockCarriers = [{ carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mount()
    expect(findButtonByText('pedirExplicacionButton')).toBeNull()
    expect(findButtonByText('reQuoteButton')).toBeNull()
  })

  it('renders "Pedir explicación" button when canView=true and ≥1 carrier non-pending', () => {
    mockCarriers = [
      { carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null },
      { carrier: 'mapfre', status: 'pending', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null },
    ]
    mount()
    expect(findButtonByText('pedirExplicacionButton')).not.toBeNull()
  })

  it('renders "Re-cotizar con cambios" button when canView=true and hasAnyVerdict', () => {
    mockCarriers = [{ carrier: 'sura', status: 'rejected', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mount()
    expect(findButtonByText('reQuoteButton')).not.toBeNull()
  })

  it('clicking "Re-cotizar" calls router.push with /cotizador/nueva?from={quoteId}', () => {
    mockCarriers = [{ carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mount()
    const btn = findButtonByText('reQuoteButton')
    expect(btn).not.toBeNull()
    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(mockRouterPush).toHaveBeenCalledTimes(1)
    const url = mockRouterPush.mock.calls[0][0] as string
    expect(url).toContain('/cotizador/nueva?from=')
    expect(url).toContain(TEST_QUOTE_ID)
  })

  it('clicking "Pedir explicación" sets modal open=true', () => {
    mockCarriers = [{ carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mount()
    expect(lastModalProps?.open).toBe(false)
    const btn = findButtonByText('pedirExplicacionButton')
    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(lastModalProps?.open).toBe(true)
    expect(container.querySelector('[data-testid="modal-open"]')).not.toBeNull()
  })

  it('renders ReQuoteOfBadge when metadata.reQuoteOf is a non-null UUID', () => {
    mockCarriers = [{ carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mockMetadata = {
      cedulaHashPrefix8: 'abcd1234',
      canonCop: 2_000_000,
      ciudad: 'Bogotá',
      tipoInmueble: 'apartamento',
      createdAt: '2026-05-28T00:00:00Z',
      reQuoteOf: 'aaaabbbb-1111-2222-3333-444455556666',
    }
    mount()
    expect(container.querySelector('[data-testid="re-quote-badge"]')).not.toBeNull()
  })

  it('does NOT render ReQuoteOfBadge when metadata.reQuoteOf is null', () => {
    mockCarriers = [{ carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mockMetadata = {
      cedulaHashPrefix8: 'abcd1234',
      canonCop: 2_000_000,
      ciudad: 'Bogotá',
      tipoInmueble: 'apartamento',
      createdAt: '2026-05-28T00:00:00Z',
      reQuoteOf: null,
    }
    mount()
    expect(container.querySelector('[data-testid="re-quote-badge"]')).toBeNull()
  })

  it('onQuote404 callback closes modal + fires toast.error', () => {
    mockCarriers = [{ carrier: 'sura', status: 'approved', isStub: false, condiciones: [], motivoRechazo: null, primaMensualCop: null }]
    mount()
    // Open modal first
    const btn = findButtonByText('pedirExplicacionButton')
    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(lastModalProps?.open).toBe(true)
    // Trigger 404
    act(() => {
      lastModalProps!.onQuote404()
    })
    expect(lastModalProps?.open).toBe(false)
    expect(mockToastError).toHaveBeenCalledTimes(1)
  })
})
