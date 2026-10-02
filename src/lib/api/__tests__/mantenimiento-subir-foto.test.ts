/**
 * `mantenimientoApi.subirFoto` (02-10-2026): una foto de la solicitud, como
 * archivo, a `POST /inmobiliaria/mantenimiento/:id/fotos`. El rechazo trae el
 * sobre de error entero (`code`, `campos`) para que el traductor diga qué pasó.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mantenimientoApi } from '../inmobiliaria.service'
import { ApiError, setAccessToken } from '../client'

function respuesta(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init
  const fn = vi.fn().mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  } as unknown as Response)
  globalThis.fetch = fn as typeof globalThis.fetch
  return fn
}

const foto = () => new File([new Uint8Array(16)], 'gotera.jpg', { type: 'image/jpeg' })

beforeEach(() => setAccessToken('token-de-prueba'))
afterEach(() => {
  setAccessToken(null)
  vi.restoreAllMocks()
})

describe('mantenimientoApi.subirFoto', () => {
  it('manda el ARCHIVO en `file`, a la ruta de la solicitud, con la sesión', async () => {
    const fetchMock = respuesta({ ruta: 'mantenimiento/a/s/x.jpg', photoUrls: ['https://firmada'] }, { status: 201 })
    const f = foto()
    const r = await mantenimientoApi.subirFoto('sol-1', f)

    const [url, opciones] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url.endsWith('/inmobiliaria/mantenimiento/sol-1/fotos')).toBe(true)
    expect(opciones.method).toBe('POST')
    expect((opciones.headers as Record<string, string>).Authorization).toBe('Bearer token-de-prueba')
    const cuerpo = opciones.body as FormData
    expect(cuerpo.get('file')).toBeInstanceOf(File)
    expect((cuerpo.get('file') as File).name).toBe('gotera.jpg')
    expect(r.photoUrls).toEqual(['https://firmada'])
  })

  it('🔴 el rechazo conserva `code` y el sobre (para el traductor y los campos)', async () => {
    const sobre = {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: ['Puedes adjuntar hasta 30 fotos.'],
      campos: [{ campo: 'photoUrls', regla: 'lista_maxima', mensaje: 'Puedes adjuntar hasta 30 fotos.' }],
    }
    respuesta(sobre, { ok: false, status: 400 })
    const e = (await mantenimientoApi.subirFoto('sol-1', foto()).catch((x) => x)) as ApiError
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(400)
    expect(e.code).toBe('DATOS_INVALIDOS')
    expect(e.messages).toEqual(['Puedes adjuntar hasta 30 fotos.'])
    expect(e.detalle).toEqual(sobre)
  })

  it('sin respuesta es un ApiError con status 0 (la conexión)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')) as typeof globalThis.fetch
    const e = (await mantenimientoApi.subirFoto('sol-1', foto()).catch((x) => x)) as ApiError
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(0)
  })
})
