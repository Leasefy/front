/**
 * Acá es donde los datos se pierden EN SILENCIO.
 *
 * Un `$` que vuelve NaN se guarda como canon 0 —el contrato queda cobrando
 * nada— y una fecha leída al formato de EE.UU. corre el arriendo un mes.
 * Ninguna de las dos cosas da un error: se ven como números y fechas
 * perfectamente válidos.
 */

import { describe, it, expect } from 'vitest'

import { comoEntero, comoFecha, comoPeriodicidad, comoUso, hayValor, textoOpcional } from './leer-celdas'

describe('plata que viene de una hoja de cálculo', () => {
  it('lee «$ 2.400.000» como 2400000, no como NaN', () => {
    expect(comoEntero('$ 2.400.000')).toBe(2_400_000)
  })

  it.each([
    ['2400000', 2_400_000],
    ['2.400.000', 2_400_000],
    ['$2400000', 2_400_000],
    ['COP 1.800.000', 1_800_000],
    [2_400_000, 2_400_000],
  ])('«%s» → %i', (entrada, esperado) => {
    expect(comoEntero(entrada)).toBe(esperado)
  })

  it('no confunde los puntos de miles con decimales', () => {
    // Si `2.400.000` se leyera como 2.4 el contrato cobraría dos pesos.
    expect(comoEntero('2.400.000')).toBeGreaterThan(1_000_000)
  })

  it('una celda vacía da 0, no NaN', () => {
    expect(comoEntero('')).toBe(0)
    expect(comoEntero(null)).toBe(0)
    expect(comoEntero(undefined)).toBe(0)
  })
})

describe('fechas colombianas', () => {
  it('«03/04/2026» es 3 de abril, no 4 de marzo', () => {
    // `new Date('03/04/2026')` devuelve el 4 de MARZO: el contrato entero se
    // corre un mes y nada falla.
    expect(comoFecha('03/04/2026')).toBe('2026-04-03')
  })

  it('«01/02/2025» es 1 de febrero', () => {
    expect(comoFecha('01/02/2025')).toBe('2025-02-01')
  })

  it('acepta guiones igual que barras', () => {
    expect(comoFecha('15-03-2025')).toBe('2025-03-15')
  })

  it('deja pasar el formato ISO sin tocarlo', () => {
    expect(comoFecha('2025-03-15')).toBe('2025-03-15')
  })

  it('una fecha de Excel que llega como Date se respeta', () => {
    expect(comoFecha(new Date('2025-06-30T00:00:00Z'))).toBe('2025-06-30')
  })
})

describe('uso del inmueble', () => {
  it.each([
    ['Local comercial', 'COMERCIAL'],
    ['COMERCIAL', 'COMERCIAL'],
    ['Oficina', 'COMERCIAL'],
    ['Bodega', 'COMERCIAL'],
    ['Vivienda', 'VIVIENDA'],
    ['Habitacional', 'VIVIENDA'],
  ])('«%s» → %s', (entrada, esperado) => {
    expect(comoUso(entrada)).toBe(esperado)
  })

  it('ante la duda va a vivienda, que es la que NO cobra IVA', () => {
    // Equivocarse hacia comercial le cobra a alguien un 19% que no debe, y esa
    // plata ya salió de su bolsillo cuando alguien lo note.
    expect(comoUso('')).toBe('VIVIENDA')
    expect(comoUso(null)).toBe('VIVIENDA')
    expect(comoUso('lo que sea')).toBe('VIVIENDA')
  })
})

describe('texto opcional', () => {
  it('una celda vacía es ausencia, no una cadena vacía', () => {
    // Guardar '' como teléfono se ve igual que tener el teléfono: la ficha
    // muestra un campo en blanco en vez de decir que falta.
    expect(textoOpcional('')).toBeUndefined()
    expect(textoOpcional('   ')).toBeUndefined()
    expect(textoOpcional(null)).toBeUndefined()
  })

  it('conserva el valor cuando lo hay, sin espacios de más', () => {
    expect(textoOpcional('  3105551234 ')).toBe('3105551234')
  })
})

describe('hayValor', () => {
  it('una columna que no mapeó a nada (undefined) no tiene valor', () => {
    expect(hayValor(undefined)).toBe(false)
  })

  it('una columna mapeada con la celda vacía tampoco tiene valor', () => {
    expect(hayValor('')).toBe(false)
    expect(hayValor('   ')).toBe(false)
    expect(hayValor(null)).toBe(false)
  })

  it('cualquier otra cosa sí tiene valor, incluido el número 0', () => {
    expect(hayValor('algo')).toBe(true)
    expect(hayValor(0)).toBe(true)
  })
})

describe('periodicidad', () => {
  it.each([
    ['Mensual', 'MENSUAL'],
    ['bimestral', 'BIMESTRAL'],
    ['Trimestral', 'TRIMESTRAL'],
    ['SEMESTRAL', 'SEMESTRAL'],
    ['anual', 'ANUAL'],
  ])('«%s» → %s', (entrada, esperado) => {
    expect(comoPeriodicidad(entrada)).toBe(esperado)
  })

  it('lo que no reconoce queda sin definir, no inventa "mensual"', () => {
    // El back ya tiene su propio default para cuando falta — duplicarlo acá
    // dejaría dos lugares decidiendo lo mismo y uno de los dos se desactualiza.
    expect(comoPeriodicidad('')).toBeUndefined()
    expect(comoPeriodicidad(null)).toBeUndefined()
    expect(comoPeriodicidad('cada dos meses')).toBeUndefined()
  })
})
