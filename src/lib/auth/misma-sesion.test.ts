import { describe, it, expect } from 'vitest'
import { huellaDe, esLaMismaSesion } from './misma-sesion'

const s = (token: string, id?: string, exp?: number) => ({ access_token: token, expires_at: exp, user: id ? { id } : null })

describe('esLaMismaSesion (LOGIN-BUCLE r2)', () => {
  it('el mismo access token', () => {
    expect(esLaMismaSesion(huellaDe(s('a', 'u1', 1)), huellaDe(s('a', 'u2', 2)))).toBe(true)
  })

  it('el mismo usuario con la misma expiración', () => {
    expect(esLaMismaSesion(huellaDe(s('a', 'u1', 100)), huellaDe(s('b', 'u1', 100)))).toBe(true)
  })

  it('el mismo usuario con OTRA expiración (se renovó o es otra sesión) no', () => {
    expect(esLaMismaSesion(huellaDe(s('a', 'u1', 100)), huellaDe(s('b', 'u1', 200)))).toBe(false)
  })

  it('otro usuario no', () => {
    expect(esLaMismaSesion(huellaDe(s('a', 'u1', 100)), huellaDe(s('b', 'u2', 100)))).toBe(false)
  })

  it('sin usuario ni expiración, sólo el token decide', () => {
    expect(esLaMismaSesion(huellaDe(s('a')), huellaDe(s('b')))).toBe(false)
    expect(esLaMismaSesion(huellaDe(s('a')), huellaDe(s('a')))).toBe(true)
  })
})
