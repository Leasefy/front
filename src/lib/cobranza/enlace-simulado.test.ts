import { describe, expect, it } from 'vitest'
import { esEnlaceDePagoSimulado } from './enlace-simulado'

describe('esEnlaceDePagoSimulado', () => {
  it('los dobles del micro (host o ruta) son simulados', () => {
    expect(esEnlaceDePagoSimulado('https://stub.leasefy/payment-plan/23e611c7-22a2-4695-950e-1aec675d7d1b')).toBe(true)
    expect(esEnlaceDePagoSimulado('https://api.leasefy.co/stub/wompi/abc')).toBe(true)
  })
  it('un enlace de Wompi de verdad no', () => {
    expect(esEnlaceDePagoSimulado('https://checkout.wompi.co/l/AbC123')).toBe(false)
    expect(esEnlaceDePagoSimulado(null)).toBe(false)
    expect(esEnlaceDePagoSimulado('no es una url')).toBe(false)
  })
})
