import { describe, expect, it, vi } from 'vitest'
import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js'

import { leerErrorDelRegistro, mensajeDelRegistro, registrarFalloDelRegistro } from './errores-del-registro'

/*
 * Los errores son los de la librería de verdad (mismo `status`, `code` y
 * `message` que arma `handleError` de auth-js), no objetos inventados.
 */
describe('mensajeDelRegistro — lo que dice Supabase al registrar', () => {
  it.each([
    [
      'tope de correos del proyecto (el segundo correo seguido, Nico 30-09)',
      new AuthApiError('email rate limit exceeded', 429, 'over_email_send_rate_limit'),
      'limite-de-correos',
      /muchos correos de confirmación/,
    ],
    [
      'el mismo correo antes de un minuto',
      new AuthApiError('For security purposes, you can only request this after 42 seconds.', 429, 'over_email_send_rate_limit'),
      'limite-de-correos',
      /Espera 42 segundos/,
    ],
    [
      'demasiadas peticiones desde la misma conexión',
      new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit'),
      'limite-de-intentos',
      /Demasiados intentos/,
    ],
    [
      'correo ya registrado (por código)',
      new AuthApiError('User already registered', 422, 'user_already_exists'),
      'ya-existe',
      /ya está registrado/,
    ],
    [
      'contraseña débil',
      new AuthWeakPasswordError('Password is known to be weak and easy to guess', 422, ['pwned']),
      'clave-debil',
      /muy débil/,
    ],
    [
      'correo inválido',
      new AuthApiError('Email address "x@y" is invalid', 400, 'email_address_invalid'),
      'correo-invalido',
      /no es válido/,
    ],
    [
      'correo al que el servidor de correo no deja mandar',
      new AuthApiError('Email address not authorized', 400, 'email_address_not_authorized'),
      'correo-no-autorizado',
      /Todavía no podemos enviar correos/,
    ],
    [
      'registro deshabilitado',
      new AuthApiError('Signups not allowed for this instance', 422, 'signup_disabled'),
      'registro-cerrado',
      /no está disponible/,
    ],
    [
      'el servidor de correo falló',
      new AuthApiError('Error sending confirmation email', 500, 'unexpected_failure'),
      'fallo-del-correo',
      /No pudimos enviar el correo de confirmación/,
    ],
    [
      'la base no guardó el usuario',
      new AuthApiError('Database error saving new user', 500, 'unexpected_failure'),
      'fallo-de-la-base',
      /No pudimos guardar la cuenta/,
    ],
    [
      'sin conexión',
      new AuthRetryableFetchError('Failed to fetch', 0),
      'sin-conexion',
      /No hubo conexión/,
    ],
  ])('%s', (_caso, err, motivo, mensaje) => {
    expect(leerErrorDelRegistro(err).motivo).toBe(motivo)
    expect(mensajeDelRegistro(err)).toMatch(mensaje)
    expect(mensajeDelRegistro(err)).not.toBe('Error al crear la cuenta. Intenta de nuevo.')
  })

  it('lo desconocido sigue siendo el genérico, pero con la referencia del error', () => {
    const err = new AuthApiError('Something new', 400, 'algo_nuevo')
    expect(mensajeDelRegistro(err)).toBe('Error al crear la cuenta. Intenta de nuevo. Referencia: algo_nuevo.')
    expect(mensajeDelRegistro(new AuthApiError('boom', 418, undefined as unknown as string))).toBe(
      'Error al crear la cuenta. Intenta de nuevo. Referencia: 418.',
    )
    expect(mensajeDelRegistro(new Error('Supabase not initialized'))).toBe('Error al crear la cuenta. Intenta de nuevo.')
  })

  it('cada pantalla pone su texto para «ya existe» y su genérico', () => {
    const existe = new AuthApiError('User already registered', 422, 'user_already_exists')
    expect(mensajeDelRegistro(existe, { yaExiste: 'Usa «Ya tengo cuenta».' })).toBe('Usa «Ya tengo cuenta».')
    const raro = new AuthApiError('x', 400, 'otro')
    expect(mensajeDelRegistro(raro, { generico: 'No pudimos crear tu cuenta.' })).toBe(
      'No pudimos crear tu cuenta. Referencia: otro.',
    )
  })

  it('el rastro lleva status y código, nunca el correo', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
    registrarFalloDelRegistro(
      'AuthForm',
      new AuthApiError('email rate limit exceeded for hola+10@leasefy.co', 429, 'over_email_send_rate_limit'),
    )
    expect(espia).toHaveBeenCalledWith('[registro] AuthForm: signUp falló', {
      motivo: 'limite-de-correos',
      status: 429,
      codigo: 'over_email_send_rate_limit',
    })
    expect(JSON.stringify(espia.mock.calls)).not.toContain('@')
    espia.mockRestore()
  })
})
