/**
 * 🔴 Auditoría de seguridad (23-09): el panel de administración exige segundo
 * factor. El back responde 403 `SEGUNDO_FACTOR_REQUERIDO` a un correo de la
 * lista con sesión de sólo-enlace. Ese 403 no es «no estás en la lista»: el
 * cliente lo manda a inscribir/escribir el código, nunca a `/admin/forbidden`
 * (que le diría a un admin de verdad que pida que lo agreguen).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))

let api: typeof import('../api')
const fetchFalso = vi.fn()
let destino = ''

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_ADMIN_API_URL', 'https://api.leasefy.test')
  vi.stubGlobal('fetch', fetchFalso)
  destino = ''
  vi.stubGlobal('window', {
    location: {
      pathname: '/admin/cartera',
      search: '?etapa=mora',
      set href(v: string) {
        destino = v
      },
      get href() {
        return destino
      },
    },
  })
  api = await import('../api')
  api.setAdminToken('token-aal1')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  fetchFalso.mockReset()
})

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })

describe('el 403 del segundo factor en el panel de administración', () => {
  it('🔴 lleva a /admin/segundo-factor con el destino, no a /admin/forbidden', async () => {
    fetchFalso.mockResolvedValue(
      respuesta(403, { statusCode: 403, code: 'SEGUNDO_FACTOR_REQUERIDO', message: 'x' }),
    )
    const error = await api.adminApi('/me').catch((e: unknown) => e)
    expect(destino).toBe(`/admin/segundo-factor?next=${encodeURIComponent('/admin/cartera?etapa=mora')}`)
    expect(api.esFaltaDeSegundoFactor(error)).toBe(true)
  })

  it('también en una llamada proxy con `noForbiddenRedirect`: sin segundo factor no pasa nada', async () => {
    fetchFalso.mockResolvedValue(respuesta(403, { code: 'SEGUNDO_FACTOR_REQUERIDO' }))
    await api.adminApi('/cotizador/x', { noForbiddenRedirect: true }).catch(() => undefined)
    expect(destino).toContain('/admin/segundo-factor')
  })

  it('un 403 sin ese código sigue siendo «no estás en la lista»', async () => {
    fetchFalso.mockResolvedValue(respuesta(403, { statusCode: 403, message: 'Not an authorized admin' }))
    const error = await api.adminApi('/me').catch((e: unknown) => e)
    expect(destino).toBe('/admin/forbidden')
    expect(api.esFaltaDeSegundoFactor(error)).toBe(false)
  })
})
