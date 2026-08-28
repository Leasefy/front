/**
 * Acá es donde los datos se pierden EN SILENCIO.
 *
 * Un `$` que vuelve NaN, o un separador de miles leído al revés, corren el
 * canon o la fecha sin que nada falle: se ven como números y fechas
 * perfectamente válidos. La regla dura: lo que no se puede leer da
 * `undefined`, NUNCA un valor inventado (0, una fecha truncada) — `0` es un
 * canon legítimo (un arriendo gratuito existe), y confundirlo con "no se
 * pudo leer" es lo que anula la protección del back (`canonDesconocido`,
 * que sólo se activa cuando el campo llega ausente).
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

  // Formato anglosajón del export real del owner: coma de miles, punto
  // decimal. `.replace(/\.(?=\d{3}\b)/g,'')` + `.replace(',', '.')` del código
  // viejo dejaba el `.00` decimal y convertía la coma de miles en un segundo
  // punto decimal — `Number('570.000.00')` es NaN. 1365 filas reales
  // quedaron en canon 0 por esto.
  it.each([
    ['$570,000.00', 570_000],
    ['$550,000.00', 550_000],
    ['$1,250,000.00', 1_250_000],
    ['1,234,567.89', 1_234_568],
    ['1234567.89', 1_234_568],
  ])('formato anglosajón «%s» → %i', (entrada, esperado) => {
    expect(comoEntero(entrada)).toBe(esperado)
  })

  it('sigue leyendo el formato europeo: miles con punto, decimales con coma', () => {
    expect(comoEntero('1.234.567,89')).toBe(1_234_568)
    expect(comoEntero('570.000,00')).toBe(570_000)
  })

  it('un entero sin separadores no cambia', () => {
    expect(comoEntero('1234567')).toBe(1_234_567)
  })

  it('decimales con coma en un número corto, sin separador de miles', () => {
    expect(comoEntero('1234,50')).toBe(1_235) // Math.round(1234.5)
  })

  it('negativos', () => {
    expect(comoEntero('-45000')).toBe(-45_000)
    expect(comoEntero('-570.000,00')).toBe(-570_000)
  })

  it('un valor que ya es number se redondea y respeta', () => {
    expect(comoEntero(2_400_000.4)).toBe(2_400_000)
  })

  // El defecto real: NUNCA fabricar un 0. Una celda ausente o un texto que no
  // se puede leer como plata deben volver `undefined`, para que
  // `armar-fila.ts` mande el campo AUSENTE y el back pueda marcarlo faltante
  // en vez de darlo por un contrato que cobra $0.
  it('una celda ausente da undefined, no 0', () => {
    expect(comoEntero('')).toBeUndefined()
    expect(comoEntero(null)).toBeUndefined()
    expect(comoEntero(undefined)).toBeUndefined()
  })

  it('texto que no es plata da undefined, no 0', () => {
    expect(comoEntero('N/A')).toBeUndefined()
    expect(comoEntero('pendiente')).toBeUndefined()
    expect(comoEntero('-')).toBeUndefined()
  })

  it('un number no finito da undefined, no 0', () => {
    expect(comoEntero(NaN)).toBeUndefined()
    expect(comoEntero(Infinity)).toBeUndefined()
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

  // Mismo defecto que comoEntero: el `s.slice(0, 10)` viejo convertía CUALQUIER
  // texto no reconocido en un string de 10 caracteres con forma de fecha —
  // "15 de marzo" se volvía "15 de marz", una fecha inventada que ni siquiera
  // es válida, y que además choca contra `@IsDateString()` en el back y tira
  // TODO el lote con 400 en vez de marcar sólo esa fila como faltante.
  it('texto que no es una fecha reconocible da undefined, no un slice inventado', () => {
    expect(comoFecha('15 de marzo de 2025')).toBeUndefined()
    expect(comoFecha('N/A')).toBeUndefined()
    expect(comoFecha('pendiente')).toBeUndefined()
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
