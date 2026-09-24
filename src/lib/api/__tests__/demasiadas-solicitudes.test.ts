import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { apiClient, ApiError, setAccessToken } from '../client'
import { applicationsApi } from '../applications.service'
import { resetSessionTerminal } from '@/lib/auth/session-terminal'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { cuantoEsperar, segundosDeEspera } from '../demasiadas-solicitudes'

/**
 * 🔴 Auditoría de seguridad (23-09-2026): el back empezó a responder 429 con
 * `Retry-After` y `{ code: 'DEMASIADAS_SOLICITUDES', reintentarEnSegundos }`.
 * Antes de esto el front mostraba «Error 429» (o el `message` crudo, si lo
 * había): lo que la persona necesita leer es CUÁNTO esperar.
 */

function respuesta429(cuerpo: unknown, cabeceras: Record<string, string> = {}) {
  return {
    status: 429,
    ok: false,
    headers: new Headers(cabeceras),
    json: async () => {
      if (cuerpo === undefined) throw new SyntaxError('Unexpected token <')
      return cuerpo
    },
    text: async () => (cuerpo === undefined ? '<html>429</html>' : JSON.stringify(cuerpo)),
    blob: async () => new Blob(),
  } as unknown as Response
}

beforeEach(() => {
  resetSessionTerminal()
  setAccessToken('token-abc')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('apiClient ante un 429 del limitador', () => {
  it('dice cuánto esperar, con el código que el back manda', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta429(
          {
            statusCode: 429,
            code: 'DEMASIADAS_SOLICITUDES',
            reintentarEnSegundos: 900,
            message: 'Hiciste demasiadas solicitudes seguidas. Espera 15 minutos y vuelve a intentar.',
          },
          { 'Retry-After': '900' },
        ),
      ),
    )

    const error = (await apiClient
      .post('/contracts/x/otp/verify', { code: '123456' })
      .catch((e: unknown) => e)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      code: 'DEMASIADAS_SOLICITUDES',
      message: 'Hiciste demasiadas solicitudes seguidas. Espera 15 minutos y vuelve a intentar.',
    })
    expect(error.detalle?.reintentarEnSegundos).toBe(900)
  })

  it('un 429 del proxy SIN cuerpo JSON igual dice cuánto esperar, leyendo Retry-After', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta429(undefined, { 'Retry-After': '45' })))

    await expect(apiClient.get('/inmobiliaria/x')).rejects.toMatchObject({
      status: 429,
      code: 'DEMASIADAS_SOLICITUDES',
      message: 'Hiciste demasiadas solicitudes seguidas. Espera 45 segundos y vuelve a intentar.',
    })
  })

  it('las descargas (getBlob) también', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta429({ reintentarEnSegundos: 30 })),
    )

    await expect(apiClient.getBlob('/inmobiliaria/facturacion/documentos.zip')).rejects.toMatchObject({
      status: 429,
      message: 'Hiciste demasiadas solicitudes seguidas. Espera 30 segundos y vuelve a intentar.',
    })
  })

  it('la postulación sin cuenta (fetch a mano) también', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta429({ reintentarEnSegundos: 3600 }, { 'Retry-After': '3600' })),
    )

    await expect(
      applicationsApi.createGuest({ propertyId: 'p1' } as Parameters<typeof applicationsApi.createGuest>[0]),
    ).rejects.toMatchObject({
      status: 429,
      code: 'DEMASIADAS_SOLICITUDES',
      message: 'Hiciste demasiadas solicitudes seguidas. Espera 1 hora y vuelve a intentar.',
    })
  })

  it('el cartel de carga lo dice con la espera', () => {
    const fallo = clasificarFallo(
      new ApiError(429, 'x', 'DEMASIADAS_SOLICITUDES', { reintentarEnSegundos: 120 }),
    )
    expect(fallo.tipo).toBe('limitado')
    expect(fallo.descripcion).toContain('Espera 2 minutos')
  })
})

describe('segundosDeEspera', () => {
  it('prefiere el cuerpo, después el encabezado, y si no hay nada devuelve null', () => {
    expect(segundosDeEspera(new Headers({ 'Retry-After': '10' }), { reintentarEnSegundos: 20 })).toBe(20)
    expect(segundosDeEspera(new Headers({ 'Retry-After': '10' }), {})).toBe(10)
    expect(segundosDeEspera(new Headers(), {})).toBeNull()
    expect(segundosDeEspera(null, null)).toBeNull()
  })

  it('entiende Retry-After como fecha HTTP', () => {
    const en90 = new Date(Date.now() + 90_000).toUTCString()
    const s = segundosDeEspera(new Headers({ 'Retry-After': en90 }), undefined)
    expect(s).toBeGreaterThanOrEqual(88)
    expect(s).toBeLessThanOrEqual(90)
  })

  it('cuantoEsperar habla en la unidad que se lee', () => {
    expect(cuantoEsperar(1)).toBe('1 segundo')
    expect(cuantoEsperar(59)).toBe('59 segundos')
    expect(cuantoEsperar(60)).toBe('1 minuto')
    expect(cuantoEsperar(3600)).toBe('1 hora')
  })
})
