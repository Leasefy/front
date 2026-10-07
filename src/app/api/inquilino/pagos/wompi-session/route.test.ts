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

/** La hora del intento: la referencia la lleva (`-<epochMs>`, Nico 02-10-2026). */
const INTENTO = 1_759_449_600_123

beforeEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = SENTINEL_SECRET
  process.env.WOMPI_PUBLIC_KEY = PUBLIC_KEY
  vi.spyOn(Date, 'now').mockReturnValue(INTENTO)
})

afterEach(() => {
  vi.restoreAllMocks()
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
    expect(json.reference).toBe('rent-lease-1-2026-07-1759449600123')
    expect(json.currency).toBe('COP')
  })

  it('binds the integrity hash to the SERVER-resolved reference+amount+currency', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()

    const expected = computeWompiIntegrity(
      'rent-lease-1-2026-07-1759449600123',
      150_000_000,
      'COP',
      SENTINEL_SECRET,
    )
    expect(json.integrity).toBe(expected)
  })
})

describe('POST /api/inquilino/pagos/wompi-session — una referencia por intento (Nico, 02-10-2026)', () => {
  it('dos sesiones del mismo período llevan referencias distintas (y cada una su integridad)', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const primera = await (await POST(makeReq({ leaseId: 'lease-1' }))).json()
    vi.mocked(Date.now).mockReturnValue(INTENTO + 60_000)
    const segunda = await (await POST(makeReq({ leaseId: 'lease-1' }))).json()
    expect(primera.reference).toBe('rent-lease-1-2026-07-1759449600123')
    expect(segunda.reference).toBe('rent-lease-1-2026-07-1759449660123')
    expect(segunda.integrity).not.toBe(primera.integrity)
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
    'returns 409 PERIODO_NO_PAGABLE (in the envelope) when currentPeriodStatus is %s',
    async (status) => {
      globalThis.fetch = mockPaymentInfoFetch({ ...PAYMENT_INFO, currentPeriodStatus: status })
      const res = await POST(makeReq({ leaseId: 'lease-1' }))
      const json = await res.json()
      expect(res.status).toBe(409)
      expect(json).toEqual({
        statusCode: 409,
        code: 'PERIODO_NO_PAGABLE',
        message: 'Este período ya está pagado o en verificación.',
      })
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

  it('returns 500 PAGOS_SIN_CONFIGURAR when the server-only secret env is unset', async () => {
    delete process.env.WOMPI_INTEGRITY_SECRET
    delete process.env.WOMPI_PUBLIC_KEY
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.code).toBe('PAGOS_SIN_CONFIGURAR')
    expect(json.statusCode).toBe(500)
    expect(json.message).toMatch(/de nuestro lado/)
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
    expect(json.code).toBe('MONTO_INVALIDO')
    expect(json.message).toMatch(/^No pudimos calcular el valor del arriendo: algo falló de nuestro lado/)
  })

  // Auditoría de seguridad 23-09: el leaseId iba tal cual dentro de la ruta
  // del back; `fetch` normaliza `../` y la petición llegaba a OTRA ruta, cuya
  // respuesta se tomaba como el monto a firmar.
  it.each([['../../otra/ruta?'], ['lease-1/../../x'], ['lease-1#'], ['lease 1']])(
    'rejects a leaseId that changes the backend path (%s) without calling the backend',
    async (leaseId) => {
      const f = vi.fn()
      globalThis.fetch = f
      const res = await POST(makeReq({ leaseId }))
      expect(res.status).toBe(400)
      expect(f).not.toHaveBeenCalled()
    },
  )
})

/**
 * 🔴 02-10-2026 (Nico): la ruta pasa al sobre de error. Antes respondía
 * `{ error: 'payment_info_failed' }` (y otros códigos en inglés) y el modal
 * adivinaba por el status. Ahora: `{ statusCode, code, message }`, con
 * `message` en español; un 4xx del back se reenvía con SU `code` y SU frase.
 */
describe('POST /api/inquilino/pagos/wompi-session — el sobre de error', () => {
  const CLAVES_DEL_SOBRE = ['statusCode', 'code', 'message']
  const sinIngles = (json: Record<string, unknown>) => {
    expect(json).not.toHaveProperty('error')
    expect(JSON.stringify(json.message)).not.toMatch(/required|invalid|failed|unauthorized|not_configured/i)
  }

  it('🔴 un 401 sin sesión: SESION_REQUERIDA, en español', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({ leaseId: 'lease-1' }, { auth: false }))
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json).toEqual({
      statusCode: 401,
      code: 'SESION_REQUERIDA',
      message: 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.',
    })
  })

  it('un 400 sin leaseId trae `campos` con la ruta del cuerpo', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const res = await POST(makeReq({}))
    const json = await res.json()
    expect(json.statusCode).toBe(400)
    expect(json.code).toBe('DATOS_INVALIDOS')
    expect(json.campos).toEqual([
      { campo: 'leaseId', regla: 'requerido', mensaje: 'Falta el arriendo que vas a pagar. Recarga la página e intenta de nuevo.' },
    ])
    sinIngles(json)
  })

  it('un cuerpo que no es JSON: 400 DATOS_INVALIDOS en español', async () => {
    globalThis.fetch = mockPaymentInfoFetch(PAYMENT_INFO)
    const req = new Request('http://localhost/api/inquilino/pagos/wompi-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer tenant-jwt' },
      body: '{not-json',
    })
    const json = await (await POST(req)).json()
    expect(json.code).toBe('DATOS_INVALIDOS')
    sinIngles(json)
  })

  it('🔴 el 403 del back se reenvía con SU code y SU frase', async () => {
    globalThis.fetch = mockPaymentInfoFetch(
      { statusCode: 403, code: 'SIN_ACCESO_AL_ARRIENDO', message: 'No tienes acceso a este arriendo.' },
      { ok: false, status: 403 },
    )
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json).toEqual({ statusCode: 403, code: 'SIN_ACCESO_AL_ARRIENDO', message: 'No tienes acceso a este arriendo.' })
  })

  it('un 404 de un back sin sobre: la frase nuestra, nunca «payment_info_failed»', async () => {
    globalThis.fetch = mockPaymentInfoFetch({ error: 'Not Found' }, { ok: false, status: 404 })
    const json = await (await POST(makeReq({ leaseId: 'lease-1' }))).json()
    expect(Object.keys(json)).toEqual(CLAVES_DEL_SOBRE)
    expect(json.code).toBe('NO_ENCONTRADO')
    expect(json.message).toBe('No encontramos este arriendo a tu nombre. Recarga la página e intenta de nuevo.')
  })

  it('el 400 en inglés de `ParseUUIDPipe` no se reenvía', async () => {
    globalThis.fetch = mockPaymentInfoFetch(
      { statusCode: 400, message: 'Validation failed (uuid is expected)' },
      { ok: false, status: 400 },
    )
    const json = await (await POST(makeReq({ leaseId: 'lease-1' }))).json()
    expect(json.code).toBe('DATOS_INVALIDOS')
    expect(JSON.stringify(json)).not.toContain('uuid is expected')
  })

  it('un 5xx del back conserva la referencia y el servicio', async () => {
    globalThis.fetch = mockPaymentInfoFetch(
      { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' },
      { ok: false, status: 500 },
    )
    const res = await POST(makeReq({ leaseId: 'lease-1' }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json).toMatchObject({ statusCode: 500, code: 'ERROR_INTERNO', referencia: 'ab12cd34' })
  })
})
