import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const remind = vi.fn()
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { remind: (...args: unknown[]) => remind(...args), getSignedPdfUrl: vi.fn() },
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

import { ApiError } from '@/lib/api/client'
import { ContractExpandableItem } from './ContractExpandableItem'
import type { Contract } from '@/lib/types/contract'

/**
 * 🔴 02-10-2026 · El «Recordar» de la lista de contratos del propietario era un
 * `setTimeout` de 1,2 s seguido de «Se envió un recordatorio a …»: no llamaba
 * al back y no salía ningún aviso. Ahora llama a `POST /contracts/:id/remind` y
 * dice lo que pasó.
 */
function contrato(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'ct-77',
    propertyId: 'prop-1',
    tenantId: 'tenant-1',
    landlordId: 'land-1',
    status: 'pending_tenant',
    propertyAddress: 'Cra 13 #55-20',
    propertyCity: 'Medellín',
    tenantName: 'Ana Pérez',
    tenantEmail: 'ana@correo.co',
    tenantPhone: '3001234567',
    tenantDocument: '123456',
    landlordName: 'Propietario X',
    landlordEmail: 'land@x.co',
    landlordDocument: '987654',
    monthlyRent: 2_000_000,
    adminFee: 0,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  } as Contract
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  remind.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

/**
 * El botón se busca por lo que dice («Recordar» / «Enviando…» / «Enviado»), no
 * por un `data-testid`: así la prueba corre igual contra el componente de
 * antes y falla por lo que tiene que fallar (decía «enviado» sin llamar al back).
 */
function botonDeRecordar(): HTMLButtonElement {
  const boton = Array.from(container.querySelectorAll('button')).find((b) =>
    /^(Recordar|Enviando…|Enviado)$/.test((b.textContent ?? '').trim()),
  ) as HTMLButtonElement | undefined
  expect(boton).toBeTruthy()
  return boton!
}

async function abrirYRecordar(c: Contract = contrato()) {
  act(() => {
    root.render(<ContractExpandableItem contract={c} />)
  })
  // La fila se despliega con un clic; ahí aparecen las acciones.
  act(() => {
    ;(container.querySelector('button') as HTMLButtonElement).click()
  })
  await act(async () => {
    botonDeRecordar().click()
  })
  return botonDeRecordar
}

describe('<ContractExpandableItem> — el recordatorio de firma dice la verdad', () => {
  it('🔴 llama al back con el contrato y recién entonces dice «enviado»', async () => {
    let responder: (v: unknown) => void = () => {}
    remind.mockReturnValue(new Promise((r) => (responder = r)))

    const boton = await abrirYRecordar()

    expect(remind).toHaveBeenCalledTimes(1)
    expect(remind).toHaveBeenCalledWith('ct-77')
    // Mientras el back no contesta: «Enviando…», deshabilitado, y nada de éxito.
    expect(boton().textContent).toContain('Enviando…')
    expect(boton().disabled).toBe(true)
    expect(toastSuccess).not.toHaveBeenCalled()

    await act(async () => {
      responder({ remindedAt: '2026-10-02T15:00:00.000Z', nextAllowedAt: '2026-10-03T15:00:00.000Z' })
    })

    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastSuccess.mock.calls[0][0]).toBe('Recordatorio enviado')
    expect((toastSuccess.mock.calls[0][1] as { description: string }).description).toContain('Ana Pérez')
    expect(boton().textContent).toContain('Enviado')
    expect(boton().disabled).toBe(true)
  })

  it('🔴 si el back falla NO dice «enviado»: dice el motivo con el traductor y deja reintentar', async () => {
    remind.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )

    const boton = await abrirYRecordar()

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledTimes(1)
    const descripcion = (toastError.mock.calls[0][1] as { description: string }).description
    expect(descripcion).toMatch(/^No pudimos enviar el recordatorio: algo falló de nuestro lado/)
    expect(descripcion).toContain('ab12cd34')
    expect(descripcion).not.toMatch(/Error interno|conexi[oó]n/i)
    expect(boton().textContent).toContain('Recordar')
    expect(boton().disabled).toBe(false)
  })

  it('el 429 RECORDATORIO_RECIENTE dice desde cuándo, y el botón queda como enviado', async () => {
    const mensaje =
      'Ya se envió un recordatorio de firma en las últimas 24 horas. Puedes enviar otro desde el 3 de octubre a las 3:15 p. m.'
    remind.mockRejectedValue(new ApiError(429, mensaje, 'RECORDATORIO_RECIENTE', { proximoPermitido: '2026-10-03T20:15:00.000Z' }))

    const boton = await abrirYRecordar()

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError.mock.calls[0][0]).toBe('Ya se envió un recordatorio hoy')
    expect((toastError.mock.calls[0][1] as { description: string }).description).toBe(mensaje)
    expect(boton().textContent).toContain('Enviado')
    expect(boton().disabled).toBe(true)
  })

  it('un 403 dice lo que dijo el back, sin «conexión»', async () => {
    remind.mockRejectedValue(new ApiError(403, 'No tienes acceso a este contrato.'))

    await abrirYRecordar()

    expect(toastSuccess).not.toHaveBeenCalled()
    expect((toastError.mock.calls[0][1] as { description: string }).description).toBe('No tienes acceso a este contrato.')
  })

  it('un segundo clic mientras se envía no manda dos', async () => {
    remind.mockReturnValue(new Promise(() => {}))
    const boton = await abrirYRecordar()
    await act(async () => {
      boton().click()
    })
    expect(remind).toHaveBeenCalledTimes(1)
  })
})
