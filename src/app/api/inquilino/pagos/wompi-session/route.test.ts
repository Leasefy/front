/**
 * PAGO-02 route proof — the rent Wompi session route is the security core of v7-04.
 * The amount is resolved SERVER-SIDE from the backend's payment-info endpoint (a
 * tampered amount in the request body is ignored), the integrity secret is never
 * returned to the client, and the period lock blocks a second payment for the same
 * period. Mirrors the sibling ACUE-03 test (`inquilino/acuerdos/wompi-session/route.test.ts`),
 * which documents this route as its own precedent.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { POST } from './route'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import type { BackendPaymentInfo } from '@/lib/api/leases.types'

const SENTINEL_SECRET = 'sentinel_secret_value_never_leaked'
const PUBLIC_KEY = 'pub_test_key'

// A fully-typed backend record — the SOLE source of the amount (no client math).
const PAYMENT_INFO: BackendPaymentInfo = {
  leaseId: 'lease-1',
  monthlyRent: 1_500_000,
  paymentDay: 5,
  paymentMethods: [],
  currentPeriod: { month: 7, year: 2026 },
  currentPeriodStatus: 'NONE',
  currentPeriodRejectionReason: null,
}

/** Mock the backend payment-info lookup fetch (route reads infoRes.json()). */
function mockPaymentInfoFetch(info: unknown, opts: { ok?: boolean; status?: number } = {}) {
  const status = opts.status ?? 200
  return vi.fn().mockResolvedValue({
    ok: opts.ok ?? (status >= 200 && status < 300),
    status,
    json: async () => info,
  } as unknown as Response)
}

/** Build a POST Request; pass `auth: false` to omit the Authorization header. */
function makeReq(body: unknown, { auth = true }: { auth?: boolean } = {}): Request {
  return new Request('http://localhost/api/inquilino/pagos/wompi-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { authorization: 'Bearer tenant-jwt' } : {}),
    },
    body: JSON.stringify(body),
  })
}

const realFetch = globalThis.fetch
const origSecret = process.env.WOMPI_INTEGRITY_SECRET
const origPublicKey = process.env.WOMPI_PUBLIC_KEY

beforeEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = SENTINEL_SECRET
  process.env.WOMPI_PUBLIC_KEY = PUBLIC_KEY
})

afterEach(() => {
  globalThis.fetch = realFetch
  if (origSecret === undefined) delete process.env.WOMPI_INTEGRITY_SECRET
  else process.env.WOMPI_INTEGRITY_SECRET = origSecret
  if (origPublicKey === undefined) delete process.env.WOMPI_PUBLIC_KEY
  else process.env.WOMPI_PUBLIC_KEY = origPublicKey
})

describe('POST /api/inquilino/pagos/wompi-session — server-resolved amount (anti-tamper)', () => {
  it('IGNORES a tampered amount in the body — resolves the rent amount from the backend record', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    // Client tries to tamper the price; the route must not honor it.
    const res = await POST(makeReq({ leaseId: 'lease-1', amount: 1 }))
    const json = await res.json()

    expect(res.status).toBe(200)
    // 1_500_000 COP -> 150_000_000 cents, NOT a tampered value.
    expect(json.amountInCents).toBe(150_000_000)
    expect(json.reference).toBe('rent-lease-1-2026-07')
    expect(json.currency).toBe('COP')
  })

  it('binds the integrity hash to the SERVER-resolved reference+amount+currency', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()

    const expected = computeWompiIntegrity(
      'rent-lease-1-2026-07',
      150_000_000,
      'COP',
      SENTINEL_SECRET,
    )
    expect(json.integrity).toBe(expected)
  })
})

describe('POST /api/inquilino/pagos/wompi-session — no secret leak', () => {
  it('NEVER returns the integrity secret in the response body', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()

    expect(JSON.stringify(json)).not.toContain(SENTINEL_SECRET)
    expect(json.integrity).not.toBe(SENTINEL_SECRET)
    expect(Object.keys(json)).toEqual([
      'reference',
      'amountInCents',
      'currency',
      'integrity',
      'publicKey',
    ])
    expect(json.publicKey).toBe(PUBLIC_KEY)
  })
})

describe('POST /api/inquilino/pagos/wompi-session — period lock (no double-pay)', () => {
  it.each(['APPROVED', 'PENDING_VALIDATION'] as const)(
    'returns 409 period_not_payable when currentPeriodStatus is %s',
    async (status) => {
      globalThis.fetch = mockPaymentInfoFetch({ ...PAYMENT_INFO, currentPeriodStatus: status })
      const res = await POST(makeReq({ leaseId: 'lease-1' }))
      const json = await res.json()
      expect(res.status).toBe(409)
      expect(json.error).toBe('period_not_payable')
    },
  )

  it.each(['NONE', 'REJECTED'] as const)(
    'allows a session when currentPeriodStatus is %s',
    async (status) => {
      globalThis.fetch = mockPaymentInfoFetch({ ...PAYMENT_INFO, currentPeriodStatus: status })
      const res = await POST(makeReq({ leaseId: 'lease-1' }))
      expect(res.status).toBe(200)
    },
  )
})

describe('POST /api/inquilino/pagos/wompi-session — auth / config / validation gates', () => {
  it('returns 401 when the Authorization header is missing', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }, { auth: false }))
    expect(res.status).toBe(401)
  })

  it('returns 500 wompi_not_configured when the server-only secret env is unset', async () => {
    delete process.env.WOMPI_INTEGRITY_SECRET
    delete process.env.WOMPI_PUBLIC_KEY
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('wompi_not_configured')
  })

  it('returns 400 when leaseId is missing', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid JSON body', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const req = new Request('http://localhost/api/inquilino/pagos/wompi-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer tenant-jwt' },
      body: '{not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('propagates the upstream status when the payment-info lookup is non-ok (ownership enforcement)', async () => {
    globalThis.fetch = mockPaymentInfoFetch({}, { ok: false, status: 403 })
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    expect(res.status).toBe(403)
  })

  it('returns 502 when the resolved rent amount is not a positive number', async () => {
    globalThis.fetch = mockPaymentInfoFetch({ ...PAYMENT_INFO, monthlyRent: 0 })
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()
    expect(res.status).toBe(502)
    expect(json.error).toBe('invalid_amount')
  })
})
