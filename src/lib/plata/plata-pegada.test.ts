import { describe, it, expect } from 'vitest'
import { conLaPlataPegada } from './plata-pegada'

describe('conLaPlataPegada (QA-IA-95, IA95-05)', () => {
  it('pega el «$» a su cifra con el espacio duro', () => {
    expect(conLaPlataPegada('Generar 5 facturas de octubre de 2026 por $ 6.185.000, cada una con su cobro del mes.')).toBe(
      'Generar 5 facturas de octubre de 2026 por $ 6.185.000, cada una con su cobro del mes.',
    )
    expect(conLaPlataPegada('Saldo -$ 1.500,50')).toBe('Saldo -$ 1.500,50')
  })
  it('PI-16: la plata que el micro escribe sin espacio («$5.750.000») sale con el de la casa', () => {
    expect(conLaPlataPegada('Cuánto pagó $300.000 de $5.750.000')).toBe('Cuánto pagó $\u00a0300.000 de $\u00a05.750.000')
  })
  it('no toca lo que no es plata ni lo que ya venía pegado', () => {
    expect(conLaPlataPegada('Cuesta $ y no sé cuánto')).toBe('Cuesta $ y no sé cuánto')
    expect(conLaPlataPegada('por $ 300.000')).toBe('por $ 300.000')
    expect(conLaPlataPegada(null)).toBeNull()
  })
})
