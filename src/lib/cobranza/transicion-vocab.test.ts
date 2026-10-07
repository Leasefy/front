/**
 * transicion-vocab — QA-IA-B (04-10-2026): «Movimientos recientes» pintaba el
 * slug crudo del motivo y «Operador» en todos los movimientos automáticos.
 */
import { describe, it, expect } from 'vitest'

import { laHizoUnaPersona, motivoDeLaTransicion } from './transicion-vocab'

describe('motivoDeLaTransicion', () => {
  it('traduce los motivos del micro', () => {
    expect(motivoDeLaTransicion('sin_deuda:dejo_de_estar_en_mora_en_la_plataforma')).toBe('Ya no tiene deuda en mora')
    expect(motivoDeLaTransicion('dia_16_sin_pago')).toBe('Cumplió 16 días sin pagar')
  })
  it('un slug desconocido no se pinta crudo; el texto de una persona sí', () => {
    expect(motivoDeLaTransicion('algo_nuevo:del_micro')).toBe('Cambio de etapa')
    expect(motivoDeLaTransicion('El inquilino se fue del país, lo pasé a jurídico')).toBe(
      'El inquilino se fue del país, lo pasé a jurídico',
    )
  })
})

describe('laHizoUnaPersona', () => {
  it('SAAS_ORCHESTRATOR es el sistema; admin:override, una persona', () => {
    expect(laHizoUnaPersona('SAAS_ORCHESTRATOR')).toBe(false)
    expect(laHizoUnaPersona('admin:override')).toBe(true)
  })
})
