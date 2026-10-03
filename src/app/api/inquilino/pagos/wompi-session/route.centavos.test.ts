/**
 * «Centavos en todo» (C3-FRONT, P7 a): el arriendo va a Wompi EXACTO al
 * centavo. Un canon de $1.234.567,29 son 123.456.729 centavos y la firma de
 * integridad se calcula con ESE número (antes `Math.round(canon * 100)`).
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { POST } from './route'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import type { BackendPaymentInfo } from '@/lib/api/leases.types'

const SECRETO = 'secreto_de_prueba'
const INTENTO = 1_759_449_600_123

function info(monthlyRent: number): BackendPaymentInfo {
  return {
    leaseId: 'lease-1',
    monthlyRent,
    paymentDay: 5,
    paymentMethods: [],
    currentPeriod: { month: 7, year: 2026 },
    currentPeriodStatus: 'NONE',
    currentPeriodRejectionReason: null,
  }
}

function conLaInfo(i: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => i } as unknown as Response)
}

function pedido(body: unknown): Request {
  return new Request('http://localhost/api/inquilino/pagos/wompi-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer tenant-jwt' },
    body: JSON.stringify(body),
  })
}

const fetchDeVerdad = globalThis.fetch

beforeEach(() => {
  vi.stubEnv('WOMPI_INTEGRITY_SECRET', SECRETO)
  vi.stubEnv('WOMPI_PUBLIC_KEY', 'pub_test_key')
  vi.spyOn(Date, 'now').mockReturnValue(INTENTO)
})

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = fetchDeVerdad
  vi.unstubAllEnvs()
})

describe('wompi-session del arriendo — el canon con centavos va exacto', () => {
  it('$1.234.567,29 → 123456729 centavos, y la firma va con ese número', async () => {
    globalThis.fetch = conLaInfo(info(1_234_567.29))
    const res = await POST(pedido({ leaseId: 'lease-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.amountInCents).toBe(123_456_729)
    expect(json.integrity).toBe(computeWompiIntegrity(json.reference, 123_456_729, 'COP', SECRETO))
  })

  it('un canon entero sigue siendo el de siempre (1.500.000 → 150.000.000)', async () => {
    globalThis.fetch = conLaInfo(info(1_500_000))
    const json = await (await POST(pedido({ leaseId: 'lease-1' }))).json()
    expect(json.amountInCents).toBe(150_000_000)
  })
})
