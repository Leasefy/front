/**
 * PayRentModal — v7-04 Wompi hosted-checkout reconciliation (T-0048).
 *
 * The modal no longer runs its own PSE bank-selection form: it fetches
 * /leases/:id/payment-info, shows the period + real amount, and on
 * confirmation asks the restored server-only session route
 * (POST /api/inquilino/pagos/wompi-session) for a signed session, then
 * redirects the whole tab to Wompi's hosted checkout. The route resolves the
 * amount itself — the client sends only `{ leaseId }`, never an amount.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { BackendPaymentInfo } from '@/lib/api/leases.types'

void React

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const getPaymentInfoMock = vi.fn()
vi.mock('@/lib/api/leases.service', () => ({
  leasesApi: { getPaymentInfo: (...a: unknown[]) => getPaymentInfoMock(...a) },
}))

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'tenant-jwt',
}))

import { PayRentModal } from './PayRentModal'
import { toast } from 'sonner'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  getPaymentInfoMock.mockReset()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

const NONE_INFO: BackendPaymentInfo = {
  leaseId: 'lease-1',
  monthlyRent: 1_500_000,
  paymentDay: 5,
  paymentMethods: [],
  currentPeriod: { month: 7, year: 2026 },
  currentPeriodStatus: 'NONE',
  currentPeriodRejectionReason: null,
}

function render(props: Partial<React.ComponentProps<typeof PayRentModal>> = {}) {
  const defaultProps: React.ComponentProps<typeof PayRentModal> = {
    open: true,
    leaseId: 'lease-1',
    onClose: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<PayRentModal {...defaultProps} />)
  })
  return defaultProps
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('<PayRentModal> — loading and pre-flight', () => {
  it('renders nothing when closed', () => {
    render({ open: false })
    expect(container.querySelector('[role="dialog"], .fixed')).toBeFalsy()
  })

  it('fetches payment-info on open and shows the confirm step for NONE', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    render()
    await flush()

    expect(getPaymentInfoMock).toHaveBeenCalledWith('lease-1')
    expect(container.textContent).toContain('1500000')
    expect(container.querySelector('button')?.parentElement).toBeTruthy()
  })

  it('blocks with a period-blocked panel when currentPeriodStatus is APPROVED', async () => {
    getPaymentInfoMock.mockResolvedValue({ ...NONE_INFO, currentPeriodStatus: 'APPROVED' })
    render()
    await flush()

    expect(container.textContent).toContain('Pago confirmado')
  })

  it('blocks with a period-blocked panel when currentPeriodStatus is PENDING_VALIDATION', async () => {
    getPaymentInfoMock.mockResolvedValue({ ...NONE_INFO, currentPeriodStatus: 'PENDING_VALIDATION' })
    render()
    await flush()

    expect(container.textContent).toContain('Pago en verificación')
  })

  it('shows the rejection reason and a retry CTA when currentPeriodStatus is REJECTED', async () => {
    getPaymentInfoMock.mockResolvedValue({
      ...NONE_INFO,
      currentPeriodStatus: 'REJECTED',
      currentPeriodRejectionReason: 'Fondos insuficientes',
    })
    render()
    await flush()

    expect(container.textContent).toContain('Fondos insuficientes')
    const ctas = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(ctas.some((t) => t?.includes('Reintentar pago'))).toBe(true)
  })
})

describe('<PayRentModal> — Wompi hosted checkout redirect', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  function findCta(container: HTMLDivElement, text: string): HTMLButtonElement {
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    )
    if (!btn) throw new Error(`CTA "${text}" not found`)
    return btn as HTMLButtonElement
  }

  it('POSTs only { leaseId } (never an amount) with the tenant Bearer token, then redirects to the built Wompi URL', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reference: 'rent-lease-1-2026-07',
        amountInCents: 150_000_000,
        currency: 'COP',
        integrity: 'abc123',
        publicKey: 'pub_test',
      }),
    } as unknown as Response)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const originalLocation = window.location
    const locationStub = { href: '' } as Location
    Object.defineProperty(window, 'location', { value: locationStub, writable: true, configurable: true })

    render()
    await flush()

    act(() => {
      findCta(container, 'Pagar arriendo').click()
    })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/inquilino/pagos/wompi-session')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ leaseId: 'lease-1' })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tenant-jwt')

    expect(window.location.href).toContain('https://checkout.wompi.co/p/?')
    expect(window.location.href).toContain('signature:integrity=abc123')
    expect(window.location.href).toContain('amount-in-cents=150000000')
    expect(window.location.href).toContain('reference=rent-lease-1-2026-07')

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('shows a toast and returns to confirm on 409 (period already paid/verifying)', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'period_not_payable' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()

    act(() => {
      findCta(container, 'Pagar arriendo').click()
    })
    await flush()

    expect(toast.error).toHaveBeenCalled()
    // Back on the confirm step — the CTA is present again, not stuck on "redirecting".
    expect(container.textContent).toContain('Monto a pagar')
  })

  it('shows a toast and returns to confirm on a generic session failure', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'wompi_not_configured' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()

    act(() => {
      findCta(container, 'Pagar arriendo').click()
    })
    await flush()

    expect(toast.error).toHaveBeenCalled()
    expect(container.textContent).toContain('Monto a pagar')
  })
})
