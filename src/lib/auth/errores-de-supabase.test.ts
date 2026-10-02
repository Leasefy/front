/**
 * El traductor de Supabase Auth (02-10-2026): por `code` y por `status`, nunca
 * por el texto en inglés, y con la regla de oro de la plataforma.
 */
import { describe, it, expect } from 'vitest'
import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js'

import { codigoDeSupabase, leerErrorDeSupabase, mensajeDeSupabase, sinRespuestaDeSupabase } from './errores-de-supabase'

const OPCIONES = { porDefecto: 'No pudimos crear tu cuenta. Intenta de nuevo.', accion: 'crear tu cuenta' }

describe('leerErrorDeSupabase', () => {
  it('lee el `code` del SDK y el `error_code` del cuerpo REST', () => {
    expect(leerErrorDeSupabase(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))).toMatchObject({
      status: 400,
      codigo: 'invalid_credentials',
    })
    expect(leerErrorDeSupabase({ code: 422, error_code: 'same_password', msg: 'New password should be different' })).toMatchObject({
      status: 422,
      codigo: 'same_password',
    })
  })

  it('trae los motivos de una contraseña débil', () => {
    const e = new AuthWeakPasswordError('Password is known to be weak', 422, ['pwned'])
    expect(leerErrorDeSupabase(e)).toMatchObject({ codigo: 'weak_password', motivos: ['pwned'] })
  })
})

describe('mensajeDeSupabase', () => {
  it('🔴 lee el código, no el texto: el mismo código con otra redacción dice lo mismo', () => {
    const a = new AuthApiError('User already registered', 422, 'user_already_exists')
    const b = new AuthApiError('A user with this email address has already been registered', 422, 'email_exists')
    expect(mensajeDeSupabase(a, OPCIONES)).toBe('Ya hay una cuenta con este correo.')
    expect(mensajeDeSupabase(b, OPCIONES)).toBe('Ya hay una cuenta con este correo.')
  })

  it('🔴 un 4xx sin código conocido NO muestra el inglés: dice la frase de la pantalla', () => {
    const e = new AuthApiError('Signups not allowed for otp', 422, undefined as unknown as string)
    const texto = mensajeDeSupabase(e, OPCIONES)
    expect(texto).toBe(OPCIONES.porDefecto)
    expect(texto).not.toMatch(/Signups|otp/)
  })

  it('🔴 sin respuesta (`AuthRetryableFetchError` status 0): habla de la conexión', () => {
    const e = new AuthRetryableFetchError('Failed to fetch', 0)
    expect(mensajeDeSupabase(e, OPCIONES)).toMatch(/conexión/)
    expect(sinRespuestaDeSupabase(e)).toBe(true)
  })

  it('un `TypeError: Failed to fetch` también es sin respuesta', () => {
    expect(mensajeDeSupabase(new TypeError('Failed to fetch'), OPCIONES)).toMatch(/conexión/)
  })

  it('🔴 un 5xx dice que falló de nuestro lado, sin culpar a la conexión ni mostrar el inglés', () => {
    const e = new AuthApiError('Database error saving new user', 500, 'unexpected_failure')
    const texto = mensajeDeSupabase(e, OPCIONES)
    expect(texto).toMatch(/^No pudimos crear tu cuenta: algo falló de nuestro lado/)
    expect(texto).not.toMatch(/conexi[oó]n|Database/)
    expect(sinRespuestaDeSupabase(e)).toBe(false)
  })

  it('la caída del gateway de Supabase (502 reintentable) también es nuestra', () => {
    expect(mensajeDeSupabase(new AuthRetryableFetchError('Bad Gateway', 502), OPCIONES)).toMatch(/de nuestro lado/)
  })

  it('un código que es de Supabase y no de la persona (timeout del gancho) es nuestro', () => {
    expect(mensajeDeSupabase(new AuthApiError('Hook timed out', 422, 'hook_timeout'), OPCIONES)).toMatch(/de nuestro lado/)
  })

  it('una contraseña débil dice por qué (filtrada, corta o sin variedad)', () => {
    expect(mensajeDeSupabase(new AuthWeakPasswordError('weak', 422, ['pwned']))).toMatch(/filtraciones/)
    expect(mensajeDeSupabase(new AuthWeakPasswordError('weak', 422, ['length']))).toMatch(/muy corta/)
    expect(mensajeDeSupabase(new AuthWeakPasswordError('weak', 422, ['characters']))).toMatch(/variedad/)
  })

  it('las frases de la pantalla ganan sobre las generales', () => {
    const e = new AuthApiError('New password should be different from the old password.', 422, 'same_password')
    expect(mensajeDeSupabase(e, { frases: { same_password: 'Esa contraseña ya la usaste antes. Elige otra.' } })).toBe(
      'Esa contraseña ya la usaste antes. Elige otra.',
    )
  })

  it('el límite de correos y el de intentos, en español', () => {
    expect(mensajeDeSupabase(new AuthApiError('Email rate limit exceeded', 429, 'over_email_send_rate_limit'))).toMatch(
      /Espera unos minutos/,
    )
    expect(mensajeDeSupabase({ status: 429 })).toMatch(/Espera un minuto/)
  })

  it('un error que no vino de HTTP (`Supabase not initialized`) dice la frase de la pantalla', () => {
    expect(mensajeDeSupabase(new Error('Supabase not initialized'), OPCIONES)).toBe(OPCIONES.porDefecto)
  })

  it('codigoDeSupabase', () => {
    expect(codigoDeSupabase(new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'))).toBe('email_not_confirmed')
    expect(codigoDeSupabase(new Error('x'))).toBeUndefined()
  })
})
