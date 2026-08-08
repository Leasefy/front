import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('fetchFunnelApplications (real fetch path, prod posture)', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => {
    // Prod case: agent URL configured, override var unset → REAL fetch.
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', undefined)
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.unstubAllEnvs()
  })

  it('fetches for real when the agent URL is set and the override var is unset (prod case)', async () => {
    const f = mockFetch(200, OK)
    globalThis.fetch = f
    await fetchFunnelApplications(AGENCY)
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0][0])).toContain('http://agent.test/api/agency/')
  })

  it('fetches for real when the agent URL is set and the var is explicitly "false"', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false')
    const f = mockFetch(200, OK)
    globalThis.fetch = f
    await fetchFunnelApplications(AGENCY)
    expect(f).toHaveBeenCalledTimes(1)
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

describe('fetchFunnelApplications (mock mode)', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.unstubAllEnvs()
  })

  it('returns deterministic items without hitting the network when the agent URL is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', undefined)
    const f = mockFetch(200, OK)
    globalThis.fetch = f

    const res = await fetchFunnelApplications(AGENCY, { limit: 50 })

    expect(f).not.toHaveBeenCalled()
    expect(res.items.length).toBeGreaterThanOrEqual(3)
    expect(res.generatedAt).toBeTruthy()
  })

  it('returns mock items when NEXT_PUBLIC_USE_MOCK_API === "true" even with the agent URL configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const f = mockFetch(200, OK)
    globalThis.fetch = f

    const res = await fetchFunnelApplications(AGENCY)

    expect(f).not.toHaveBeenCalled()
    expect(res.items.length).toBeGreaterThanOrEqual(3)
  })

  it('covers both verdicts with realistic scores, levels and ISO scoredAt, using stable ids', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')

    const first = await fetchFunnelApplications(AGENCY)
    const second = await fetchFunnelApplications(AGENCY)

    const verdicts = new Set(first.items.map((i) => i.verdict))
    expect(verdicts).toContain('approved')
    expect(verdicts).toContain('review')

    for (const item of first.items) {
      expect(item.applicationId).toBeTruthy()
      expect(typeof item.score).toBe('number')
      expect(item.level).toBeTruthy()
      expect(Number.isNaN(new Date(item.scoredAt).getTime())).toBe(false)
    }

    // Stable ids across calls.
    expect(second.items.map((i) => i.applicationId)).toEqual(first.items.map((i) => i.applicationId))
  })

  it('still rejects a missing agencyId in mock mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    await expect(fetchFunnelApplications('')).rejects.toThrow(/agencia/i)
  })
})

describe('helpers', () => {
  it('shortApplicationRef truncates long ids and guards empty', () => {
    expect(shortApplicationRef('app-123456789')).toBe('app-1234…')
    expect(shortApplicationRef('short')).toBe('short')
    expect(shortApplicationRef('')).toBe('—')
  })

  it('VERDICT_CONFIG expone claves i18n, no literales', () => {
    // El copy vive en locales/{es,en}.json (VOCABULARIO §Cómo se aplica).
    expect(VERDICT_CONFIG.approved.labelKey).toMatch(/^inmobiliaria\.recorrido\.verdict\./)
    expect(VERDICT_CONFIG.review.labelKey).toMatch(/^inmobiliaria\.recorrido\.verdict\./)
  })

  it('VERDICT_CONFIG usa tokens y no colores crudos', () => {
    // `bg-[#E8F3EC]` es anti-patrón de DESIGN.md §9 y además ignora el modo oscuro.
    for (const cfg of Object.values(VERDICT_CONFIG)) {
      expect(cfg.className).not.toMatch(/#[0-9a-f]{3,8}/i)
    }
  })
})

describe('producción nunca sirve postulaciones inventadas', () => {
  // Sin esta guarda basta una env sin poner en el deploy para que una
  // inmobiliaria real trabaje cuatro candidatos que no existen.
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.unstubAllEnvs()
  })

  it('sale a la red aunque falte NEXT_PUBLIC_AGENT_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', undefined)
    const f = mockFetch(200, OK)
    globalThis.fetch = f

    await fetchFunnelApplications(AGENCY)

    expect(f).toHaveBeenCalled()
  })

  it('ignora NEXT_PUBLIC_USE_MOCK_API === "true"', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const f = mockFetch(200, OK)
    globalThis.fetch = f

    await fetchFunnelApplications(AGENCY)

    expect(f).toHaveBeenCalled()
  })
})
