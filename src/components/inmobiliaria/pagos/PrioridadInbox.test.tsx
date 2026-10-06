/**
 * La acción de un clic de la bandeja de prioridad del agente de pagos, cuando
 * no sale (tanda 2 del sistema de errores, 02-10-2026).
 *
 * Antes el toast decía «No se pudo completar: 403» o «No se pudo completar:
 * not_configured»: el código crudo del micro. Ahora `runAction` trae `fallo`
 * (el error entero) y la fila lo dice con el traductor: un 4xx dice qué pasó,
 * un 5xx que fue nuestro con la referencia, y sólo sin respuesta se habla de
 * la conexión. `PagoFallidoTabla` usa la misma fila de un clic.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toastError, toastSuccess } = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/components/ui/toast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}))

import { ApiError } from '@/lib/api/client'
import { PrioridadInbox } from './PrioridadInbox'
import { PagoFallidoTabla } from './PagoFallidoTabla'

const ACCION: WorkItemAction = {
  id: 'reintentar',
  label: 'Reintentar el cobro',
  kind: 'primary',
  method: 'POST',
  path: '/api/agency/a-1/pagos/p-1/reintentar',
}

const ITEM: WorkItem = {
  id: 'p-1',
  agente: 'pagos',
  tipo: 'pago_fallido',
  estado: 'pendiente' as WorkItem['estado'],
  flags: [],
  ownerRole: 'ADMIN' as WorkItem['ownerRole'],
  severidad: 'alta',
  titulo: 'PSE rechazado · Apto 301',
  accionSugerida: { label: 'Reintentar el cobro', razon: 'El banco rechazó el débito.' },
  actions: [ACCION],
  subject: { kind: 'pago', id: 'p-1', masked: 'Ana P.' },
  createdAt: '2026-10-01T10:00:00.000Z',
  source: { endpoint: '/x', entity: 'pago' },
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  toastError.mockReset()
  toastSuccess.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function correrLaAccion(
  resultado: { ok: boolean; error?: string; fallo?: unknown },
  Pantalla: 'inbox' | 'fallidos' = 'inbox',
) {
  const onAction = vi.fn().mockResolvedValue(resultado)
  await act(async () => {
    root.render(
      Pantalla === 'inbox' ? (
        <PrioridadInbox items={[ITEM]} onAction={onAction} />
      ) : (
        <PagoFallidoTabla items={[ITEM]} onAction={onAction} />
      ),
    )
  })
  const boton = Array.from(host.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes('Reintentar el cobro'),
  )
  if (!boton) throw new Error('No está el botón de la acción')
  await act(async () => {
    boton.click()
    await new Promise((r) => setTimeout(r, 0))
  })
  return String(toastError.mock.calls.at(-1)?.[0] ?? '')
}

describe('<PrioridadInbox> la acción de un clic que no sale', () => {
  it('🔴 un 5xx dice que fue nuestro, con la referencia; nunca «No se pudo completar: 500»', async () => {
    const dicho = await correrLaAccion({
      ok: false,
      error: '500',
      fallo: new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: '7a6b5c4d' }),
    })
    expect(dicho).toContain('No pudimos completar «Reintentar el cobro»: algo falló de nuestro lado')
    expect(dicho).toContain('7a6b5c4d')
    expect(dicho).not.toContain('No se pudo completar: 500')
  })

  it('un 4xx dice lo que mandó el micro', async () => {
    const dicho = await correrLaAccion({
      ok: false,
      error: '409',
      fallo: new ApiError(409, 'Ese pago ya se reintentó hoy: espera a mañana.', 'YA_REINTENTADO'),
    })
    expect(dicho).toBe('Ese pago ya se reintentó hoy: espera a mañana.')
  })

  it('sin respuesta (el pedido no salió) habla de la conexión', async () => {
    const dicho = await correrLaAccion({ ok: false, error: 'Failed to fetch', fallo: new TypeError('Failed to fetch') })
    expect(dicho).toMatch(/conexión/)
    expect(dicho).not.toContain('Failed to fetch')
  })

  it('sin `fallo` (el agente sin configurar) no muestra el código: dice la frase general', async () => {
    const dicho = await correrLaAccion({ ok: false, error: 'not_configured' })
    expect(dicho).toBe('No se pudo completar «Reintentar el cobro». Prueba de nuevo en un momento.')
  })

  it('PagoFallidoTabla dice lo mismo (la misma fila de un clic)', async () => {
    const dicho = await correrLaAccion(
      {
        ok: false,
        error: '500',
        fallo: new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: '7a6b5c4d' }),
      },
      'fallidos',
    )
    expect(dicho).toContain('algo falló de nuestro lado')
    expect(dicho).toContain('7a6b5c4d')
  })
})
