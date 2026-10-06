/**
 * 🔴 02-10-2026 · Las fechas que se corrían (Nico): la fecha del pago de un
 * estudio se revisa como la revisa el back (`@EsDiaDelCalendario` +
 * `@FechaEntre(2000–2100)` en `RegistrarPagoDeEstudioDto.fecha`), con su
 * misma frase.
 */
import { describe, expect, it } from 'vitest'
import { MENSAJES_DEL_ESTUDIO, revisarFechaDelPagoDelEstudio } from './limites-del-pago-del-estudio'

describe('revisarFechaDelPagoDelEstudio — espejo del back', () => {
  it('las frases son las del back, letra por letra', () => {
    expect(MENSAJES_DEL_ESTUDIO.fechaDelPago).toBe(
      'La fecha del pago no es un día real del calendario (usa AAAA-MM-DD).',
    )
    expect(MENSAJES_DEL_ESTUDIO.fechaDelPagoFueraDeRango).toBe(
      'La fecha del pago debe estar entre el año 2000 y el 2100.',
    )
  })

  it('vacía no opina (el back usa hoy) y un día real pasa', () => {
    expect(revisarFechaDelPagoDelEstudio('')).toBeUndefined()
    expect(revisarFechaDelPagoDelEstudio(undefined)).toBeUndefined()
    expect(revisarFechaDelPagoDelEstudio('2026-09-15')).toBeUndefined()
    expect(revisarFechaDelPagoDelEstudio('2028-02-29')).toBeUndefined()
  })

  it('🔴 el 31 de febrero no es un día: la frase, no el 3 de marzo', () => {
    expect(revisarFechaDelPagoDelEstudio('2026-02-31')).toBe(MENSAJES_DEL_ESTUDIO.fechaDelPago)
  })

  it('fuera de 2000–2100 dice el rango', () => {
    expect(revisarFechaDelPagoDelEstudio('1999-12-31')).toBe(MENSAJES_DEL_ESTUDIO.fechaDelPagoFueraDeRango)
    expect(revisarFechaDelPagoDelEstudio('2101-01-01')).toBe(MENSAJES_DEL_ESTUDIO.fechaDelPagoFueraDeRango)
  })
})
