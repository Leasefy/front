/**
 * 🔴 LOGIN-BUCLE (06-10-2026): desde que «hay una sesión guardada» decide si se
 * espera o se manda al login, sólo cuenta la de ESTE proyecto de Supabase. En
 * localhost las cookies no distinguen puertos: la de otro proyecto (el lab, otra
 * app) no puede hacer esperar a un visitante que acá no tiene sesión.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { haySesionGuardada } from './session-terminal'

const urlAntes = process.env.NEXT_PUBLIC_SUPABASE_URL

beforeEach(() => {
  localStorage.clear()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jraqurdcjwnifzpdqtnm.supabase.co'
})

afterEach(() => {
  localStorage.clear()
  if (urlAntes === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = urlAntes
})

describe('haySesionGuardada — la clave de este proyecto', () => {
  it('cuenta la sesión de este proyecto', () => {
    localStorage.setItem('sb-jraqurdcjwnifzpdqtnm-auth-token', 'x')
    expect(haySesionGuardada()).toBe(true)
  })

  it('cuenta la de este proyecto partida en trozos', () => {
    localStorage.setItem('sb-jraqurdcjwnifzpdqtnm-auth-token.0', 'x')
    expect(haySesionGuardada()).toBe(true)
  })

  it('NO cuenta la de otro proyecto', () => {
    localStorage.setItem('sb-otroproyecto-auth-token', 'x')
    expect(haySesionGuardada()).toBe(false)
  })

  it('NO cuenta la del verificador de PKCE del mismo proyecto', () => {
    localStorage.setItem('sb-jraqurdcjwnifzpdqtnm-auth-token-code-verifier', 'x')
    expect(haySesionGuardada()).toBe(false)
  })
})
