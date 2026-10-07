/**
 * Verificar un pago: un fallo ya no es silencioso (02-10-2026, tanda 2 de
 * errores, A6).
 *
 * Antes el hook escribía «500» en el error de la CARGA y la pantalla no lo
 * leía: el botón volvía a su estado y el pago seguía «reportado» sin que
 * nadie supiera por qué. Ahora el hook deja `falloDeVerificacion` y la
 * pantalla avisa con el traductor.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'

void React

const { estado, toastError } = vi.hoisted(() => ({
  estado: { falloDeVerificacion: null as unknown },
  toastError: vi.fn(),
}))

const limpiar = vi.fn()
const verifyPayment = vi.fn().mockResolvedValue(false)

vi.mock('@/lib/hooks/cobranza/use-payment-detail', () => ({
  usePaymentDetail: () => ({
    data: {
      id: 'p-1',
      debtorId: 'd-1',
      amount: 500000,
      status: 'self_reported',
      paymentMethod: 'transferencia',
      paymentProvider: null,
      paidAt: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      selfReportedAt: '2026-10-01T00:00:00.000Z',
      selfReportedBy: null,
      comprobanteUrl: null,
      verifiedAt: null,
      verifiedByUserId: null,
      debtor: { id: 'd-1', fullName: 'Ana', cedulaMasked: '***123' },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    verifyPayment,
    isVerifying: false,
    falloDeVerificacion: estado.falloDeVerificacion,
    limpiarFalloDeVerificacion: limpiar,
  }),
}))
vi.mock('@/components/ui', async () => {
  const real = await vi.importActual<Record<string, unknown>>('@/components/ui')
  return { ...real, toast: { success: vi.fn(), error: toastError } }
})
vi.mock('@/components/inmobiliaria/cobranza/Mask', () => ({
  Mask: ({ value }: { value: string }) => <span>{value}</span>,
}))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

import PaymentDetailClient from './PaymentDetailClient'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  estado.falloDeVerificacion = null
  toastError.mockReset()
  limpiar.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar() {
  await act(async () => {
    root.render(<PaymentDetailClient paymentId="p-1" />)
  })
}

describe('Verificar pago', () => {
  it('sin fallo no avisa nada (y el botón llama al hook)', async () => {
    await montar()
    await act(async () => {
      contenedor.querySelector<HTMLButtonElement>('[data-testid="pago-verify-btn"]')!.click()
    })
    expect(verifyPayment).toHaveBeenCalledWith('approve')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un 5xx avisa «de nuestro lado» con la referencia y limpia el fallo', async () => {
    estado.falloDeVerificacion = new ApiError(500, '', undefined, {
      error: 'Internal Server Error',
      requestId: 'abad1dea-0000',
    })
    await montar()
    const texto = String(toastError.mock.calls.at(-1)?.[0] ?? '')
    expect(texto).toContain('No pudimos verificar el pago: algo falló de nuestro lado')
    expect(texto).toContain('abad1dea')
    expect(limpiar).toHaveBeenCalled()
  })

  it('un 409 dice su `message`, no el status', async () => {
    estado.falloDeVerificacion = new ApiError(409, 'Este pago ya fue verificado.', 'YA_VERIFICADO', {
      code: 'YA_VERIFICADO',
      message: 'Este pago ya fue verificado.',
    })
    await montar()
    expect(toastError).toHaveBeenCalledWith('Este pago ya fue verificado.')
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', async () => {
    estado.falloDeVerificacion = new TypeError('Failed to fetch')
    await montar()
    expect(String(toastError.mock.calls.at(-1)?.[0] ?? '')).toMatch(/conexi[oó]n/i)
  })
})
