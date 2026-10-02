/**
 * 🔴 02-10-2026 · Las fechas que se corrían (Nico): la fecha de vigencia de
 * la carta de incremento se revisa como la revisa el back
 * (`PrepararDocumentoQueryDto.fechaDeVigencia`: `@EsDiaDelCalendario` +
 * `@FechaEntre(2000–2100)`), con su misma frase.
 */
import { describe, expect, it } from 'vitest'
import { MENSAJES_DE_LOS_DOCUMENTOS, errorDeLaFechaDeVigencia } from './limites-de-los-documentos'

describe('errorDeLaFechaDeVigencia — espejo del back', () => {
  it('las frases son las del back, letra por letra', () => {
    expect(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigencia).toBe(
      'La fecha de vigencia no es un día real del calendario (usa AAAA-MM-DD).',
    )
    expect(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango).toBe(
      'La fecha de vigencia debe estar entre el año 2000 y el 2100.',
    )
  })

  it('un día real pasa', () => {
    expect(errorDeLaFechaDeVigencia('2026-12-01')).toBeNull()
    expect(errorDeLaFechaDeVigencia('2028-02-29')).toBeNull()
  })

  it('vacía o a medio escribir no opina', () => {
    expect(errorDeLaFechaDeVigencia('')).toBeNull()
    expect(errorDeLaFechaDeVigencia(undefined)).toBeNull()
    expect(errorDeLaFechaDeVigencia('2026-1')).toBeNull()
  })

  it('🔴 el 31 de febrero no es un día: la frase, no el 3 de marzo', () => {
    expect(errorDeLaFechaDeVigencia('2026-02-31')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigencia)
    expect(errorDeLaFechaDeVigencia('2026-13-01')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigencia)
  })

  it('fuera de 2000–2100 dice el rango', () => {
    expect(errorDeLaFechaDeVigencia('1999-12-31')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango)
    expect(errorDeLaFechaDeVigencia('2101-01-01')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango)
  })
})
