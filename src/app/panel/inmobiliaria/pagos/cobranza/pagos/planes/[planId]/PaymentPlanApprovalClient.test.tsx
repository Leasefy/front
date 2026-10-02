/**
 * Plan de pago: qué se dice cuando aprobar o modificar no sale (02-10-2026,
 * tanda 2 de errores, A6).
 *
 * Antes se pintaba `res.error` crudo («approve 409», «offer 500»). Ahora el
 * hook devuelve `fallo` (el `ApiError` del micro o el de la red) y la pantalla
 * lo traduce; `DUPLICATE_PLAN_RISK` se decide por `code`, nunca por el texto.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'

void React

const { approvePlanMock, modifyPlanMock } = vi.hoisted(() => ({
  approvePlanMock: vi.fn(),
  modifyPlanMock: vi.fn(),
}))

const PLAN = {
  planId: 'plan-1',
  status: 'offered',
  offeredAt: '2026-10-01T00:00:00.000Z',
  wompiLink: null,
  proposed: { discount: 0.1, cuotas: 3, montoPorCuota: 100000, fechaPrimerPago: '2026-10-10', totalDueCop: 300000 },
  agency: { maxDiscount: 0.2 },
  debtor: { id: 'd-1', nombreMasked: 'A** G****', cedulaMasked: '***123' },
}

vi.mock('@/lib/hooks/cobranza/use-payment-plan-approval', () => ({
  usePaymentPlanApproval: () => ({
    plan: PLAN,
    isLoading: false,
    error: null,
    isMaxDiscountExceeded: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    approvePlan: approvePlanMock,
    rejectPlan: vi.fn(),
    modifyPlan: modifyPlanMock,
  }),
}))
vi.mock('@/lib/hooks/cobranza/use-payments-funnel-realtime', () => ({
  usePaymentsFunnelRealtime: () => {},
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true }),
  usePermissionsContextSafe: () => ({ canAccess: () => true }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/components/inmobiliaria/cobranza/Mask', () => ({
  Mask: ({ value }: { value: string }) => <span>{value}</span>,
}))
vi.mock('@/components/inmobiliaria/ai/VolverALaLista', () => ({
  VolverALaLista: () => null,
}))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

import PaymentPlanApprovalClient from './PaymentPlanApprovalClient'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
  approvePlanMock.mockReset()
  modifyPlanMock.mockReset()
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
    root.render(<PaymentPlanApprovalClient planId="plan-1" />)
  })
}

async function aprobar() {
  await act(async () => {
    contenedor.querySelector<HTMLButtonElement>('[data-testid="approval-aprobar-plan"]')!.click()
  })
}

function errorDeLaAccion(): string {
  return contenedor.querySelector('[data-testid="plan-accion-error"]')?.textContent ?? ''
}

describe('Plan de pago — aprobar', () => {
  it('un 409 del micro muestra su `message`, no «approve 409»', async () => {
    approvePlanMock.mockResolvedValue({
      error: 'approve 409',
      fallo: new ApiError(409, 'El plan cambió mientras lo revisabas. Recarga para ver la versión nueva.', 'PLAN_DESACTUALIZADO', {
        code: 'PLAN_DESACTUALIZADO',
        message: 'El plan cambió mientras lo revisabas. Recarga para ver la versión nueva.',
      }),
    })
    await montar()
    await aprobar()
    expect(errorDeLaAccion()).toBe('El plan cambió mientras lo revisabas. Recarga para ver la versión nueva.')
    expect(contenedor.textContent).not.toContain('approve 409')
  })

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    approvePlanMock.mockResolvedValue({
      error: 'approve 500',
      fallo: new ApiError(500, '', undefined, { error: 'Internal Server Error', requestId: 'beefcafe-0000' }),
    })
    await montar()
    await aprobar()
    expect(errorDeLaAccion()).toContain('No pudimos aprobar el plan: algo falló de nuestro lado')
    expect(errorDeLaAccion()).toContain('beefcafe')
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', async () => {
    approvePlanMock.mockResolvedValue({ error: 'Failed to fetch', fallo: new TypeError('Failed to fetch') })
    await montar()
    await aprobar()
    expect(errorDeLaAccion()).toMatch(/conexi[oó]n/i)
  })

  it('sin intento (sin permiso) se dice en español, no «PERMISSION_DENIED»', async () => {
    approvePlanMock.mockResolvedValue({ error: 'PERMISSION_DENIED' })
    await montar()
    await aprobar()
    expect(errorDeLaAccion()).toBe('No tienes permiso para hacer esto. Pídeselo a un administrador.')
  })
})
