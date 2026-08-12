import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  apiClient,
  ApiError,
  setAccessToken,
  setUnauthorizedHandler,
} from './client'

// ---------------------------------------------------------------------------
// Este archivo llegó a `develop` en 13b40359 CON los marcadores de conflicto
// adentro, así que no parseaba y la suite entera del archivo no corría. Eran
// dos suites independientes —el 401 `SESSION_SUPERSEDED` y el respaldo del
// 402— que se pisaron al fusionar. Acá conviven: se unieron los helpers y los
// hooks, sin quitarle un test a ninguna.
// ---------------------------------------------------------------------------

const realLocation = window.location

function setLocation(pathname: string) {
  Object.defineProperty(window, 'location', {
    value: { href: '', pathname },
    writable: true,
    configurable: true,
  })
}

/** Stub de `fetch` vía `vi.stubGlobal` — usado por la suite del 401. */
function stubFetch(status: number, body: unknown) {
  const res = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => (body == null ? '' : JSON.stringify(body)),
    blob: async () => new Blob(),
  }
  return vi.fn().mockResolvedValue(res as unknown as Response)
}

beforeEach(() => {
  setAccessToken('token-abc')
  setUnauthorizedHandler(null)
})

afterEach(() => {
  vi.restoreAllMocks()
  setUnauthorizedHandler(null)
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
})

describe('apiClient 401 handling', () => {
  it('invokes the unauthorized handler when a 401 carries code SESSION_SUPERSEDED', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'sesión cerrada', code: 'SESSION_SUPERSEDED' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(apiClient.get('/x')).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_SUPERSEDED',
    })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledWith('SESSION_SUPERSEDED')
  })

  it('does NOT invoke the handler on an ordinary 401 (e.g. onboarding "User not found")', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'User not found' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    const err = (await apiClient.get('/users/me').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.code).toBeUndefined()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('preserves the backend message on a 401', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'User not found' }))
    const err = (await apiClient.get('/users/me').catch((e) => e)) as ApiError
    expect(err.message).toBe('User not found')
  })
})

describe('401 durante la renovación del token', () => {
  /**
   * El access token de Supabase dura una hora y se renueva solo. Lo que salió
   * con el token viejo vuelve 401 con la sesión viva — medido en el panel:
   * `arco/requests` 401 → `grant_type=refresh_token` 200 → `arco/requests` 200.
   *
   * La pantalla se quedaba con ese 401 para siempre, y «Intentar de nuevo»
   * disparaba otra petición dentro de la misma ventana: parecía un botón muerto.
   */
  it('repite UNA vez con el token nuevo y devuelve los datos', async () => {
    setAccessToken('token-viejo')

    const llamadas: string[] = []
    const fetchFalso = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>)?.['Authorization'] ?? ''
      llamadas.push(auth)
      if (auth === 'Bearer token-viejo') {
        // Mientras esta petición viajaba, el provider ya renovó.
        setAccessToken('token-nuevo')
        return {
          status: 401,
          ok: false,
          json: async () => ({ message: 'Unauthorized' }),
          text: async () => JSON.stringify({ message: 'Unauthorized' }),
          blob: async () => new Blob(),
        } as unknown as Response
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ ok: true }),
        text: async () => JSON.stringify({ ok: true }),
        blob: async () => new Blob(),
      } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchFalso)

    await expect(apiClient.get('/inmobiliaria/avaluos')).resolves.toEqual({ ok: true })
    expect(llamadas).toEqual(['Bearer token-viejo', 'Bearer token-nuevo'])
  })

  it('un 401 de permisos NO se reintenta: el token sigue siendo el mismo', async () => {
    // Sin token nuevo no hay carrera que justificar. Reintentar a ciegas
    // escondería un «no tenés acceso» detrás de dos peticiones iguales.
    setAccessToken('token-abc')
    const fetchFalso = stubFetch(401, { message: 'Forbidden for this role' })
    vi.stubGlobal('fetch', fetchFalso)

    await expect(apiClient.get('/inmobiliaria/avaluos')).rejects.toBeInstanceOf(ApiError)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })

  it('SESSION_SUPERSEDED no se reintenta nunca: la sesión fue revocada', async () => {
    setAccessToken('token-abc')
    const fetchFalso = stubFetch(401, { message: 'sesión cerrada', code: 'SESSION_SUPERSEDED' })
    vi.stubGlobal('fetch', fetchFalso)

    await expect(apiClient.get('/users/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })
})
