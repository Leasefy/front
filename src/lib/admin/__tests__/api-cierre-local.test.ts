/**
 * 🔴 Victor, 30-10-2026: entrar de nuevo cerraba la sesión recién abierta un
 * segundo después, con Google y con el enlace de recuperación. Entrar desplaza
 * la sesión anterior; si esa quedó en un `/admin` abierto, su siguiente llamada
 * recibe 401 `SESSION_SUPERSEDED` y `adminApi` hacía `supabase.auth.signOut()`
 * SIN alcance, que en supabase-js es `global`: borra TODAS las sesiones de la
 * cuenta, también la nueva (`POST /logout` 204 y, después, `session_not_found`).
 * Cerrar esta sesión es `{ scope: 'local' }`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const signOut = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ auth: { signOut } }) }))

beforeEach(() => {
  signOut.mockClear()
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_ADMIN_API_URL', 'https://admin.test')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
  Object.defineProperty(window, 'location', {
    value: { ...window.location, href: 'http://localhost/admin', assign: vi.fn(), replace: vi.fn() },
    writable: true,
  })
})

describe('adminApi: un 401 cierra sólo esta sesión', () => {
  it('adminApi', async () => {
    const { adminApi, setAdminToken } = await import('../api')
    setAdminToken('tok')
    await expect(adminApi('/x')).rejects.toThrow()
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('adminApiBlob', async () => {
    const { adminApiBlob, setAdminToken } = await import('../api')
    setAdminToken('tok')
    await expect(adminApiBlob('/x')).rejects.toThrow()
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
