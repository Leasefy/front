/**
 * `fetchConSesion` — las rutas propias que bajan URLs de afuera exigen sesión
 * desde la auditoría de seguridad del 23-09. El importador tiene que mandarla,
 * y un import largo (cruza la renovación del token, que dura una hora) no
 * puede perder fotos por un 401 con el token que acaba de vencer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const autorizacion = (init: RequestInit | undefined) => new Headers(init?.headers).get('Authorization')

describe('fetchConSesion', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda el token de la sesión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchConSesion, setAccessToken } = await import('./client')
    setAccessToken('token-vigente')

    await fetchConSesion('/api/inmuebles/imagen-remota?url=x')

    expect(autorizacion(fetchMock.mock.calls[0][1])).toBe('Bearer token-vigente')
  })

  it('con el token recién vencido, renueva y repite UNA vez', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchConSesion, setAccessToken, setTokenRefresher } = await import('./client')
    setAccessToken('token-vencido')
    setTokenRefresher(async () => 'token-nuevo')

    const res = await fetchConSesion('/api/inmuebles/desde-enlace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(autorizacion(fetchMock.mock.calls[1][1])).toBe('Bearer token-nuevo')
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('Content-Type')).toBe('application/json')
  })
})
