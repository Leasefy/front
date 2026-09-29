import { describe, it, expect } from 'vitest'
import { describirCanales } from '../otp-channels'
import type { OtpChannelResult } from '@/lib/api/contracts.types'

describe('describirCanales', () => {
  it('sin channels (back anterior a T-0109), devuelve una lista vacía', () => {
    expect(describirCanales(undefined)).toEqual([])
    expect(describirCanales([])).toEqual([])
  })

  it('un canal SENT se describe como enviado, con el destino enmascarado', () => {
    const channels: OtpChannelResult[] = [
      { channel: 'EMAIL', status: 'SENT', destination: 'ni***s@example.com', reason: null },
    ]
    const [linea] = describirCanales(channels)
    expect(linea.enviado).toBe(true)
    expect(linea.etiqueta).toBe('correo')
    expect(linea.detalle).toContain('ni***s@example.com')
  })

  it('EMAIL SUPPRESSED (kill switch T-0090) no se cuenta como enviado, pero no es un fallo del canal', () => {
    const channels: OtpChannelResult[] = [
      { channel: 'EMAIL', status: 'SUPPRESSED', destination: 'ni***s@example.com', reason: 'EMAIL_SUPPRESSED' },
    ]
    const [linea] = describirCanales(channels)
    expect(linea.enviado).toBe(false)
    expect(linea.detalle.toLowerCase()).toContain('suspendido')
  })

  it('un canal FAILED/SKIPPED muestra el motivo legible, no el enum crudo', () => {
    const channels: OtpChannelResult[] = [
      { channel: 'WHATSAPP', status: 'SKIPPED', destination: null, reason: 'NO_PHONE' },
    ]
    const [linea] = describirCanales(channels)
    expect(linea.enviado).toBe(false)
    expect(linea.etiqueta).toBe('WhatsApp')
    expect(linea.detalle).not.toMatch(/NO_PHONE/)
    expect(linea.detalle.toLowerCase()).toContain('celular')
  })

  it('degradación: un `reason` desconocido (enum futuro) no revienta — cae a un texto genérico', () => {
    const channels: OtpChannelResult[] = [
      { channel: 'WHATSAPP', status: 'FAILED', destination: null, reason: 'UN_MOTIVO_QUE_NO_EXISTE_TODAVIA' as never },
    ]
    const [linea] = describirCanales(channels)
    expect(linea.enviado).toBe(false)
    expect(linea.detalle).toBeTruthy()
  })

  it('preserva el orden EMAIL primero, WHATSAPP después (el mismo del back)', () => {
    const channels: OtpChannelResult[] = [
      { channel: 'EMAIL', status: 'FAILED', destination: null, reason: 'SEND_ERROR' },
      { channel: 'WHATSAPP', status: 'SENT', destination: '+57 *** *** 1234', reason: null },
    ]
    const lineas = describirCanales(channels)
    expect(lineas.map((l) => l.channel)).toEqual(['EMAIL', 'WHATSAPP'])
  })
})
