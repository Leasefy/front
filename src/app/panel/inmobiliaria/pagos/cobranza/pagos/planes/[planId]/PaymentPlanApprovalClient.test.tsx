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

const { approvePlanMock, modifyPlanMock, acceptPlanMock, estado } = vi.hoisted(() => ({
  approvePlanMock: vi.fn(),
  modifyPlanMock: vi.fn(),
  acceptPlanMock: vi.fn(),
  estado: {
    aprobadoEn: null as string | null,
    status: 'offered',
    proposed: null as null | Record<string, unknown>,
  },
}))

const PLAN = {
  planId: 'plan-1',
  status: 'offered',
  offeredAt: '2026-10-01T00:00:00.000Z',
  operatorApprovedAt: null as string | null,
  // La oferta ya trae enlace de pago ANTES de aprobar: no es señal de aprobación.
  wompiLink: 'https://checkout.wompi.co/l/abc',
  proposed: { discount: 0.1, cuotas: 3, montoPorCuota: 100000, fechaPrimerPago: '2026-10-10', totalDueCop: 300000 },
  agency: { maxDiscount: 0.2 },
  debtor: { id: 'd-1', nombreMasked: 'A** G****', cedulaMasked: '***123' },
}

vi.mock('@/lib/hooks/cobranza/use-payment-plan-approval', () => ({
  CODIGO_ACUERDO_SIN_APROBAR: 'ACUERDO_SIN_APROBAR',
  usePaymentPlanApproval: () => ({
    plan: {
      ...PLAN,
      operatorApprovedAt: estado.aprobadoEn,
      status: estado.status,
      proposed: estado.proposed ?? PLAN.proposed,
    },
    isLoading: false,
    error: null,
    isMaxDiscountExceeded: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    approvePlan: approvePlanMock,
    rejectPlan: vi.fn(),
    modifyPlan: modifyPlanMock,
    acceptPlan: acceptPlanMock,
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
  acceptPlanMock.mockReset()
  estado.aprobadoEn = null
  estado.status = 'offered'
  estado.proposed = null
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

describe('🔴 «El inquilino aceptó» — el panel TAMBIÉN exige la aprobación (Nico, S5 Q4, 03-10-2026)', () => {
  it('sin aprobar: explica y ofrece «Aprobar primero», sin el botón de registrar la aceptación', async () => {
    await montar()
    expect(contenedor.querySelector('[data-testid="plan-sin-aprobar"]')).not.toBeNull()
    expect(contenedor.textContent).toContain('inmobiliaria.ai.cobranza.planes.aceptacion.sinAprobar')
    expect(contenedor.querySelector('[data-testid="plan-registrar-aceptacion-boton"]')).toBeNull()
  })

  it('«Aprobar primero» aprueba el plan', async () => {
    approvePlanMock.mockResolvedValue({ wompiLink: 'https://checkout.wompi.co/l/nuevo' })
    await montar()
    await act(async () => {
      contenedor.querySelector<HTMLButtonElement>('[data-testid="plan-aprobar-primero"]')!.click()
    })
    expect(approvePlanMock).toHaveBeenCalledTimes(1)
  })

  it('aprobado: ofrece registrar la aceptación y la registra', async () => {
    estado.aprobadoEn = '2026-10-02T15:00:00.000Z'
    acceptPlanMock.mockResolvedValue({ ok: true, acceptedAt: '2026-10-03T10:00:00.000Z' })
    await montar()
    expect(contenedor.querySelector('[data-testid="plan-sin-aprobar"]')).toBeNull()
    await act(async () => {
      contenedor.querySelector<HTMLButtonElement>('[data-testid="plan-registrar-aceptacion-boton"]')!.click()
    })
    expect(acceptPlanMock).toHaveBeenCalledTimes(1)
    expect(contenedor.textContent).toContain('inmobiliaria.ai.cobranza.planes.aceptacion.registrado')
  })

  it('el servidor responde 409 ACUERDO_SIN_APROBAR: dice su frase y vuelve a ofrecer aprobar primero', async () => {
    estado.aprobadoEn = '2026-10-02T15:00:00.000Z'
    acceptPlanMock.mockResolvedValue({
      error: 'accept 409',
      code: 'ACUERDO_SIN_APROBAR',
      fallo: new ApiError(
        409,
        'Este acuerdo todavía no está aprobado por la inmobiliaria: apruébalo primero y después regístralo como aceptado por el inquilino.',
        'ACUERDO_SIN_APROBAR',
        { code: 'ACUERDO_SIN_APROBAR' },
      ),
    })
    await montar()
    await act(async () => {
      contenedor.querySelector<HTMLButtonElement>('[data-testid="plan-registrar-aceptacion-boton"]')!.click()
    })
    const aviso = contenedor.querySelector('[data-testid="plan-sin-aprobar"]')
    expect(aviso?.textContent).toContain('apruébalo primero')
    expect(contenedor.querySelector('[data-testid="plan-aprobar-primero"]')).not.toBeNull()
    expect(errorDeLaAccion()).toBe('')
  })

  it('un plan ya vigente no ofrece nada de esto', async () => {
    estado.status = 'active'
    await montar()
    expect(contenedor.querySelector('[data-testid="plan-sin-aprobar"]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="plan-registrar-aceptacion"]')).toBeNull()
  })
})

describe('Plan de pago — lo que se ve (PRUEBAS-PAGOS, 03-10-2026)', () => {
  it('sin aprobar NO dice «Plan aprobado» aunque la oferta ya traiga su enlace', async () => {
    await montar()
    expect(contenedor.querySelector('[data-testid="plan-sin-aprobar"]')).not.toBeNull()
    expect(contenedor.textContent).not.toContain('inmobiliaria.ai.cobranza.planes.wompiLinkTitle')
  })

  it('aprobado, el enlace de pago sí se muestra', async () => {
    estado.aprobadoEn = '2026-10-02T15:00:00.000Z'
    await montar()
    expect(contenedor.textContent).toContain('inmobiliaria.ai.cobranza.planes.wompiLinkTitle')
  })

  it('la fecha del primer pago se lee como día, no como el ISO crudo', async () => {
    await montar()
    expect(contenedor.textContent).toContain('10 de octubre de 2026')
    expect(contenedor.textContent).not.toContain('2026-10-10')
  })

  it('un acuerdo de pago único dice «Pago único» y su total, no «0» cuotas de «$ 0»', async () => {
    estado.proposed = { discount: 0, cuotas: 0, montoPorCuota: 0, fechaPrimerPago: '', totalDueCop: 6_050_000 }
    await montar()
    const texto = contenedor.textContent ?? ''
    expect(texto).toContain('inmobiliaria.ai.cobranza.planes.comparison.pagoUnico')
    expect(texto.replace(/\s/g, ' ')).toMatch(/6\.050\.000/)
    expect(texto.replace(/\s/g, ' ')).not.toMatch(/\$ ?0(?![\d.])/)
  })
})
