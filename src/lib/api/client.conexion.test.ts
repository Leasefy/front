/**
 * @vitest-environment happy-dom
 *
 * `apiClient` es quien le cuenta a la franja global si Leasefy responde
 * (01-10-2026). Se fija el contrato con el back de las caídas: qué respuesta
 * la prende, cuál NO, y qué `ApiError` sale en cada caso.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError, setAccessToken } from './client'
import { resetSessionTerminal } from '@/lib/auth/session-terminal'
import {
  CODIGO_LEASEFY_NO_RESPONDE,
  estadoDeConexion,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'
import { textoParaUnAviso } from '@/lib/conexion/servicio-no-disponible'

function respuesta(status: number, body: unknown, { json = true } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (!json) throw new SyntaxError('Unexpected token <')
      return body
    },
    text: async () => (body == null ? '' : JSON.stringify(body)),
    blob: async () => new Blob(),
  } as unknown as Response
}

function ponerEnLinea(enLinea: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value: enLinea, configurable: true })
}

async function fallo(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p
  } catch (e) {
    return e as ApiError
  }
  throw new Error('se esperaba un error')
}

beforeEach(() => {
  resetSessionTerminal()
  setAccessToken('token-abc')
  ponerEnLinea(true)
  reiniciarEstadoDeConexion()
})

afterEach(() => {
  vi.unstubAllGlobals()
  ponerEnLinea(true)
  reiniciarEstadoDeConexion()
})

describe('apiClient le cuenta a la franja si Leasefy responde', () => {
  it('fetch que no sale, con red: «Leasefy no responde» y el ApiError(0) de siempre', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const e = await fallo(apiClient.get('/inmobiliaria/propietarios'))
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(0)
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })

  it('fetch que no sale, sin red: «sin internet»', async () => {
    ponerEnLinea(false)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await fallo(apiClient.post('/inmobiliaria/contratos', {}))
    expect(estadoDeConexion()).toBe('sin-internet')
  })

  it('el 502 del balanceador (HTML, sin statusCode): «Leasefy no responde», sin «Error 502»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(502, null, { json: false })))
    const e = await fallo(apiClient.get('/inmobiliaria/agenda'))
    expect(e.status).toBe(502)
    expect(e.code).toBe(CODIGO_LEASEFY_NO_RESPONDE)
    expect(e.message).not.toMatch(/502|Error/)
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })

  it('un 503 SIN statusCode también es el balanceador', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(503, { message: 'Service Unavailable' })))
    const e = await fallo(apiClient.get('/inmobiliaria/agenda'))
    expect(e.code).toBe(CODIGO_LEASEFY_NO_RESPONDE)
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })

  it('503 SERVICIO_NO_DISPONIBLE: el back contestó, la franja NO se prende y el mensaje nombra lo caído', async () => {
    const cuerpo = {
      statusCode: 503,
      code: 'SERVICIO_NO_DISPONIBLE',
      servicio: 'asistente',
      message: 'No se pudo completar el aprovisionamiento de la inmobiliaria.',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(503, cuerpo)))
    const e = await fallo(apiClient.post('/users/me/onboarding', {}))
    expect(e.status).toBe(503)
    expect(e.code).toBe('SERVICIO_NO_DISPONIBLE')
    expect(e.message).toBe(textoParaUnAviso('asistente'))
    // Lo que mandó el back no se pierde.
    expect(e.detalle).toEqual(cuerpo)
    expect(estadoDeConexion()).toBe('bien')
  })

  it('503 con otro code de nuestro filtro (centro de procesos sin migración): no es caída', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(503, { statusCode: 503, code: 'CENTRO_DE_PROCESOS_SIN_MIGRACION', message: 'falta' }),
      ),
    )
    const e = await fallo(apiClient.post('/inmobiliaria/procesos', {}))
    expect(e.code).toBe('CENTRO_DE_PROCESOS_SIN_MIGRACION')
    expect(e.message).toBe('falta')
    expect(estadoDeConexion()).toBe('bien')
  })

  it('502 SERVICIO_NO_DISPONIBLE de los avalúos: nombra lo caído y la franja NO se prende', async () => {
    const cuerpo = {
      statusCode: 502,
      code: 'SERVICIO_NO_DISPONIBLE',
      servicio: 'avaluos',
      message: 'Los avalúos no están respondiendo.',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(502, cuerpo)))
    const e = await fallo(apiClient.get('/inmobiliaria/avaluos'))
    expect(e.status).toBe(502)
    expect(e.code).toBe('SERVICIO_NO_DISPONIBLE')
    expect(e.message).toBe(textoParaUnAviso('avaluos'))
    expect(estadoDeConexion()).toBe('bien')
  })

  it('la base caída es Leasefy entero sin responder: se prende la franja', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(503, { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio: 'base', message: 'x' }),
      ),
    )
    const e = await fallo(apiClient.get('/inmobiliaria/agenda'))
    expect(e.code).toBe(CODIGO_LEASEFY_NO_RESPONDE)
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })

  it('502 WOMPI_NO_RESPONDIO con servicio: capa 2, el code de dispersiones intacto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(502, { statusCode: 502, code: 'WOMPI_NO_RESPONDIO', servicio: 'pagos', message: 'fetch failed' }),
      ),
    )
    const e = await fallo(apiClient.post('/inmobiliaria/dispersiones/lotes/x/girar', {}))
    expect(e.status).toBe(502)
    expect(e.code).toBe('WOMPI_NO_RESPONDIO')
    expect(e.message).toBe(textoParaUnAviso('pagos'))
    expect(estadoDeConexion()).toBe('bien')
  })

  it('502 de nuestro back (Wompi falló, BadGatewayException): no es caída general', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(502, { statusCode: 502, code: 'INVITACION_FALLIDA', message: 'No pudimos enviar la invitación.' }),
      ),
    )
    const e = await fallo(apiClient.post('/inmobiliaria/contratos/x/invitar', {}))
    expect(e.code).toBe('INVITACION_FALLIDA')
    expect(estadoDeConexion()).toBe('bien')
  })

  it('la primera respuesta del back después de una caída la devuelve a bien', async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(respuesta(200, { ok: true }))
    vi.stubGlobal('fetch', f)
    await fallo(apiClient.get('/inmobiliaria/agenda'))
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
    await apiClient.get('/inmobiliaria/agenda?otra=1')
    expect(estadoDeConexion()).toBe('bien')
  })

  it('un 404 también es el back contestando', async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(respuesta(404, { statusCode: 404, message: 'Not Found' }))
    vi.stubGlobal('fetch', f)
    await fallo(apiClient.get('/a'))
    await fallo(apiClient.get('/b'))
    expect(estadoDeConexion()).toBe('bien')
  })

  it('la descarga de un archivo sigue la misma regla y ya no tira el code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(503, { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio: 'archivos' }),
      ),
    )
    const e = await fallo(apiClient.getBlob('/inmobiliaria/reportes/x.csv'))
    expect(e.code).toBe('SERVICIO_NO_DISPONIBLE')
    expect(e.message).toBe(textoParaUnAviso('archivos'))
    expect(estadoDeConexion()).toBe('bien')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await fallo(apiClient.getBlob('/inmobiliaria/reportes/x.csv'))
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })
})
