/**
 * `revocarSesion` cierra en el back Y en Supabase (el refresh token), y nunca
 * tira: ni un back caído ni un Supabase caído pueden dejar a nadie adentro.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revokeSession, adminSignOut } = vi.hoisted(() => ({
  revokeSession: vi.fn(),
  adminSignOut: vi.fn(),
}))
vi.mock('@/lib/api/session.service', () => ({ revokeSession }))
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { admin: { signOut: adminSignOut } } }),
}))

import { revocarSesion } from './revocar-sesion'

beforeEach(() => {
  revokeSession.mockReset().mockResolvedValue({ revoked: true })
  adminSignOut.mockReset().mockResolvedValue({ data: null, error: null })
})

describe('revocarSesion', () => {
  it('revoca en el back y en Supabase (sólo ESTA sesión) con el token que se le pasa', async () => {
    await revocarSesion('token-vivo')
    expect(revokeSession).toHaveBeenCalledWith('token-vivo')
    expect(adminSignOut).toHaveBeenCalledWith('token-vivo', 'local')
  })

  it('un back caído no impide revocar en Supabase, y nada tira', async () => {
    revokeSession.mockRejectedValue(new Error('caído'))
    await expect(revocarSesion('t')).resolves.toBeUndefined()
    expect(adminSignOut).toHaveBeenCalled()
  })

  it('un Supabase caído tampoco tira', async () => {
    adminSignOut.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(revocarSesion('t')).resolves.toBeUndefined()
    expect(revokeSession).toHaveBeenCalled()
  })
})
