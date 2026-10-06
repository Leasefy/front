/**
 * QA-INQ-95 (04-10-2026) · Un acuerdo que ya no está vivo (completado porque la
 * deuda se pagó por fuera, cancelado o incumplido) no se cobra: la ruta firmaba
 * la sesión de Wompi de su cuota igual, y el pago caía en un acuerdo que el
 * micro ya no puede cerrar (el inquilino pagaba de más).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { POST } from './route'
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types'

const PLAN: AcuerdoDetail = {
  planId: 'plan-1',
  tenantId: 'tenant-1',
  debtorId: 'debtor-1',
  stage: 'S2',
  status: 'completed',
  paymentProvider: 'wompi',
  paymentUrl: null,
  totalDueCop: 6_050_000,
  initialAmountCop: 1_815_000,
  discountAppliedPct: 0,
  discountKind: 'none',
  offeredAt: '2026-10-03T10:18:43.828Z',
  acceptedAt: '2026-10-03T10:21:55.454Z',
  defaultedAt: null,
  installments: [
    { number: 0, dueDate: '2026-10-03', amountCop: 1_815_000, status: 'pending', paidAt: null },
    { number: 2, dueDate: '2026-12-03', amountCop: 1_411_666, status: 'pending', paidAt: null },
  ],
}

const realFetch = globalThis.fetch
beforeEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = 'secreto'
  process.env.WOMPI_PUBLIC_KEY = 'pub_test_key'
})
afterEach(() => {
  globalThis.fetch = realFetch
})

function pedir(plan: AcuerdoDetail, cuotaNumber = 0) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => plan } as unknown as Response)
  return POST(
    new Request('http://localhost/api/inquilino/acuerdos/wompi-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer jwt' },
      body: JSON.stringify({ planId: 'plan-1', cuotaNumber }),
    }),
  )
}

describe('la cuota de un acuerdo que ya no está vivo no se cobra', () => {
  for (const status of ['completed', 'cancelled', 'defaulted']) {
    it(`acuerdo ${status} → 409 ACUERDO_NO_VIGENTE, sin firma`, async () => {
      const res = await pedir({ ...PLAN, status })
      expect(res.status).toBe(409)
      const cuerpo = (await res.json()) as Record<string, unknown>
      expect(cuerpo.code).toBe('ACUERDO_NO_VIGENTE')
      expect(cuerpo).not.toHaveProperty('integrity')
      expect(String(cuerpo.message)).toMatch(/ya no/i)
    })
  }

  it('un acuerdo vivo se sigue cobrando', async () => {
    const res = await pedir({ ...PLAN, status: 'active' })
    expect(res.status).toBe(200)
  })

  it('un acuerdo vivo cuya deuda ya se saldó por fuera (deudaSaldada) → 409 ACUERDO_SIN_DEUDA, sin firma', async () => {
    const res = await pedir({ ...PLAN, status: 'active', deudaSaldada: true }, 2)
    expect(res.status).toBe(409)
    const cuerpo = (await res.json()) as Record<string, unknown>
    expect(cuerpo.code).toBe('ACUERDO_SIN_DEUDA')
    expect(cuerpo).not.toHaveProperty('integrity')
    expect(String(cuerpo.message)).toMatch(/no debes nada vencido/i)
  })

  it('deudaSaldada: false (o ausente) no cambia nada', async () => {
    const res = await pedir({ ...PLAN, status: 'active', deudaSaldada: false })
    expect(res.status).toBe(200)
  })
})
