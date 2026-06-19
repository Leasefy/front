import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  fetchFunnelApplications,
  shortApplicationRef,
  VERDICT_CONFIG,
  type FunnelApplicationsResponse,
} from './funnel-applications.service'

const AGENCY = 'agency-1'
const OK: FunnelApplicationsResponse = {
  items: [
    {
      applicationId: 'app-123456789',
      verdict: 'approved',
      score: 82,
      level: 'A',
      requiresManualReview: false,
      escalate: false,
      scoredAt: '2026-06-09T10:00:00.000Z',
    },
  ],
  generatedAt: '2026-06-09T11:00:00.000Z',
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

describe('fetchFunnelApplications', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('returns items on 200', async () => {
    globalThis.fetch = mockFetch(200, OK)
    const res = await fetchFunnelApplications(AGENCY)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].verdict).toBe('approved')
  })

  it('hits the agency-scoped funnel endpoint with a limit', async () => {
    const f = mockFetch(200, OK)
    globalThis.fetch = f
    await fetchFunnelApplications(AGENCY, { limit: 50 })
    const url = String(f.mock.calls[0][0])
    expect(url).toContain(`/api/agency/${AGENCY}/funnel/applications`)
    expect(url).toContain('limit=50')
  })

  it('throws a friendly error on non-OK', async () => {
    globalThis.fetch = mockFetch(503, { error: 'down' })
    await expect(fetchFunnelApplications(AGENCY)).rejects.toThrow(/no se pudieron cargar/i)
  })

  it('tolerates a malformed body (items missing → [])', async () => {
    globalThis.fetch = mockFetch(200, { generatedAt: 'x' })
    const res = await fetchFunnelApplications(AGENCY)
    expect(res.items).toEqual([])
  })

  it('rejects a missing agencyId before fetching', async () => {
    const f = mockFetch(200, OK)
    globalThis.fetch = f
    await expect(fetchFunnelApplications('')).rejects.toThrow(/agencia/i)
    expect(f).not.toHaveBeenCalled()
  })
})

describe('helpers', () => {
  it('shortApplicationRef truncates long ids and guards empty', () => {
    expect(shortApplicationRef('app-123456789')).toBe('app-1234…')
    expect(shortApplicationRef('short')).toBe('short')
    expect(shortApplicationRef('')).toBe('—')
  })

  it('VERDICT_CONFIG covers both verdicts', () => {
    expect(VERDICT_CONFIG.approved.label).toMatch(/aprobada/i)
    expect(VERDICT_CONFIG.review.label).toMatch(/revisi/i)
  })
})
