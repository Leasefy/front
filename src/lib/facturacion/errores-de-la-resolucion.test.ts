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
