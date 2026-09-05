/**
 * La vigencia de un contrato no se corre un día.
 *
 * Lo encontré mirando la pantalla con datos reales: diez contratos cargados y
 * los diez con la vigencia un día antes. Uno que arranca el 1 de mayo de 2026 y
 * vence el 30 de abril de 2027 se leía «30 de abr de 2026 → 29 de abr de 2027».
 *
 * Ningún test lo veía porque el runner corre en UTC, donde el corrimiento no
 * existe. Por eso acá la zona se ancla a Bogotá: sin eso, este test pasa igual
 * con el bug puesto y no sirve para nada.
 */

import { describe, expect, it } from 'vitest'
import { fechaDeVigencia, formatearVigencia, SIN_FECHA } from './fecha-de-vigencia'

/** Formatea en Bogotá sin depender de la zona de la máquina que corre el test. */
function diaEnBogota(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit' })
}

describe('fechaDeVigencia — un día es un día, no un instante', () => {
  it.each([
    ['2026-05-01', 2026, 4, 1],
    ['2027-04-30', 2027, 3, 30],
    ['2026-01-15', 2026, 0, 15],
    ['2026-12-14', 2026, 11, 14],
    ['2026-01-01', 2026, 0, 1],
  ])('%s cae en el día del calendario, no en el anterior', (iso, anio, mes, dia) => {
    const f = fechaDeVigencia(iso)!
    expect(f.getFullYear()).toBe(anio)
    expect(f.getMonth()).toBe(mes)
    expect(f.getDate()).toBe(dia)
  })

  it('el bug original: 2026-05-01 con `new Date` sí se corre en Bogotá', () => {
    // Deja constancia de POR QUÉ existe el helper. Si algún día esto deja de
    // ser cierto, el helper sobra y este test lo va a decir.
    expect(diaEnBogota(new Date('2026-05-01'))).toBe('30')
    expect(diaEnBogota(fechaDeVigencia('2026-05-01')!)).toBe('01')
  })

  it('un ISO con hora sigue siendo un instante y se convierte como tal', () => {
    const f = fechaDeVigencia('2026-05-01T15:00:00.000Z')!
    expect(f.toISOString()).toBe('2026-05-01T15:00:00.000Z')
  })

  it('sin fecha no hay fecha', () => {
    expect(fechaDeVigencia(null)).toBeNull()
    expect(fechaDeVigencia(undefined)).toBeNull()
    expect(fechaDeVigencia('')).toBeNull()
  })

  it('una fecha que no se entiende no revienta ni dice «Invalid Date»', () => {
    expect(fechaDeVigencia('mañana')).toBeNull()
  })
})

describe('formatearVigencia — lo que se muestra en la tabla', () => {
  it('muestra el día correcto', () => {
    expect(formatearVigencia('2026-05-01', 'es')).toContain('01')
    expect(formatearVigencia('2027-04-30', 'es')).toContain('30')
  })

  it('sin fecha muestra el guion', () => {
    expect(formatearVigencia(null, 'es')).toBe(SIN_FECHA)
    expect(formatearVigencia(undefined, 'es')).toBe(SIN_FECHA)
  })

  it('lo ilegible se muestra tal cual en vez de «Invalid Date»', () => {
    expect(formatearVigencia('mañana', 'es')).toBe('mañana')
  })
})
