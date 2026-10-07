/**
 * QA de la migración (QA-MIG-A, MG-25): el faltante dice lo que de verdad
 * le pasa a la fila.
 */
import { describe, it, expect } from 'vitest'

import { explicacionDe, EXPLICACION } from './FaltantesDeFila'

describe('explicacionDe', () => {
  it('sin fecha de fin dice que falta, no que «no es posterior a la de inicio»', () => {
    const e = explicacionDe({ datos: { startDate: '2026-01-20' } }, 'fechas')
    expect(e?.titulo).toBe('Falta la fecha de terminación')
  })

  it('sin las dos fechas lo dice en plural', () => {
    expect(explicacionDe({ datos: {} }, 'fechas')?.titulo).toBe('Faltan las fechas del contrato')
  })

  it('con las dos fechas mal ordenadas sigue el texto de siempre', () => {
    const e = explicacionDe({ datos: { startDate: '2026-05-01', endDate: '2026-01-01' } }, 'fechas')
    expect(e).toEqual(EXPLICACION.fechas)
  })

  it('un canon ilegible («2.1M») no se presenta como «en cero»', () => {
    expect(explicacionDe({ datos: {} }, 'canon')?.titulo).toBe('Falta el canon')
    expect(explicacionDe({ datos: { monthlyRent: 0 } }, 'canon')).toEqual(EXPLICACION.canon)
  })
})
