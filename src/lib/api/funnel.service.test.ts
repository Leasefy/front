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
  maxAfianzableCop: null,
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

describe('requestPreApproval — postura de producción', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => {
    vi.restoreAllMocks()
    // Con agente configurado y en producción: SIEMPRE fetch real, sin demos.
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', undefined)
    vi.stubEnv('NODE_ENV', 'production')
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.unstubAllEnvs()
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

/*
 * La ruta del agente está construida pero vive solo en ramas locales: no está
 * en origin/develop ni origin/main. Sin degradar a demo, el recorrido completo
 * del inquilino es intransitable en local. Lo que se protege acá es que esa
 * degradación NUNCA llegue a producción y que siempre se anuncie.
 */
describe('modo demo', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.unstubAllEnvs()
  })

  it('sin agente configurado devuelve la demo sin tocar la red', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    const f = vi.fn()
    globalThis.fetch = f
    const r = await requestPreApproval(REQ)
    expect(f).not.toHaveBeenCalled()
    expect(r.stubMode).toBe(true)
  })

  it('el override explícito fuerza la demo aun con agente configurado', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const f = vi.fn()
    globalThis.fetch = f
    await requestPreApproval(REQ)
    expect(f).not.toHaveBeenCalled()
  })

  it('en desarrollo, un 404 degrada a demo en vez de romper el flujo', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NODE_ENV', 'development')
    globalThis.fetch = mockFetch(404, { error: 'not_found' })
    const r = await requestPreApproval(REQ)
    expect(r.stubMode).toBe(true)
  })

  it('en producción, el MISMO 404 sigue siendo un error visible', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NODE_ENV', 'production')
    globalThis.fetch = mockFetch(404, { error: 'not_found' })
    await expect(requestPreApproval(REQ)).rejects.toMatchObject({ kind: 'unavailable' })
  })

  it('la demo se marca SIEMPRE con stubMode, para que la UI pueda avisarlo', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    const r = await requestPreApproval(REQ)
    expect(r.stubMode).toBe(true)
    expect(r.message).toMatch(/ejemplo/i)
  })
})
