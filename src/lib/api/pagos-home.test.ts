import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Keep the import chain node-safe (agent-auth → supabase client).
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}))

import {
  metricsToKpis,
  attentionToFeed,
  fetchPagosHome,
  type PagosHomeMetrics,
  type PagosHomeAttentionItem,
} from './pagos-home'

const METRICS: PagosHomeMetrics = {
  cobrosProgramados: 12,
  cobrosEnviados: 8,
  pagosRecibidos: 5,
  linksPendientes: 3,
  pagosFallidos: 1,
  valorRecaudadoCop: 12_500_000,
  propietariosListos: 4,
  valorPendienteLiquidarCop: 8_300_000,
}

const ATTENTION: PagosHomeAttentionItem[] = [
  {
    id: 'a1',
    kind: 'cobro_fallido',
    priority: 'alta',
    title: 'Cobro fallido — Ana (APT-101)',
    detail: 'banco_rechazo',
    totalCop: 1_200_000,
    suggestedAction: 'reintentar_link',
  },
]

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('metricsToKpis', () => {
  it('maps the 8 camelCase metrics onto KPI ids matching the home KPI_SLOTS', () => {
    const kpis = metricsToKpis(METRICS)
    expect(kpis).toHaveLength(8)
    const byId = Object.fromEntries(kpis.map((k) => [k.id, k]))
    expect(byId.cobros_programados.value).toBe(12)
    expect(byId.cobros_enviados.value).toBe(8)
    expect(byId.pagos_recibidos.value).toBe(5)
    expect(byId.links_pendientes.value).toBe(3)
    expect(byId.pagos_fallidos.value).toBe(1)
    expect(byId.valor_recaudado).toMatchObject({ value: 12_500_000, format: 'cop' })
    expect(byId.pagos_propietarios_listos.value).toBe(4)
    expect(byId.valor_pendiente_liquidar).toMatchObject({ value: 8_300_000, format: 'cop' })
    // The two COP figures are the only 'cop' formats; the rest are counts.
    expect(kpis.filter((k) => k.format === 'cop').map((k) => k.id).sort()).toEqual([
      'valor_pendiente_liquidar',
      'valor_recaudado',
    ])
  })
})

describe('attentionToFeed', () => {
  it('maps attention items onto feed entries (title→titulo, detail→detalle, system actor)', () => {
    const feed = attentionToFeed(ATTENTION)
    expect(feed).toEqual([
      {
        id: 'a1',
        titulo: 'Cobro fallido — Ana (APT-101)',
        detalle: 'banco_rechazo',
        actorType: 'system',
        occurredAt: '',
      },
    ])
  })
})

describe('fetchPagosHome', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'https://agent.test'
  })
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AGENT_URL
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('200 metrics + 200 attention → adapted AgentOverviewResponse (kpis + feed)', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/metrics') ? jsonResponse(METRICS) : jsonResponse({ items: ATTENTION }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchPagosHome('agency-1')
    expect(res.notAvailable).toBe(false)
    expect(res.data?.agente).toBe('pagos')
    expect(res.data?.kpis).toHaveLength(8)
    expect(res.data?.feed).toHaveLength(1)
    // Hits the cobro-inquilino bespoke routes, NOT the generic overview.
    expect(fetchMock.mock.calls[0][0]).toBe('https://agent.test/api/agency/agency-1/pagos/home/metrics')
  })

  it('503 (PAGOS_ENABLED off) on metrics → notAvailable (graceful empty, not error)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'pagos_disabled' }, 503)))
    const res = await fetchPagosHome('agency-1')
    expect(res).toEqual({ data: null, notAvailable: true })
  })

  it('404 (not deployed) on metrics → notAvailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'not found' }, 404)))
    const res = await fetchPagosHome('agency-1')
    expect(res).toEqual({ data: null, notAvailable: true })
  })

  it('attention failure degrades to an empty feed; KPIs still returned', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/metrics') ? jsonResponse(METRICS) : jsonResponse({ error: 'boom' }, 500),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await fetchPagosHome('agency-1')
    expect(res.notAvailable).toBe(false)
    expect(res.data?.kpis).toHaveLength(8)
    expect(res.data?.feed).toEqual([])
  })

  it('a non-404/503 error on metrics propagates (real failure, not a graceful empty)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, 500)))
    await expect(fetchPagosHome('agency-1')).rejects.toThrow('500')
  })

  it('throws not_configured when NEXT_PUBLIC_AGENT_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL
    vi.stubGlobal('fetch', vi.fn())
    await expect(fetchPagosHome('agency-1')).rejects.toThrow('not_configured')
  })
})
