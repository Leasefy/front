/**
 * F5: lo que está mal en la resolución se dice al lado del campo, con las
 * MISMAS cuatro reglas del back (`erroresDeLaResolucion` en
 * `resolucion-de-facturacion.ts`). Si estas dos listas se separan, la pantalla
 * deja pasar algo que el back rechaza —o frena algo que sí era válido—.
 */
import { describe, it, expect } from 'vitest'

import {
  erroresDeLaResolucion,
  hayErrores,
  type FormularioDeLaResolucion,
} from './errores-de-la-resolucion'
import {
  MENSAJES_DE_LA_FACTURACION,
  NUMERO_MAXIMO_DE_LA_RESOLUCION,
} from './limites-de-la-facturacion'

const VALIDO: FormularioDeLaResolucion = {
  desde: '1',
  hasta: '5000',
  vigenteDesde: '2026-01-15',
  vigenteHasta: '2028-01-15',
}

describe('erroresDeLaResolucion', () => {
  it('una resolución bien escrita no tiene nada que decir', () => {
    expect(erroresDeLaResolucion(VALIDO)).toEqual({})
    expect(hayErrores({})).toBe(false)
  })

  it('🔴 un campo TODAVÍA vacío no es un error: no se le grita a quien no terminó de escribir', () => {
    expect(
      erroresDeLaResolucion({
        desde: '',
        hasta: '',
        vigenteDesde: '',
        vigenteHasta: '',
      }),
    ).toEqual({})
  })

  it('el rango es de enteros mayores que cero', () => {
    expect(erroresDeLaResolucion({ ...VALIDO, desde: '0' }).desde).toContain(
      'mayor que cero',
    )
    expect(erroresDeLaResolucion({ ...VALIDO, desde: '-3' }).desde).toBeTruthy()
    expect(erroresDeLaResolucion({ ...VALIDO, hasta: '1,5' }).hasta).toBeTruthy()
    // `Number('1e3')` es 1000 y pasaría un `> 0` a secas: se mira el texto.
    expect(erroresDeLaResolucion({ ...VALIDO, hasta: '1e3' }).hasta).toBeTruthy()
  })

  it('🔴 el rango no termina antes de empezar, y lo dice con el número', () => {
    const e = erroresDeLaResolucion({ ...VALIDO, desde: '5000', hasta: '10' })
    expect(e.hasta).toContain('termina antes de empezar')
    expect(e.hasta).toContain('5.000')
    expect(hayErrores(e)).toBe(true)
  })

  it('🔴 la vigencia tampoco, y se compara como texto para no correr un día en Bogotá', () => {
    const e = erroresDeLaResolucion({
      ...VALIDO,
      vigenteDesde: '2028-01-15',
      vigenteHasta: '2026-01-15',
    })
    expect(e.vigenteHasta).toBe('La vigencia termina antes de empezar.')
  })

  it('un rango de un solo número es válido: desde y hasta pueden ser iguales', () => {
    expect(
      erroresDeLaResolucion({ ...VALIDO, desde: '100', hasta: '100' }),
    ).toEqual({})
  })

  it('una vigencia de un solo día también', () => {
    expect(
      erroresDeLaResolucion({
        ...VALIDO,
        vigenteDesde: '2026-01-15',
        vigenteHasta: '2026-01-15',
      }),
    ).toEqual({})
  })
})

/*
 * 02-10-2026 · Los topes del DTO del back, con sus MISMAS frases
 * (`limites-de-la-facturacion.ts`): lo que el back rechaza con un 400 se
 * ataja acá, al lado del campo, antes de mandar.
 */
describe('erroresDeLaResolucion — los topes del back (02-10)', () => {
  it('🔴 un rango con ceros de más se dice con la frase del back', () => {
    const e = erroresDeLaResolucion({ ...VALIDO, desde: '1', hasta: '15000000000' })
    expect(e.hasta).toBe(MENSAJES_DE_LA_FACTURACION.hastaMaximo)
    expect(
      erroresDeLaResolucion({ ...VALIDO, desde: '15000000000', hasta: '15000000001' }).desde,
    ).toBe(MENSAJES_DE_LA_FACTURACION.desdeMaximo)
  })

  it('el tope exacto (1.000.000.000) sí se puede mandar', () => {
    expect(
      erroresDeLaResolucion({
        ...VALIDO,
        desde: '1',
        hasta: String(NUMERO_MAXIMO_DE_LA_RESOLUCION),
        ultimoNumeroUsado: String(NUMERO_MAXIMO_DE_LA_RESOLUCION),
      }),
    ).toEqual({})
  })

  it('🔴 el último número usado: con ceros de más, fuera del rango o con coma', () => {
    expect(
      erroresDeLaResolucion({ ...VALIDO, ultimoNumeroUsado: '15000000000' }).ultimoNumeroUsado,
    ).toBe(MENSAJES_DE_LA_FACTURACION.ultimoNumeroUsadoMaximo)
    expect(erroresDeLaResolucion({ ...VALIDO, ultimoNumeroUsado: '6000' }).ultimoNumeroUsado).toBe(
      'El último número usado (6000) tiene que estar entre 0 y 5000.',
    )
    expect(erroresDeLaResolucion({ ...VALIDO, ultimoNumeroUsado: '1,5' }).ultimoNumeroUsado).toBeTruthy()
    expect(erroresDeLaResolucion({ ...VALIDO, ultimoNumeroUsado: '' })).toEqual({})
    expect(erroresDeLaResolucion({ ...VALIDO, ultimoNumeroUsado: '1200' })).toEqual({})
  })

  it('🔴 las fechas fuera de 2000–2100 se dicen con la frase del back', () => {
    const e = erroresDeLaResolucion({
      ...VALIDO,
      fechaResolucion: '1999-12-31',
      vigenteDesde: '1999-12-31',
      vigenteHasta: '2101-01-01',
    })
    expect(e.fechaResolucion).toBe(MENSAJES_DE_LA_FACTURACION.fechaDeLaResolucionFueraDeRango)
    expect(e.vigenteDesde).toBe(MENSAJES_DE_LA_FACTURACION.vigenteDesdeFueraDeRango)
    expect(e.vigenteHasta).toBe(MENSAJES_DE_LA_FACTURACION.vigenteHastaFueraDeRango)
  })
})
