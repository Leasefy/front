import { describe, expect, it } from 'vitest'

import {
  COOKIE_DE_RECUPERACION,
  esEnlaceDeRecuperacion,
  hayMarcaDeRecuperacion,
  rutaDeLaRecuperacion,
} from './sesion-de-recuperacion'

describe('sesión de recuperación', () => {
  it('sólo el enlace de «¿Olvidaste tu contraseña?» deja la marca, no la invitación', () => {
    expect(esEnlaceDeRecuperacion('/auth/update-password')).toBe(true)
    expect(esEnlaceDeRecuperacion('/auth/update-password?nuevo=1&next=%2Finquilino')).toBe(false)
    expect(esEnlaceDeRecuperacion('/auth/post-login')).toBe(false)
  })

  it('las pantallas donde se termina la recuperación', () => {
    expect(rutaDeLaRecuperacion('/auth/update-password')).toBe(true)
    expect(rutaDeLaRecuperacion('/auth/mfa-verify')).toBe(true)
    expect(rutaDeLaRecuperacion('/')).toBe(false)
    expect(rutaDeLaRecuperacion('/auth')).toBe(false)
    expect(rutaDeLaRecuperacion('/panel/inmobiliaria')).toBe(false)
    expect(rutaDeLaRecuperacion('/auth/update-passwordx')).toBe(false)
    expect(rutaDeLaRecuperacion(null)).toBe(false)
  })

  it('lee la marca entre otras cookies', () => {
    expect(hayMarcaDeRecuperacion(`sb-x-auth-token=abc; ${COOKIE_DE_RECUPERACION}=1; otra=2`)).toBe(true)
    expect(hayMarcaDeRecuperacion('sb-x-auth-token=abc')).toBe(false)
    expect(hayMarcaDeRecuperacion(`x${COOKIE_DE_RECUPERACION}=1`)).toBe(false)
  })
})
