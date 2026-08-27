import { describe, it, expect } from 'vitest'
import { isoToInputDate } from './iso-to-input-date'

/**
 * Un contrato MIGRADO (T-0031) sin fechas queda en estado `DRAFT` (D3) —
 * el MISMO estado con el que arranca un contrato nativo, así que
 * `canEdit` (`status === 'draft'`) no lo excluye por status solo. El back
 * rechaza el `PATCH` (`rechazarSiEsMigrado`), pero esta pantalla igual
 * puede llegar a precargar el formulario con `contract.startDate === null`
 * antes de que el usuario intente guardar. `new Date(null).toISOString()`
 * no revienta — cae al epoch UNIX y precarga "1970-01-01" en el input,
 * silencioso y con total confianza.
 */
describe('isoToInputDate', () => {
  it('nunca precarga el epoch UNIX para una fecha ausente', () => {
    expect(isoToInputDate(null)).not.toContain('1970')
    expect(isoToInputDate(undefined)).not.toContain('1970')
  })

  it('devuelve string vacío para una fecha ausente', () => {
    expect(isoToInputDate(null)).toBe('')
    expect(isoToInputDate(undefined)).toBe('')
  })

  it('formatea una fecha real al formato de <input type="date">', () => {
    expect(isoToInputDate('2026-03-15T00:00:00.000Z')).toBe('2026-03-15')
  })
})
