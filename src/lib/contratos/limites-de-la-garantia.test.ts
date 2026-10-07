/**
 * 🔴 02-10-2026 · Las fechas que se corrían (Nico): la fecha de un movimiento
 * de la garantía de servicios se revisa como la revisa el back
 * (`@EsDiaDelCalendario` + `@FechaEntre(2000–2100)`), con su misma frase.
 */
import { describe, it, expect } from 'vitest'
import {
  MENSAJES_DE_LA_GARANTIA,
  errorDeLaFechaDelMovimiento,
} from './limites-de-la-garantia'

describe('errorDeLaFechaDelMovimiento — espejo del back', () => {
  it('las frases son las del back, letra por letra', () => {
    expect(MENSAJES_DE_LA_GARANTIA.fechaDelMovimiento).toBe(
      'La fecha del movimiento no es un día real del calendario (usa AAAA-MM-DD).',
    )
    expect(MENSAJES_DE_LA_GARANTIA.fechaDelMovimientoFueraDeRango).toBe(
      'La fecha del movimiento debe estar entre el año 2000 y el 2100.',
    )
  })

  it('un día real pasa, también el 29 de febrero bisiesto y los bordes del rango', () => {
    for (const dia of ['2026-09-15', '2028-02-29', '2000-01-01', '2100-12-31']) {
      expect(errorDeLaFechaDelMovimiento(dia)).toBeNull()
    }
  })

  it('vacía no opina (de eso se encarga el formulario)', () => {
    expect(errorDeLaFechaDelMovimiento('')).toBeNull()
    expect(errorDeLaFechaDelMovimiento(null)).toBeNull()
  })

  it('🔴 el 31 de febrero no es un día: la frase, no el 3 de marzo', () => {
    expect(errorDeLaFechaDelMovimiento('2026-02-31')).toBe(MENSAJES_DE_LA_GARANTIA.fechaDelMovimiento)
    expect(errorDeLaFechaDelMovimiento('2026-02-29')).toBe(MENSAJES_DE_LA_GARANTIA.fechaDelMovimiento)
  })

  it('fuera de 2000–2100 dice el rango', () => {
    expect(errorDeLaFechaDelMovimiento('1999-12-31')).toBe(
      MENSAJES_DE_LA_GARANTIA.fechaDelMovimientoFueraDeRango,
    )
    expect(errorDeLaFechaDelMovimiento('2101-01-01')).toBe(
      MENSAJES_DE_LA_GARANTIA.fechaDelMovimientoFueraDeRango,
    )
  })
})
