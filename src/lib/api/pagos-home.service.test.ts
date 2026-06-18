/**
 * pagos-home.service.test.ts — data-layer service unit tests.
 *
 * Mocks globalThis.fetch and `getAccessToken` (the bearer source consumed by
 * agentAuthHeaders) to assert: correct URL, auth header attached, happy-shape
 * parse, and the 503→disabled / 404→null/typed-error mappings.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// agentAuthHeaders reads getAccessToken() from ./client — give it a known token.
vi.mock('./client', () => ({
  getAccessToken: () => 'TEST-TOKEN',
}))

import {
  PagosHomeError,
  getOwnerInbox,
  getPagosHomeAttention,
  getPagosHomeMetrics,
  getPaymentDetail,
} from './pagos-home.service'
import type {
  OwnerInbox,
  PagosHomeAttention,
  PagosHomeMetrics,
  PaymentDetail,
} from './pagos-home.types'

const AGENT_URL = 'http://agent.test'
const AGENCY_ID = 'AGY-123'

/** Build a Response-like stub for the fetch mock. */
function mockResponse(opts: {
  ok?: boolean
  status?: number
  json?: unknown
}): Response {
  const status = opts.status ?? 200
  return {
    ok: opts.ok ?? (status >= 200 && status < 300),
    status,
    json: async () => opts.json ?? {},
  } as unknown as Response
}

type FetchMock = ReturnType<typeof vi.fn<typeof globalThis.fetch>>

function installFetch(res: Response): FetchMock {
  const fetchMock = vi.fn<typeof globalThis.fetch>(async () => res)
  globalThis.fetch = fetchMock
  return fetchMock
}

/** URL (first arg) of the first fetch call. */
function urlOf(fetchMock: FetchMock): string {
  return fetchMock.mock.calls[0]![0] as string
}

/** Extract the Authorization header from the first fetch call. */
function authHeaderOf(fetchMock: FetchMock): string | null {
  const init = fetchMock.mock.calls[0]![1]
  const headers = init?.headers as Headers
  return headers.get('Authorization')
}

const METRICS: PagosHomeMetrics = {
  cobrosProgramados: 12,
  cobrosEnviados: 9,
  pagosRecibidos: 7,
  linksPendientes: 3,
  pagosFallidos: 1,
  valorRecaudadoCop: 4_200_000,
  propietariosListos: 5,
  valorPendienteLiquidarCop: 1_800_000,
}

const ATTENTION: PagosHomeAttention = {
  items: [
    {
      id: 'a1',
      kind: 'cobro_fallido',
      priority: 'alta',
      title: 'Cobro rechazado',
      detail: 'Tarjeta declinada',
      totalCop: 1_200_000,
      suggestedAction: 'Reintentar con otro medio',
    },
  ],
}

const DETAIL: PaymentDetail = {
  contexto: {
    invoiceId: 'INV-1',
    periodo: '2026-06',
    totalCop: 1_500_000,
    status: 'pending',
    dueDate: '2026-06-30',
    tenantPersonName: 'Ana Pérez',
    tenantPersonPhone: '3001234567',
    propertyRef: 'Apto 301',
  },
  actividad: [{ at: '2026-06-01T10:00:00Z', kind: 'link_sent', detail: 'Link enviado' }],
  recomendacionIA: { text: 'Enviar recordatorio', suggestedAction: 'send_reminder' },
}

const OWNER_INBOX: OwnerInbox = {
  rows: [
    {
      ownerProfileId: 'OWN-1',
      ownerName: 'Carlos Ruiz',
      inmueblesCount: 2,
      valorAPagarCop: 2_400_000,
      estado: 'listo',
      suggestedAction: 'Liquidar',
    },
  ],
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = AGENT_URL
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.NEXT_PUBLIC_AGENT_URL
})

// ── metrics ──────────────────────────────────────────────────────────────────

describe('getPagosHomeMetrics', () => {
  it('builds the metrics URL, attaches bearer auth, parses the happy shape', async () => {
    const fetchMock = installFetch(mockResponse({ json: METRICS }))

    const data = await getPagosHomeMetrics(AGENCY_ID)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(urlOf(fetchMock)).toBe(
      `${AGENT_URL}/api/agency/${AGENCY_ID}/pagos/home/metrics`,
    )
    expect(authHeaderOf(fetchMock)).toBe('Bearer TEST-TOKEN')
    expect(data).toEqual(METRICS)
  })

  it('maps 503 pagos_disabled to a PagosHomeError with code "pagos_disabled"', async () => {
    installFetch(mockResponse({ ok: false, status: 503, json: { error: 'pagos_disabled' } }))

    await expect(getPagosHomeMetrics(AGENCY_ID)).rejects.toMatchObject({
      code: 'pagos_disabled',
      status: 503,
    })
    await expect(getPagosHomeMetrics(AGENCY_ID)).rejects.toBeInstanceOf(PagosHomeError)
  })

  it('maps a generic 500 to a PagosHomeError with code "error"', async () => {
    installFetch(mockResponse({ ok: false, status: 500, json: { error: 'boom' } }))

    await expect(getPagosHomeMetrics(AGENCY_ID)).rejects.toMatchObject({
      code: 'error',
      status: 500,
    })
  })

  it('throws no_agent_url when NEXT_PUBLIC_AGENT_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL
    const fetchMock = installFetch(mockResponse({ json: METRICS }))

    await expect(getPagosHomeMetrics(AGENCY_ID)).rejects.toMatchObject({ code: 'no_agent_url' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ── attention ──────────────────────────────────────────────────────────────

describe('getPagosHomeAttention', () => {
  it('builds the attention URL with auth and parses items', async () => {
    const fetchMock = installFetch(mockResponse({ json: ATTENTION }))

    const data = await getPagosHomeAttention(AGENCY_ID)

    expect(urlOf(fetchMock)).toBe(
      `${AGENT_URL}/api/agency/${AGENCY_ID}/pagos/home/attention`,
    )
    expect(authHeaderOf(fetchMock)).toBe('Bearer TEST-TOKEN')
    expect(data.items).toHaveLength(1)
    expect(data.items[0].kind).toBe('cobro_fallido')
  })

  it('maps 503 to disabled error', async () => {
    installFetch(mockResponse({ ok: false, status: 503, json: { error: 'pagos_disabled' } }))
    await expect(getPagosHomeAttention(AGENCY_ID)).rejects.toMatchObject({ code: 'pagos_disabled' })
  })
})

// ── payment detail ─────────────────────────────────────────────────────────

describe('getPaymentDetail', () => {
  it('builds the payment URL with the invoiceId, attaches auth, parses the shape', async () => {
    const fetchMock = installFetch(mockResponse({ json: DETAIL }))

    const data = await getPaymentDetail(AGENCY_ID, 'INV-1')

    expect(urlOf(fetchMock)).toBe(
      `${AGENT_URL}/api/agency/${AGENCY_ID}/pagos/home/payment/INV-1`,
    )
    expect(authHeaderOf(fetchMock)).toBe('Bearer TEST-TOKEN')
    expect(data?.contexto.invoiceId).toBe('INV-1')
    expect(data?.actividad).toHaveLength(1)
  })

  it('returns null on 404 not_found (absence, not a thrown error)', async () => {
    installFetch(mockResponse({ ok: false, status: 404, json: { error: 'not_found' } }))

    await expect(getPaymentDetail(AGENCY_ID, 'MISSING')).resolves.toBeNull()
  })

  it('maps 503 to a disabled PagosHomeError', async () => {
    installFetch(mockResponse({ ok: false, status: 503, json: { error: 'pagos_disabled' } }))
    await expect(getPaymentDetail(AGENCY_ID, 'INV-1')).rejects.toMatchObject({
      code: 'pagos_disabled',
    })
  })

  it('maps a 400 bad-uuid to a generic error', async () => {
    installFetch(mockResponse({ ok: false, status: 400, json: { error: 'bad_uuid' } }))
    await expect(getPaymentDetail(AGENCY_ID, 'not-a-uuid')).rejects.toMatchObject({
      code: 'error',
      status: 400,
    })
  })
})

// ── owner inbox ────────────────────────────────────────────────────────────

describe('getOwnerInbox', () => {
  it('builds the owner-inbox URL with auth and parses rows', async () => {
    const fetchMock = installFetch(mockResponse({ json: OWNER_INBOX }))

    const data = await getOwnerInbox(AGENCY_ID)

    expect(urlOf(fetchMock)).toBe(
      `${AGENT_URL}/api/agency/${AGENCY_ID}/pagos/home/owner-inbox`,
    )
    expect(authHeaderOf(fetchMock)).toBe('Bearer TEST-TOKEN')
    expect(data.rows).toHaveLength(1)
    expect(data.rows[0].ownerProfileId).toBe('OWN-1')
  })

  it('maps 503 to disabled error', async () => {
    installFetch(mockResponse({ ok: false, status: 503, json: { error: 'pagos_disabled' } }))
    await expect(getOwnerInbox(AGENCY_ID)).rejects.toMatchObject({ code: 'pagos_disabled' })
  })
})
