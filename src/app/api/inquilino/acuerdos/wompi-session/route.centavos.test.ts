/**
 * «Centavos en todo» (C3-FRONT, P7 a): la cuota de un acuerdo va a Wompi
 * EXACTA al centavo. $1.234.567,29 son 123.456.729 centavos —ni uno más ni
 * uno menos—, y la firma de integridad se calcula con ESE número.
 *
 * Antes: `Math.round(amountCop * 100)`. Daba bien casi siempre, pero dependía
 * del flotante (`0.29 * 100 === 28.999999999999996`); ahora pasa por
 * `aCentavosWompi` del módulo de plata, como el back.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { POST } from './route'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types'

const SECRETO = 'secreto_de_prueba'
const LLAVE_PUBLICA = 'pub_test_key'

function plan(amountCop: number, totalDueCop = amountCop): AcuerdoDetail {
  return {
    planId: 'plan-1',
    tenantId: 'tenant-1',
    debtorId: 'debtor-1',
    stage: 'S2',
    status: 'offered',
    paymentProvider: 'wompi',
    paymentUrl: 'https://checkout.wompi.co/l/plan-1',
    totalDueCop,
    initialAmountCop: amountCop,
    discountAppliedPct: 0,
    discountKind: 'none',
    offeredAt: '2026-07-01T14:00:00.000Z',
    acceptedAt: null,
    defaultedAt: null,
    installments: [
      { number: 1, dueDate: '2026-08-01', amountCop, status: 'pending', paidAt: null },
    ],
  }
}

function conElPlan(p: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => p } as unknown as Response)
}

function pedido(body: unknown): Request {
  return new Request('http://localhost/api/inquilino/acuerdos/wompi-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer tenant-jwt' },
    body: JSON.stringify(body),
  })
}

const fetchDeVerdad = globalThis.fetch

beforeEach(() => {
  vi.stubEnv('WOMPI_INTEGRITY_SECRET', SECRETO)
  vi.stubEnv('WOMPI_PUBLIC_KEY', LLAVE_PUBLICA)
})

afterEach(() => {
  globalThis.fetch = fetchDeVerdad
  vi.unstubAllEnvs()
})

describe('wompi-session del acuerdo — la cuota con centavos va exacta', () => {
  it('$1.234.567,29 → 123456729 centavos, y la firma va con ese número', async () => {
    globalThis.fetch = conElPlan(plan(1_234_567.29))
    const res = await POST(pedido({ planId: 'plan-1', cuotaNumber: 1 }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.amountInCents).toBe(123_456_729)
    expect(json.integrity).toBe(
      computeWompiIntegrity('acuerdo-plan-1-c1', 123_456_729, 'COP', SECRETO),
    )
  })

  it('el total del plan con centavos (sin cuota) también va exacto', async () => {
    globalThis.fetch = conElPlan(plan(500_000, 1_234_567.29))
    const res = await POST(pedido({ planId: 'plan-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.amountInCents).toBe(123_456_729)
  })

  it('el ruido del flotante no mueve un centavo (0,29 y 1.234.567,2900000001)', async () => {
    globalThis.fetch = conElPlan(plan(0.29))
    expect((await (await POST(pedido({ planId: 'plan-1', cuotaNumber: 1 }))).json()).amountInCents).toBe(29)

    globalThis.fetch = conElPlan(plan(1_234_567.2900000001))
    expect((await (await POST(pedido({ planId: 'plan-1', cuotaNumber: 1 }))).json()).amountInCents).toBe(
      123_456_729,
    )
  })

  it('un entero sigue siendo el de siempre (500.000 → 50.000.000)', async () => {
    globalThis.fetch = conElPlan(plan(500_000))
    const json = await (await POST(pedido({ planId: 'plan-1', cuotaNumber: 1 }))).json()
    expect(json.amountInCents).toBe(50_000_000)
  })
})
