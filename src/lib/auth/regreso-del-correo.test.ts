/**
 * El regreso del enlace de CONFIRMAR CORREO (bug de QA, 28-09).
 *
 * Lo que tiene que quedar fijo:
 *  · el enlace del registro vuelve siempre por `/auth/callback` con `?` y con
 *    la marca `tipo=registro` (la plantilla nueva le pega `&token_hash=…`);
 *  · un `token_hash` NUNCA se gasta en el GET: se pasa a la pantalla que pide
 *    el clic (los escáneres de enlaces abren el correo antes que la persona);
 *  · un `?code=` de un registro que ya no se puede canjear quiere decir que la
 *    cuenta YA quedó confirmada (Supabase sólo emite el código después de
 *    confirmar).
 */
import { describe, expect, it } from 'vitest'
import {
  leerRegresoDelCorreo,
  tipoDeConfirmacion,
  urlDeLaPantallaDeConfirmacion,
  urlDeRegresoDelRegistro,
} from './regreso-del-correo'

const qs = (s: string) => new URLSearchParams(s)

describe('urlDeRegresoDelRegistro', () => {
  it('vuelve por /auth/callback, con el destino y la marca del registro', () => {
    expect(urlDeRegresoDelRegistro('http://localhost:3027', '/onboarding/inmobiliaria')).toBe(
      'http://localhost:3027/auth/callback?returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro',
    )
  })

  it('siempre lleva «?», para que la plantilla pueda pegarle «&token_hash=…»', () => {
    const url = urlDeRegresoDelRegistro('https://leasefy.co', '/registro?invitationToken=abc')
    expect(url).toContain('?')
    // El token de la invitación viaja DENTRO del destino, no suelto.
    expect(new URL(`${url}&token_hash=pkce_x&type=email`).searchParams.get('returnUrl')).toBe(
      '/registro?invitationToken=abc',
    )
  })
})

describe('tipoDeConfirmacion', () => {
  it.each([
    ['email', 'email'],
    ['signup', 'signup'],
    [null, 'email'],
    ['recovery', 'email'],
    ['magiclink', 'email'],
  ])('%s → %s', (entrada, salida) => {
    expect(tipoDeConfirmacion(entrada)).toBe(salida)
  })
})

describe('leerRegresoDelCorreo', () => {
  it('token_hash → pantalla de confirmación, sin gastarlo', () => {
    expect(
      leerRegresoDelCorreo(qs('returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro&token_hash=pkce_abc&type=email')),
    ).toEqual({ accion: 'confirmar', tokenHash: 'pkce_abc', tipo: 'email', destino: '/onboarding/inmobiliaria' })
  })

  it('code → canjear, y recuerda si era el del registro', () => {
    expect(leerRegresoDelCorreo(qs('code=c0de&returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro'))).toEqual({
      accion: 'canjear',
      code: 'c0de',
      destino: '/onboarding/inmobiliaria',
      esRegistro: true,
    })
    expect(leerRegresoDelCorreo(qs('code=c0de'))).toEqual({
      accion: 'canjear',
      code: 'c0de',
      destino: '/auth/post-login',
      esRegistro: false,
    })
  })

  it('sin code ni token_hash (fragmento, o error de Supabase) → /auth/enlace', () => {
    expect(
      leerRegresoDelCorreo(
        qs('error=access_denied&error_code=otp_expired&returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro'),
      ),
    ).toEqual({ accion: 'enlace', destino: '/onboarding/inmobiliaria' })
  })

  it('un destino que sale del sitio no se sigue', () => {
    expect(leerRegresoDelCorreo(qs('token_hash=t&returnUrl=https%3A%2F%2Fevil.example'))).toMatchObject({
      destino: '/auth/post-login',
    })
    expect(leerRegresoDelCorreo(qs('code=c&returnUrl=%2F%2Fevil.example'))).toMatchObject({
      destino: '/auth/post-login',
    })
  })
})

describe('urlDeLaPantallaDeConfirmacion', () => {
  it('lleva el token, el tipo y el destino a /auth/confirmar', () => {
    const url = urlDeLaPantallaDeConfirmacion({ tokenHash: 'pkce_abc', tipo: 'email', destino: '/onboarding/inmobiliaria' })
    expect(url.startsWith('/auth/confirmar?')).toBe(true)
    const sp = new URL(url, 'http://x').searchParams
    expect(sp.get('token_hash')).toBe('pkce_abc')
    expect(sp.get('type')).toBe('email')
    expect(sp.get('returnUrl')).toBe('/onboarding/inmobiliaria')
  })
})
