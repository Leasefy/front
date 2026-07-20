/**
 * ACUE-03 route proof — the cuota Wompi session route mirrors the v7-04 rent-route
 * security intent: the amount is resolved SERVER-SIDE from the agent's payment-plan
 * record (a tampered amount in the request body is ignored), the integrity secret is
 * never returned to the client, and auth/config/ownership gates behave.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'

import { POST } from './route'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types'

const SENTINEL_SECRET = 'sentinel_secret_value_never_leaked'
const PUBLIC_KEY = 'pub_test_key'

// A fully-typed agent record — the SOLE source of the cuota amount (no client math).
const PLAN: AcuerdoDetail = {
  planId: 'plan-1',
  tenantId: 'tenant-1',
  debtorId: 'debtor-1',
  stage: 'S2',
  status: 'offered',
  paymentProvider: 'wompi',
  paymentUrl: 'https://checkout.wompi.co/l/plan-1',
  totalDueCop: 1_500_000,
  initialAmountCop: 500_000,
  discountAppliedPct: 0,
  discountKind: 'none',
  offeredAt: '2026-07-01T14:00:00.000Z',
  acceptedAt: null,
  defaultedAt: null,
  installments: [
    { number: 1, dueDate: '2026-08-01', amountCop: 500_000, status: 'pending', paidAt: null },
    { number: 2, dueDate: '2026-09-01', amountCop: 500_000, status: 'pending', paidAt: null },
  ],
}

/** Mock the agent payment-plan lookup fetch (route reads planRes.json()). */
function mockPlanFetch(plan: unknown, opts: { ok?: boolean; status?: number } = {}) {
  const status = opts.status ?? 200
  return vi.fn().mockResolvedValue({
    ok: opts.ok ?? (status >= 200 && status < 300),
    status,
    json: async () => plan,
  } as unknown as Response)
}

/** Build a POST Request; pass `auth: false` to omit the Authorization header. */
function makeReq(
  body: unknown,
  { auth = true }: { auth?: boolean } = {},
): Request {
  return new Request('http://localhost/api/inquilino/acuerdos/wompi-session', {
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

describe('POST /api/inquilino/acuerdos/wompi-session — server-resolved amount (anti-tamper)', () => {
  it('IGNORES a tampered amount in the body — resolves the cuota amount from the agent record', async () => {
    globalThis.fetch = mockPlanFetch(PLAN)
    // Client tries to tamper the price; the route must not honor it.
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 1, amount: 999_999_999 }))
    const json = await res.json()

    expect(res.status).toBe(200)
    // 500_000 COP → 50_000_000 cents, NOT the tampered 999_999_999.
    expect(json.amountInCents).toBe(50_000_000)
    expect(json.reference).toBe('acuerdo-plan-1-c1')
    expect(json.currency).toBe('COP')
  })

  it('resolves the plan-level total when no cuotaNumber is given', async () => {
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ planId: 'plan-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.amountInCents).toBe(150_000_000) // totalDueCop 1_500_000 → cents
    expect(json.reference).toBe('acuerdo-plan-1')
  })

  it('binds the integrity hash to the SERVER-resolved reference+amount+currency', async () => {
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 2 }))
    const json = await res.json()

    const expected = computeWompiIntegrity(
      'acuerdo-plan-1-c2',
      50_000_000,
      'COP',
      SENTINEL_SECRET,
    )
    expect(json.integrity).toBe(expected)
  })
})

describe('POST /api/inquilino/acuerdos/wompi-session — no secret leak', () => {
  it('NEVER returns the integrity secret in the response body', async () => {
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 1 }))
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

describe('POST /api/inquilino/acuerdos/wompi-session — auth / config / validation gates', () => {
  it('returns 401 when the Authorization header is missing', async () => {
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 1 }, { auth: false }))
    expect(res.status).toBe(401)
  })

  it('returns 500 wompi_not_configured when the server-only secret env is unset', async () => {
    delete process.env.WOMPI_INTEGRITY_SECRET
    delete process.env.WOMPI_PUBLIC_KEY
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 1 }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('wompi_not_configured')
  })

  it('returns 400 when planId is missing', async () => {
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ cuotaNumber: 1 }))
    expect(res.status).toBe(400)
  })

  it('propagates the upstream status when the agent plan lookup is non-ok (ownership/RLS)', async () => {
    globalThis.fetch = mockPlanFetch({}, { ok: false, status: 403 })
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 1 }))
    expect(res.status).toBe(403)
  })

  it('returns 502 when the resolved cuota amount is not a positive number', async () => {
    // cuotaNumber references a cuota that does not exist → amount is undefined.
    globalThis.fetch = mockPlanFetch(PLAN)
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 99 }))
    const json = await res.json()
    expect(res.status).toBe(502)
    expect(json.error).toBe('invalid_amount')
  })

  it('returns 502 when the agent record reports a zero amount', async () => {
    const zeroPlan: AcuerdoDetail = {
      ...PLAN,
      installments: [
        { number: 1, dueDate: '2026-08-01', amountCop: 0, status: 'pending', paidAt: null },
      ],
    }
    globalThis.fetch = mockPlanFetch(zeroPlan)
    const res = await POST(makeReq({ planId: 'plan-1', cuotaNumber: 1 }))
    expect(res.status).toBe(502)
  })
})
