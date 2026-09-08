/**
 * Un 401 `SESSION_SUPERSEDED` que responde a un token que YA no es el de esta
 * pestaña no puede cerrar la sesión nueva: fue ella la que desplazó a la vieja.
 *
 * Visto el 2026-09-07 con un enlace mágico abierto con sesión previa: la sonda
 * de membresía salió con el token viejo, llegó al back después del claim del
 * nuevo, volvió SUPERSEDED y el backstop cerró la sesión recién abierta.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  apiClient,
  ApiError,
  esRespuestaDeUnTokenViejo,
  setAccessToken,
  setUnauthorizedHandler,
} from './client'

const respuesta401Superseded = () =>
  new Response(
    JSON.stringify({ code: 'SESSION_SUPERSEDED', message: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )

describe('401 SUPERSEDED con un token que ya no es el vigente', () => {
  const onUnauthorized = vi.fn()

  beforeEach(() => {
    onUnauthorized.mockClear()
    setUnauthorizedHandler(onUnauthorized)
    setAccessToken('token-nuevo')
    vi.stubGlobal('fetch', vi.fn(async () => respuesta401Superseded()))
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    setAccessToken(null)
    vi.unstubAllGlobals()
  })

  it('el predicado: sólo SUPERSEDED, sólo con token, y sólo si hay uno vigente distinto', () => {
    expect(esRespuestaDeUnTokenViejo('SESSION_SUPERSEDED', 'token-viejo')).toBe(true)
    expect(esRespuestaDeUnTokenViejo('SESSION_SUPERSEDED', 'token-nuevo')).toBe(false)
    expect(esRespuestaDeUnTokenViejo('AUTH_TOKEN_INVALID', 'token-viejo')).toBe(false)
    expect(esRespuestaDeUnTokenViejo('SESSION_SUPERSEDED', undefined)).toBe(false)
    setAccessToken(null)
    expect(esRespuestaDeUnTokenViejo('SESSION_SUPERSEDED', 'token-viejo')).toBe(false)
  })

  it('una respuesta vieja se rechaza al que la pidió pero NO dispara el cierre de sesión', async () => {
    await expect(apiClient.get('/inmobiliaria/agency', 'token-viejo')).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_SUPERSEDED',
    })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('con el token vigente el SUPERSEDED sí es de esta sesión: se cierra', async () => {
    await expect(apiClient.get('/inmobiliaria/agency', 'token-nuevo')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledWith('SESSION_SUPERSEDED')
  })
})
