/**
 * Un mes es una etiqueta, no un instante.
 *
 * El defecto era real y estaba en CINCO lugares del panel de dispersiones: el
 * título decía «julio de 2026» sobre los datos de agosto, y cada fila de la
 * tabla repetía la mentira.
 */

import { describe, it, expect } from 'vitest'

import { fechaLocalDelMes, nombreDelMes } from './mes'

describe('nombreDelMes', () => {
  it('agosto se muestra como agosto, no como julio', () => {
    // `new Date('2026-08-01')` es medianoche UTC; en Colombia (UTC-5) eso son
    // las 19:00 del 31 de julio, y el mes mostrado retrocedía uno.
    expect(nombreDelMes('2026-08')).toBe('agosto de 2026')
  })

  it('enero no retrocede a diciembre del año anterior', () => {
    // El caso peor: además del mes se pierde el AÑO.
    expect(nombreDelMes('2026-01')).toBe('enero de 2026')
  })

  it('el formato corto también', () => {
    expect(nombreDelMes('2026-08', 'es', 'short')).toContain('2026')
    expect(nombreDelMes('2026-08', 'es', 'short')).not.toContain('jul')
  })

  it('en inglés respeta el mes', () => {
    expect(nombreDelMes('2026-08', 'en')).toBe('August 2026')
  })

  describe('entradas que no son un mes', () => {
    it('devuelve el string crudo en vez de inventar una fecha', () => {
      // Una fecha inventada se ve igual que una real. El string crudo avisa.
      expect(nombreDelMes('no-es-un-mes')).toBe('no-es-un-mes')
      expect(nombreDelMes('')).toBe('')
    })

    it('un mes fuera de rango no se acepta', () => {
      // '2026-13' sumaría un año en silencio con el constructor de Date.
      expect(fechaLocalDelMes('2026-13')).toBeNull()
      expect(fechaLocalDelMes('2026-00')).toBeNull()
    })

    it('una fecha completa no es un mes', () => {
      expect(fechaLocalDelMes('2026-08-15')).toBeNull()
    })
  })

  describe('fechaLocalDelMes', () => {
    it('devuelve el día 1 en hora local', () => {
      const f = fechaLocalDelMes('2026-08')

      expect(f?.getFullYear()).toBe(2026)
      expect(f?.getMonth()).toBe(7) // agosto, base 0
      expect(f?.getDate()).toBe(1)
    })
  })
})
