import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()
const fetchConSesion = vi.fn()

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...real,
    apiClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
    fetchConSesion: (...a: unknown[]) => fetchConSesion(...a),
  }
})

import { ApiError } from '@/lib/api/client'
import { EstudioDeCanonError, estudioDeCanonApi } from './estudio-de-canon.service'

const ESTUDIO = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'DRAFT',
  creadoEl: '2026-10-28T10:00:00.000Z',
  terminadoEl: null,
  venceEl: null,
  documentos: [],
  faltan: ['cedula', 'extracto_bancario'],
  resultado: null,
  error: null,
}

function respuesta(status: number, cuerpo: unknown): Response {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => cuerpo } as Response
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  fetchConSesion.mockReset()
})

describe('estudioDeCanonApi.actual', () => {
  it('GETs /estudio/actual and parses the wrapped study', async () => {
    get.mockResolvedValue({ estudio: ESTUDIO })
    const e = await estudioDeCanonApi.actual()
    expect(get).toHaveBeenCalledWith('/calificacion-leasefy/estudio/actual')
    expect(e?.id).toBe(ESTUDIO.id)
  })
  it('returns null when there is no study', async () => {
    get.mockResolvedValue({ estudio: null })
    expect(await estudioDeCanonApi.actual()).toBeNull()
  })
  it('turns a 403 into a typed error', async () => {
    get.mockRejectedValue(new ApiError(403, 'Forbidden'))
    await expect(estudioDeCanonApi.actual()).rejects.toBeInstanceOf(EstudioDeCanonError)
  })
})

describe('estudioDeCanonApi.crear', () => {
  it('POSTs { autorizo: true } verbatim', async () => {
    post.mockResolvedValue(ESTUDIO)
    const e = await estudioDeCanonApi.crear()
    expect(post).toHaveBeenCalledWith('/calificacion-leasefy/estudio', { autorizo: true })
    expect(e.status).toBe('DRAFT')
  })
  it('maps AUTORIZACION_REQUERIDA to user copy and keeps the code', async () => {
    post.mockRejectedValue(new ApiError(400, 'x', 'AUTORIZACION_REQUERIDA'))
    const err = await estudioDeCanonApi.crear().catch((e) => e)
    expect(err).toBeInstanceOf(EstudioDeCanonError)
    expect(err.code).toBe('AUTORIZACION_REQUERIDA')
    expect(err.message).toMatch(/autorización/i)
  })
  it('maps the daily limit 429', async () => {
    post.mockRejectedValue(new ApiError(429, 'raw', 'ESTUDIO_LIMITE_DIARIO'))
    const err = await estudioDeCanonApi.crear().catch((e) => e)
    expect(err.code).toBe('ESTUDIO_LIMITE_DIARIO')
    expect(err.message).toMatch(/mañana/i)
  })
  it('maps the 410 PRESCORING_DESACTIVADO', async () => {
    post.mockRejectedValue(new ApiError(410, 'raw', 'PRESCORING_DESACTIVADO'))
    const err = await estudioDeCanonApi.crear().catch((e) => e)
    expect(err.status).toBe(410)
    expect(err.message).toMatch(/Mi calificación/)
  })
  it('fails when the body is not a study', async () => {
    post.mockResolvedValue({ foo: 1 })
    await expect(estudioDeCanonApi.crear()).rejects.toBeInstanceOf(EstudioDeCanonError)
  })
})

describe('estudioDeCanonApi.subirDocumento', () => {
  it('sends multipart file + tipo to the study documents route', async () => {
    fetchConSesion.mockResolvedValue(
      respuesta(201, { ...ESTUDIO, documentos: [{ tipo: 'cedula' }], faltan: ['extracto_bancario'] }),
    )
    const file = new File(['x'], 'cedula.pdf', { type: 'application/pdf' })
    const e = await estudioDeCanonApi.subirDocumento(ESTUDIO.id, 'cedula', file)
    const [url, init] = fetchConSesion.mock.calls[0]
    expect(url).toMatch(new RegExp(`/calificacion-leasefy/estudio/${ESTUDIO.id}/documentos$`))
    expect(init.method).toBe('POST')
    const body = init.body as FormData
    expect(body.get('tipo')).toBe('cedula')
    expect((body.get('file') as File).name).toBe('cedula.pdf')
    expect(init.headers).toBeUndefined()
    expect(e.faltan).toEqual(['extracto_bancario'])
  })
  it('surfaces ARCHIVO_INVALIDO with the back message', async () => {
    fetchConSesion.mockResolvedValue(
      respuesta(400, { statusCode: 400, code: 'ARCHIVO_INVALIDO', message: 'El archivo pesa más de 10 MB.' }),
    )
    const err = await estudioDeCanonApi
      .subirDocumento(ESTUDIO.id, 'cedula', new File(['x'], 'a.pdf'))
      .catch((e) => e)
    expect(err.code).toBe('ARCHIVO_INVALIDO')
    expect(err.message).toBe('El archivo pesa más de 10 MB.')
  })
  it('maps ESTUDIO_YA_INICIADO (409)', async () => {
    fetchConSesion.mockResolvedValue(respuesta(409, { code: 'ESTUDIO_YA_INICIADO', message: 'x' }))
    const err = await estudioDeCanonApi
      .subirDocumento(ESTUDIO.id, 'nomina', new File(['x'], 'a.pdf'))
      .catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.code).toBe('ESTUDIO_YA_INICIADO')
  })
  it('reports a network failure', async () => {
    fetchConSesion.mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await estudioDeCanonApi
      .subirDocumento(ESTUDIO.id, 'nomina', new File(['x'], 'a.pdf'))
      .catch((e) => e)
    expect(err).toBeInstanceOf(EstudioDeCanonError)
    expect(err.status).toBe(0)
  })
})

describe('estudioDeCanonApi.iniciar', () => {
  it('POSTs /iniciar with an empty body and returns PROCESSING', async () => {
    post.mockResolvedValue({ ...ESTUDIO, status: 'PROCESSING' })
    const e = await estudioDeCanonApi.iniciar(ESTUDIO.id)
    expect(post).toHaveBeenCalledWith(`/calificacion-leasefy/estudio/${ESTUDIO.id}/iniciar`)
    expect(e.status).toBe('PROCESSING')
  })
  it('keeps "faltan" from DOCUMENTOS_FALTANTES', async () => {
    post.mockRejectedValue(new ApiError(400, 'x', 'DOCUMENTOS_FALTANTES', { faltan: ['cedula', 'selfie'] }))
    const err = await estudioDeCanonApi.iniciar(ESTUDIO.id).catch((e) => e)
    expect(err.code).toBe('DOCUMENTOS_FALTANTES')
    expect(err.faltan).toEqual(['cedula'])
  })
  it('maps the 503 so the study can be retried', async () => {
    post.mockRejectedValue(new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE'))
    const err = await estudioDeCanonApi.iniciar(ESTUDIO.id).catch((e) => e)
    expect(err.status).toBe(503)
    expect(err.message).toMatch(/reintenta/i)
  })
})
