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

/**
 * T-0109 contract.md §3.3 — `CODIGO_EN_ESPERA` es un 429 DISTINTO del
 * limitador genérico (`DEMASIADAS_SOLICITUDES`): el back lo manda cuando se
 * reintenta un `/otp/send` dentro del cooldown de 60s, con su propio
 * `message` autosuficiente y `{ segundos }` (no `reintentarEnSegundos`).
 * Antes de esto `errorDeDemasiadasSolicitudes` pisaba CUALQUIER 429 con
 * `code: 'DEMASIADAS_SOLICITUDES'` y el mensaje genérico, así que el código
 * específico y el mensaje del back (útil para OTPVerification) se perdían.
 */
describe('apiClient ante un 429 con code propio (T-0109 CODIGO_EN_ESPERA)', () => {
  it('conserva el code y el message del back en vez de pisarlos con el genérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta429({
          statusCode: 429,
          code: 'CODIGO_EN_ESPERA',
          segundos: 42,
          message: 'Espera antes de pedir un código nuevo.',
        }),
      ),
    )

    const error = (await apiClient
      .post('/contracts/x/otp/send', { role: 'landlord' })
      .catch((e: unknown) => e)) as ApiError

    expect(error).toMatchObject({
      status: 429,
      code: 'CODIGO_EN_ESPERA',
      message: 'Espera antes de pedir un código nuevo.',
    })
    expect(error.detalle?.segundos).toBe(42)
    expect(error.detalle?.reintentarEnSegundos).toBe(42)
  })

  it('sin code propio en el cuerpo, sigue cayendo al genérico DEMASIADAS_SOLICITUDES', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta429({ reintentarEnSegundos: 15 })))

    await expect(apiClient.get('/inmobiliaria/x')).rejects.toMatchObject({
      status: 429,
      code: 'DEMASIADAS_SOLICITUDES',
      message: 'Hiciste demasiadas solicitudes seguidas. Espera 15 segundos y vuelve a intentar.',
    })
  })
})

describe('segundosDeEspera', () => {
  it('prefiere el cuerpo, después el encabezado, y si no hay nada devuelve null', () => {
    expect(segundosDeEspera(new Headers({ 'Retry-After': '10' }), { reintentarEnSegundos: 20 })).toBe(20)
    expect(segundosDeEspera(new Headers({ 'Retry-After': '10' }), {})).toBe(10)
    expect(segundosDeEspera(new Headers(), {})).toBeNull()
    expect(segundosDeEspera(null, null)).toBeNull()
  })

  it('T-0109: también lee `segundos` (CODIGO_EN_ESPERA no usa `reintentarEnSegundos`)', () => {
    expect(segundosDeEspera(new Headers(), { segundos: 42 })).toBe(42)
    expect(segundosDeEspera(new Headers({ 'Retry-After': '10' }), { segundos: 42 })).toBe(42)
    // `reintentarEnSegundos` sigue ganando cuando ambos vienen.
    expect(segundosDeEspera(new Headers(), { reintentarEnSegundos: 5, segundos: 42 })).toBe(5)
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
