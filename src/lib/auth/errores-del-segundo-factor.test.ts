/**
 * 🔴 «Error 422» a secas (Nico, 29-09): el toast que salió al tocar
 * «Desactivar» desde el login. GoTrue contesta sus errores con `msg` y
 * `error_code`, no con `message`, así que la pantalla caía al genérico
 * `Error ${status}`. Todo error del segundo factor sale ahora en español
 * entendible, venga de Supabase o del back.
 */
import { describe, it, expect } from 'vitest'

import { ApiError } from '@/lib/api/client'
import {
  MENSAJE_NO_DISPONIBLE,
  mensajeDeSupabaseAuth,
  mensajeDelRestablecimiento,
} from './errores-del-segundo-factor'

describe('mensajeDeSupabaseAuth', () => {
  it('🔴 el 422 de Nico (insufficient_aal) dice qué hacer, no «Error 422»', () => {
    const texto = mensajeDeSupabaseAuth({
      status: 422,
      codigo: 'insufficient_aal',
      mensaje: 'AAL2 required to unenroll verified factor',
    })
    expect(texto).not.toMatch(/Error 422/)
    expect(texto).toMatch(/código de tu app/)
    expect(texto).toMatch(/correo/)
  })

  it('un código equivocado o vencido se dice como tal', () => {
    for (const caso of [
      { status: 422, codigo: 'mfa_verification_failed' },
      { status: 422, codigo: 'mfa_challenge_expired' },
      { status: 400, mensaje: 'Invalid TOTP code entered' },
    ]) {
      expect(mensajeDeSupabaseAuth(caso)).toMatch(/^Código incorrecto/)
    }
  })

  it('sesión caída, límite de ritmo y caída del servicio, en español', () => {
    expect(mensajeDeSupabaseAuth({ status: 403, codigo: 'session_not_found' })).toMatch(
      /sesión se cerró/,
    )
    expect(mensajeDeSupabaseAuth({ status: 429 })).toMatch(/Espera un minuto/)
    expect(mensajeDeSupabaseAuth({ status: 500 })).toMatch(/no respondió bien/)
  })

  it('lo que no se reconoce tampoco muestra el número pelado', () => {
    const texto = mensajeDeSupabaseAuth({ status: 422, mensaje: 'Something odd' })
    expect(texto).not.toMatch(/Error \d{3}/)
    expect(texto).toMatch(/segundo factor/)
  })
})

describe('mensajeDelRestablecimiento', () => {
  it('codigo_invalido trae el mensaje del back (con los intentos que quedan)', () => {
    const e = new ApiError(422, 'El código no es correcto. Te quedan 3 intentos.', 'codigo_invalido')
    expect(mensajeDelRestablecimiento(e)).toBe('El código no es correcto. Te quedan 3 intentos.')
  })

  it('vencido y demasiados intentos dicen que hay que pedir otro', () => {
    expect(mensajeDelRestablecimiento(new ApiError(422, 'x', 'codigo_vencido'))).toMatch(
      /venció.*Pide uno nuevo/,
    )
    expect(mensajeDelRestablecimiento(new ApiError(422, 'x', 'demasiados_intentos'))).toMatch(
      /demasiadas veces.*Pide uno nuevo/,
    )
  })

  it('🔴 sin el secreto en el back: «todavía no está disponible; pídele a un administrador…»', () => {
    const e = new ApiError(503, 'lo que sea', 'restablecimiento_no_disponible')
    expect(mensajeDelRestablecimiento(e)).toBe(MENSAJE_NO_DISPONIBLE)
    expect(MENSAJE_NO_DISPONIBLE).toMatch(/todavía no está disponible; pídele a un administrador/)
  })

  it('un 422 sin código reconocible no dice «Error 422»', () => {
    const texto = mensajeDelRestablecimiento(new ApiError(422, 'Error 422'))
    expect(texto).not.toMatch(/Error 422/)
  })

  it('demasiados envíos usa el mensaje del back', () => {
    const e = new ApiError(
      429,
      'Ya te mandamos 3 códigos en la última hora. Usa el último que te llegó o pide otro en 40 minutos.',
      'demasiados_envios',
    )
    expect(mensajeDelRestablecimiento(e)).toMatch(/3 códigos en la última hora/)
  })
})
