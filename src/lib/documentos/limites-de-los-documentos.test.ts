/**
 * 🔴 02-10-2026 · La fecha de vigencia de la carta de incremento se revisa
 * como la revisa el back (`PrepararDocumentoQueryDto.fechaDeVigencia` y
 * `overrides`): con el lector compartido de fechas escritas
 * (`lib/fechas/fecha-escrita.ts`, espejo del back) y el rango 2000–2100.
 *
 * Nico: «¿no tenemos parsers que solucionan eso? si no lo tenemos,
 * constrúyelos». La fecha se escribe como la escribe una persona.
 */
import { describe, expect, it } from 'vitest'
import {
  MENSAJES_DE_LOS_DOCUMENTOS,
  errorDeLaFechaDeVigencia,
  vigenciaComoIso,
} from './limites-de-los-documentos'

describe('errorDeLaFechaDeVigencia — espejo del back', () => {
  it('las frases son las del back, letra por letra', () => {
    expect(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigencia).toBe(
      'La fecha de vigencia no es un día real del calendario. Escríbela con el día primero, por ejemplo 01/12/2026.',
    )
    expect(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango).toBe(
      'La fecha de vigencia debe estar entre el año 2000 y el 2100.',
    )
  })

  it('un día real pasa, escrito como lo escriba la persona', () => {
    for (const escrita of [
      '2026-12-01',
      '2028-02-29',
      '01/12/2026',
      '1/12/26',
      '1 de diciembre de 2026',
      'dic 1 2026',
    ]) {
      expect(errorDeLaFechaDeVigencia(escrita, { terminada: true })).toBeNull()
    }
  })

  it('vacía o a medio escribir no opina mientras teclea', () => {
    expect(errorDeLaFechaDeVigencia('')).toBeNull()
    expect(errorDeLaFechaDeVigencia(undefined)).toBeNull()
    expect(errorDeLaFechaDeVigencia('2026-1')).toBeNull()
    expect(errorDeLaFechaDeVigencia('1/12')).toBeNull()
    expect(errorDeLaFechaDeVigencia('1 de dic')).toBeNull()
  })

  it('🔴 al salir del campo (o al generar) dice lo que falta, con un ejemplo', () => {
    expect(errorDeLaFechaDeVigencia('1/12', { terminada: true })).toBe(
      'A la fecha de vigencia le falta el año. Escríbela completa, por ejemplo 01/12/2026.',
    )
    expect(errorDeLaFechaDeVigencia('el otro mes', { terminada: true })).toBe(
      'No entendimos la fecha de vigencia «el otro mes». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    )
  })

  it('🔴 un día que no existe se dice de una (no tiene arreglo tecleando): la frase, no el 3 de marzo', () => {
    expect(errorDeLaFechaDeVigencia('2026-02-31')).toBe(
      'La fecha de vigencia no es un día real del calendario: febrero de 2026 tiene 28 días.',
    )
    expect(errorDeLaFechaDeVigencia('31/02/2026')).toBe(
      'La fecha de vigencia no es un día real del calendario: febrero de 2026 tiene 28 días.',
    )
    expect(errorDeLaFechaDeVigencia('12/25/2026')).toBe(
      'La fecha de vigencia no tiene un mes válido (25). En Colombia el día va primero: escríbela como 25/12/2026.',
    )
  })

  it('fuera de 2000–2100 dice el rango', () => {
    expect(errorDeLaFechaDeVigencia('1999-12-31')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango)
    expect(errorDeLaFechaDeVigencia('2101-01-01')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango)
    expect(errorDeLaFechaDeVigencia('31/12/1999')).toBe(MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango)
  })
})

describe('vigenciaComoIso — lo que viaja al back', () => {
  it('el día en AAAA-MM-DD, o null si no se entiende o está fuera de rango', () => {
    expect(vigenciaComoIso('1 de diciembre de 2026')).toBe('2026-12-01')
    expect(vigenciaComoIso('01/12/2026')).toBe('2026-12-01')
    expect(vigenciaComoIso('2026-12-01')).toBe('2026-12-01')
    expect(vigenciaComoIso('1/12')).toBeNull()
    expect(vigenciaComoIso('1999-12-31')).toBeNull()
    expect(vigenciaComoIso('')).toBeNull()
  })
})
