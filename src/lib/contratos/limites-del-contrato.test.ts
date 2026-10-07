/**
 * 02-10-2026 · El espejo de los topes del DTO del contrato
 * (`back/src/contracts/dto/limites-del-contrato.ts`): mismos números, mismas
 * frases. Lo que el back rechazaría con 400 se ataja acá antes de mandar.
 */
import { describe, it, expect } from 'vitest'
import {
  CANON_MAXIMO_COP,
  DEPOSITO_MAXIMO_COP,
  MENSAJES_DEL_CONTRATO as M,
  esDiaDelCalendario,
  revisarTerminosDelContrato,
} from './limites-del-contrato'

const BIEN = {
  startDate: '2026-11-01',
  endDate: '2027-10-31',
  monthlyRent: '2500000',
  deposit: '5000000',
  paymentDay: '5',
}

describe('revisarTerminosDelContrato — el espejo del DTO', () => {
  it('los términos bien escritos no tienen errores', () => {
    expect(revisarTerminosDelContrato(BIEN)).toEqual({})
  })

  it('🔴 un canon de once cifras dice la frase del back', () => {
    expect(revisarTerminosDelContrato({ ...BIEN, monthlyRent: '30000000000' })).toEqual({
      monthlyRent: 'El canon no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
    })
  })

  it('el borde exacto pasa; un peso más, no', () => {
    expect(revisarTerminosDelContrato({ ...BIEN, monthlyRent: String(CANON_MAXIMO_COP) })).toEqual({})
    expect(revisarTerminosDelContrato({ ...BIEN, monthlyRent: String(CANON_MAXIMO_COP + 1) }).monthlyRent).toBe(
      M.canonMaximo,
    )
    expect(revisarTerminosDelContrato({ ...BIEN, deposit: String(DEPOSITO_MAXIMO_COP) })).toEqual({})
    expect(revisarTerminosDelContrato({ ...BIEN, deposit: String(DEPOSITO_MAXIMO_COP + 1) }).deposit).toBe(
      M.depositoMaximo,
    )
  })

  it('el piso del canon y el día de pago dicen su frase', () => {
    expect(revisarTerminosDelContrato({ ...BIEN, monthlyRent: '50000' }).monthlyRent).toBe(M.canonMinimo)
    expect(revisarTerminosDelContrato({ ...BIEN, paymentDay: '31' }).paymentDay).toBe(M.diaDePago)
  })

  it('una fecha que no existe o fuera de 2000–2100 dice por qué', () => {
    expect(revisarTerminosDelContrato({ ...BIEN, startDate: '2026-02-30' }).startDate).toBe(M.fechaDeInicio)
    expect(revisarTerminosDelContrato({ ...BIEN, endDate: '2101-01-01' }).endDate).toBe(M.fechaDeFinFueraDeRango)
    expect(revisarTerminosDelContrato({ ...BIEN, startDate: '1999-12-31' }).startDate).toBe(
      M.fechaDeInicioFueraDeRango,
    )
  })

  it('la fecha de fin antes del inicio dice la misma frase que el 400 del back', () => {
    expect(revisarTerminosDelContrato({ ...BIEN, endDate: '2026-10-01' }).endDate).toBe(
      'La fecha de fin debe ser posterior a la de inicio.',
    )
  })

  it('lo vacío no se juzga acá: cada pantalla dice su «Requerido»', () => {
    expect(revisarTerminosDelContrato({})).toEqual({})
  })

  it('los topes caben en la columna int4 (2.147.483.647)', () => {
    expect(CANON_MAXIMO_COP).toBeLessThanOrEqual(2_147_483_647)
    expect(DEPOSITO_MAXIMO_COP).toBeLessThanOrEqual(2_147_483_647)
  })

  it('esDiaDelCalendario: igual que el validador del back', () => {
    expect(esDiaDelCalendario('2028-02-29')).toBe(true)
    expect(esDiaDelCalendario('2027-02-29')).toBe(false)
    expect(esDiaDelCalendario('2024-W05')).toBe(false)
  })
})
