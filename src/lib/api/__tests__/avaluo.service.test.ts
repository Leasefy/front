/**
 * avaluo.service.test.ts
 *
 * Covers the payment-at-intake contract:
 *   - submitIntake returns the widened shape ({id, token, paymentUrl,
 *     paymentProvider}) — the micro pairs the citizen with a Wompi checkout
 *     URL right at intake (WU2), before the valuation runs.
 *   - startPayment (POST /:certId/pay) is REMOVED — the micro route is a
 *     hard 410 Gone.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as avaluoService from '../avaluo.service'
import { createEmptyAvaluoFormData } from '@/lib/types/avaluo'

function mockFetchOnce(body: unknown, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('submitIntake', () => {
  it('passes through paymentUrl and paymentProvider from the micro response', async () => {
    const fetchMock = mockFetchOnce({
      id: 'sub-1',
      token: 'cap-token-1',
      paymentUrl: 'https://checkout.wompi.co/l/x',
      paymentProvider: 'wompi',
    })
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const formData = createEmptyAvaluoFormData('citizen@example.com')
    const res = await avaluoService.submitIntake(formData)

    expect(res.id).toBe('sub-1')
    expect(res.token).toBe('cap-token-1')
    expect(res.paymentUrl).toBe('https://checkout.wompi.co/l/x')
    expect(res.paymentProvider).toBe('wompi')
  })

  it('passes through a null paymentUrl/paymentProvider (stub or unpriced case)', async () => {
    const fetchMock = mockFetchOnce({
      id: 'sub-2',
      token: 'cap-token-2',
      paymentUrl: null,
      paymentProvider: null,
    })
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const formData = createEmptyAvaluoFormData('citizen@example.com')
    const res = await avaluoService.submitIntake(formData)

    expect(res.paymentUrl).toBeNull()
    expect(res.paymentProvider).toBeNull()
  })
})

describe('startPayment removal', () => {
  it('is no longer exported — POST /:certId/pay is a dead 410 route', () => {
    expect((avaluoService as Record<string, unknown>).startPayment).toBeUndefined()
    expect((avaluoService.avaluoService as Record<string, unknown>).startPayment).toBeUndefined()
  })
})
