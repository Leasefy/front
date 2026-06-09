import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  requestPreApproval,
  aseguradoraDisplayName,
  PreApprovalRequestError,
  type PreApprovalRequest,
  type PreApprovalResult,
} from './funnel.service'

const REQ: PreApprovalRequest = {
  documentNumber: '1098765432',
  phoneE164: '+573001112233',
  ciudad: 'Bogotá',
  canonCop: 2_000_000,
  tipoInmueble: 'apartamento',
  consent: true,
}

const OK_RESULT: PreApprovalResult = {
  asegurabilidad: 'yes',
  aseguradoras: [{ aseguradora: 'sura', status: 'approved' }],
  stubMode: true,
  message: 'Un asesor se pondrá en contacto contigo.',
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

describe('aseguradoraDisplayName', () => {
  it('maps known carrier codes', () => {
    expect(aseguradoraDisplayName('sura')).toBe('Sura')
    expect(aseguradoraDisplayName('bolivar')).toBe('Bolívar')
  })
  it('title-cases unknown codes', () => {
    expect(aseguradoraDisplayName('xyz')).toBe('Xyz')
  })
})

describe('requestPreApproval', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('returns the parsed result on 200', async () => {
    globalThis.fetch = mockFetch(200, OK_RESULT)
    const r = await requestPreApproval(REQ)
    expect(r).toEqual(OK_RESULT)
  })

  it('POSTs JSON to the funnel endpoint', async () => {
    const f = mockFetch(200, OK_RESULT)
    globalThis.fetch = f
    await requestPreApproval(REQ)
    const [url, init] = f.mock.calls[0]
    expect(String(url)).toContain('/api/funnel/preaprobacion')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({ documentNumber: REQ.documentNumber, consent: true })
  })

  it('maps 429 → rate_limited', async () => {
    globalThis.fetch = mockFetch(429, { error: 'rate_limit_exceeded' })
    await expect(requestPreApproval(REQ)).rejects.toMatchObject({ kind: 'rate_limited' })
  })

  it('maps 404 and 503 → unavailable', async () => {
    globalThis.fetch = mockFetch(404, { error: 'not_found' })
    await expect(requestPreApproval(REQ)).rejects.toMatchObject({ kind: 'unavailable' })
    globalThis.fetch = mockFetch(503, { error: 'database unavailable' })
    await expect(requestPreApproval(REQ)).rejects.toMatchObject({ kind: 'unavailable' })
  })

  it('maps 422 → validation', async () => {
    globalThis.fetch = mockFetch(422, { errors: [] })
    await expect(requestPreApproval(REQ)).rejects.toMatchObject({ kind: 'validation' })
  })

  it('maps other non-OK → network', async () => {
    globalThis.fetch = mockFetch(500, { error: 'boom' })
    await expect(requestPreApproval(REQ)).rejects.toMatchObject({ kind: 'network' })
  })

  it('maps a thrown fetch (offline) → network', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    const err = await requestPreApproval(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreApprovalRequestError)
    expect(err.kind).toBe('network')
  })
})
