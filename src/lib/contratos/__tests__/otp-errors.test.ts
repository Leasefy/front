import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { debeReiniciarOtp, describirErrorDeOtp } from '../otp-errors'

describe('describirErrorDeOtp — contract.md §3.3', () => {
  it('CODIGO_INCORRECTO trae intentosRestantes', () => {
    const err = new ApiError(400, 'Código incorrecto.', 'CODIGO_INCORRECTO', { intentosRestantes: 3 })
    const d = describirErrorDeOtp(err)
    expect(d.mensaje).toBe('Código incorrecto.')
    expect(d.intentosRestantes).toBe(3)
  })

  it('CODIGO_EN_ESPERA (429) trae segundosDeEspera para fijar el cooldown', () => {
    const err = new ApiError(429, 'Espera antes de reenviar.', 'CODIGO_EN_ESPERA', { segundos: 37 })
    const d = describirErrorDeOtp(err)
    expect(d.segundosDeEspera).toBe(37)
    expect(d.mensaje).toBe('Espera antes de reenviar.')
  })

  it('CODIGO_NO_ENTREGADO trae los channels para el detalle por canal', () => {
    const channels = [{ channel: 'EMAIL' as const, status: 'FAILED' as const, destination: null, reason: 'SEND_ERROR' as const }]
    const err = new ApiError(400, 'No pudimos entregar el código.', 'CODIGO_NO_ENTREGADO', { channels })
    const d = describirErrorDeOtp(err)
    expect(d.channels).toEqual(channels)
  })

  it('un código sin detalle estructurado (CODIGO_VENCIDO) sólo trae el mensaje', () => {
    const err = new ApiError(400, 'El código venció.', 'CODIGO_VENCIDO')
    const d = describirErrorDeOtp(err)
    expect(d.mensaje).toBe('El código venció.')
    expect(d.intentosRestantes).toBeUndefined()
    expect(d.segundosDeEspera).toBeUndefined()
    expect(d.channels).toBeUndefined()
  })

  it('un error que no es ApiError se degrada a un mensaje genérico, nunca revienta', () => {
    const d = describirErrorDeOtp(new Error('boom'))
    expect(d.mensaje).toBe('boom')
    const d2 = describirErrorDeOtp('algo raro')
    expect(d2.mensaje).toBeTruthy()
  })
})

describe('debeReiniciarOtp', () => {
  it('TOKEN_DE_FIRMA_INVALIDO — reiniciar el flujo de OTP', () => {
    expect(debeReiniciarOtp(new ApiError(400, 'Token inválido.', 'TOKEN_DE_FIRMA_INVALIDO'))).toBe(true)
  })

  it('CODIGO_DE_FIRMA_REQUERIDO — reiniciar el flujo de OTP', () => {
    expect(debeReiniciarOtp(new ApiError(400, 'Falta el código.', 'CODIGO_DE_FIRMA_REQUERIDO'))).toBe(true)
  })

  it('otro código (p.ej. un 409 de negocio) no reinicia nada', () => {
    expect(debeReiniciarOtp(new ApiError(409, 'x', 'DOCUMENTO_CAMBIO_DESDE_LA_FIRMA'))).toBe(false)
  })

  it('no es un ApiError → false, nunca revienta', () => {
    expect(debeReiniciarOtp(new Error('boom'))).toBe(false)
    expect(debeReiniciarOtp(undefined)).toBe(false)
  })
})
