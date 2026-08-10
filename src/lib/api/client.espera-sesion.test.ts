/**
 * La carrera del token: una pantalla que pide datos apenas monta salía SIN
 * `Authorization`, el backend devolvía 401 y la pantalla afirmaba que la sesión
 * se había vencido — con el panel entero renderizado alrededor.
 *
 * Se ve en una sola carga de /postulaciones: `/users/me` → 200 y
 * `/landlord/candidates` → 401. La sesión estaba perfecta.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('el cliente espera a que el AuthProvider conteste', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no sale sin Authorization mientras la sesión se está resolviendo', async () => {
    const { apiClient, setAccessToken } = await import('./client')

    // La pantalla pide datos ANTES de que el provider conteste.
    const pedido = apiClient.get('/landlord/candidates')

    // Nada salió todavía: si saliera acá, saldría sin token.
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()

    setAccessToken('token-que-llegó-tarde')
    await pedido

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-que-llegó-tarde')
  })

  it('cuando el provider ya dijo que NO hay sesión, no espera', async () => {
    const { apiClient, setAccessToken, hayRespuestaDeSesion } = await import('./client')

    setAccessToken(null) // el provider confirmó: no hay sesión
    expect(hayRespuestaDeSesion()).toBe(true)

    await apiClient.get('/algo')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('un token explícito no espera a nadie', async () => {
    // Lo usa el arranque de sesión, cuando todavía no hay nada en el store.
    const { apiClient } = await import('./client')

    await apiClient.get('/users/me', 'token-propio')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-propio')
  })
})
