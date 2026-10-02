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

// El `ApiError` de verdad: el modal lee el sobre de error de la ruta con él.
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
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

/**
 * El modal es el `Dialog` del producto (Radix): se pinta en un portal sobre
 * `document.body`, no dentro de `container`. Se busca en el diálogo mismo.
 */
function dialogo(): HTMLElement {
  const d = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!d) throw new Error('El diálogo no está abierto')
  return d
}

function findCta(text: string): HTMLButtonElement {
  const btn = Array.from(dialogo().querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  )
  if (!btn) throw new Error(`CTA "${text}" not found`)
  return btn as HTMLButtonElement
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
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('fetches payment-info on open and shows the confirm step for NONE', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    render()
    await flush()

    expect(getPaymentInfoMock).toHaveBeenCalledWith('lease-1')
    expect(dialogo().textContent).toContain('1500000')
    expect(dialogo().querySelector('h2')?.textContent).toBe('Pagar arriendo')
    // Una sola ✕, la de la primitiva.
    expect(document.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1)
  })

  it('blocks with a period-blocked panel when currentPeriodStatus is APPROVED', async () => {
    getPaymentInfoMock.mockResolvedValue({ ...NONE_INFO, currentPeriodStatus: 'APPROVED' })
    render()
    await flush()

    // La variante sigue al estado: el título lo dice en la cabecera.
    expect(dialogo().querySelector('h2')?.textContent).toBe('Pago confirmado')
    expect(dialogo().getAttribute('data-variant')).toBe('success')
  })

  it('blocks with a period-blocked panel when currentPeriodStatus is PENDING_VALIDATION', async () => {
    getPaymentInfoMock.mockResolvedValue({ ...NONE_INFO, currentPeriodStatus: 'PENDING_VALIDATION' })
    render()
    await flush()

    expect(dialogo().querySelector('h2')?.textContent).toBe('Pago en verificación')
    expect(dialogo().getAttribute('data-variant')).toBe('warning')
  })

  it('shows the rejection reason and a retry CTA when currentPeriodStatus is REJECTED', async () => {
    getPaymentInfoMock.mockResolvedValue({
      ...NONE_INFO,
      currentPeriodStatus: 'REJECTED',
      currentPeriodRejectionReason: 'Fondos insuficientes',
    })
    render()
    await flush()

    expect(dialogo().textContent).toContain('Fondos insuficientes')
    const ctas = Array.from(dialogo().querySelectorAll('button')).map((b) => b.textContent)
    expect(ctas.some((t) => t?.includes('Reintentar pago'))).toBe(true)
  })
})

describe('<PayRentModal> — Wompi hosted checkout redirect', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

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
      findCta('Pagar arriendo').click()
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
      json: async () => ({
        statusCode: 409,
        code: 'PERIODO_NO_PAGABLE',
        message: 'Este período ya está pagado o en verificación.',
      }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()

    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    expect(String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])).toBe(
      'Este período ya está pagado o en verificación.',
    )
    // Back on the confirm step — the CTA is present again, not stuck on "redirecting".
    expect(dialogo().textContent).toContain('Monto a pagar')
  })

  it('shows a toast and returns to confirm on a generic session failure', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()

    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    expect(toast.error).toHaveBeenCalled()
    expect(dialogo().textContent).toContain('Monto a pagar')
    // 🔴 02-10-2026 · regla de oro: un 5xx es nuestro; nunca el código crudo ni «conexión».
    const texto = String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])
    expect(texto).toMatch(/^No pudimos iniciar el pago: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('🔴 la frase del sobre de la ruta gana: Wompi sin configurar lo dice en español, nunca el código', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        statusCode: 500,
        code: 'PAGOS_SIN_CONFIGURAR',
        message:
          'Los pagos en línea no están disponibles en este momento: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo más tarde.',
      }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()
    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    const texto = String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])
    expect(texto).toMatch(/^Los pagos en línea no están disponibles en este momento/)
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('una respuesta sin el sobre (un `{ error }` en inglés) no muestra el código: decide el status', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'payment_info_failed' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()
    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    const texto = String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])
    expect(texto).toBe('No encontramos este arriendo a tu nombre. Recarga la página e intenta de nuevo.')
  })

  it('🔴 sin respuesta (el fetch no salió): ahí sí se habla de la conexión', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof globalThis.fetch

    render()
    await flush()
    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    expect(String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])).toMatch(/conexión/)
    expect(dialogo().textContent).toContain('Monto a pagar')
  })

  it('un 401 de la sesión de pago pide volver a iniciar sesión', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        statusCode: 401,
        code: 'SESION_REQUERIDA',
        message: 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.',
      }),
    } as unknown as Response) as unknown as typeof globalThis.fetch

    render()
    await flush()
    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    expect(String(vi.mocked(toast.error).mock.calls.at(-1)?.[0])).toBe(
      'Tu sesión expiró. Vuelve a iniciar sesión para pagar.',
    )
  })
})

describe('<PayRentModal> — el cierre y el error de carga', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  function esc() {
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
  }

  it('en confirmar, Esc cierra', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    const props = render()
    await flush()

    esc()

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('🔴 mientras redirige a Wompi no se sale: sin ✕ y Esc no cierra', async () => {
    getPaymentInfoMock.mockResolvedValue(NONE_INFO)
    // La sesión de Wompi nunca responde: el modal se queda redirigiendo.
    globalThis.fetch = vi.fn(
      () => new Promise<Response>(() => {}),
    ) as unknown as typeof globalThis.fetch
    const props = render()
    await flush()

    act(() => {
      findCta('Pagar arriendo').click()
    })
    await flush()

    expect(dialogo().textContent).toContain('Te estamos llevando al pago seguro')
    expect(document.querySelector('[aria-label="Cerrar"]')).toBeNull()
    esc()
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('un error de carga es un error: lo dicen el medallón y la cabecera', async () => {
    getPaymentInfoMock.mockRejectedValue(new Error('El contrato no existe'))
    render()
    await flush()

    expect(dialogo().getAttribute('data-variant')).toBe('error')
    expect(dialogo().querySelector('h2')?.textContent).toBe(
      'No se pudo cargar la información de pago',
    )
    expect(dialogo().textContent).toContain('El contrato no existe')
  })
})
