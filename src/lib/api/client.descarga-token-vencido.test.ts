/**
 * Las descargas también renuevan el token.
 *
 * `apiClient.getBlob` —el que baja TODOS los CSV de Reportes— no lo hacía: era
 * un `fetch` pelado. Con el token recién vencido moría en un 401 y la pantalla,
 * que no distingue, culpaba al reporte («Probá de nuevo en un momento») cuando
 * el problema era la sesión. Un GET normal disparado en el mismo instante se
 * recuperaba solo; la descarga, no.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const VENCIDO = { message: 'jwt expired', code: 'AUTH_TOKEN_EXPIRED' }

function respuesta401() {
  return new Response(JSON.stringify(VENCIDO), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

function respuestaCsv() {
  return new Response('a,b\n1,2\n', {
    status: 200,
    headers: { 'Content-Type': 'text/csv' },
  })
}

describe('apiClient.getBlob con el token vencido', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('🔴 renueva y repite UNA vez, y el archivo llega', async () => {
    fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuesta401())
      .mockResolvedValueOnce(respuestaCsv())
    vi.stubGlobal('fetch', fetchMock)

    const { apiClient, setAccessToken, setTokenRefresher } = await import('./client')
    setAccessToken('token-vencido')
    setTokenRefresher(async () => 'token-nuevo')

    const blob = await apiClient.getBlob('/inmobiliaria/reports/export?type=cartera-edades')

    expect(blob).toBeInstanceOf(Blob)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const segundos = fetchMock.mock.calls[1][1].headers as Record<string, string>
    expect(segundos.Authorization).toBe('Bearer token-nuevo')
  })

  it('si no hay token nuevo, avisa que la sesión murió en vez de culpar al reporte', async () => {
    fetchMock = vi.fn().mockResolvedValue(respuesta401())
    vi.stubGlobal('fetch', fetchMock)

    const { apiClient, setAccessToken, setTokenRefresher, setUnauthorizedHandler } =
      await import('./client')
    setAccessToken('token-vencido')
    setTokenRefresher(async () => null)

    const avisado: string[] = []
    setUnauthorizedHandler((code) => avisado.push(String(code)))

    await expect(
      apiClient.getBlob('/inmobiliaria/reports/export?type=cartera-edades'),
    ).rejects.toMatchObject({ status: 401 })
    expect(avisado).toContain('AUTH_TOKEN_EXPIRED')

    setUnauthorizedHandler(null)
  })

  it('no se encadena: reintenta como máximo una vez', async () => {
    fetchMock = vi.fn().mockResolvedValue(respuesta401())
    vi.stubGlobal('fetch', fetchMock)

    const { apiClient, setAccessToken, setTokenRefresher } = await import('./client')
    setAccessToken('token-vencido')
    let n = 0
    setTokenRefresher(async () => `token-${++n}`)

    await expect(apiClient.getBlob('/x')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
