/**
 * QA-CONT-95 (B-30, CR-07, 04-10-2026): la ficha recibe la penalidad propia y
 * la fecha de cartera que el back ya manda en `GET /contracts/:id`.
 */
import { describe, it, expect } from 'vitest'
import { mapBackendContract } from '../contracts.service'

const base = {
  id: 'c1', status: 'ACTIVE', startDate: '2026-10-01T00:00:00.000Z', endDate: '2027-09-30T00:00:00.000Z',
  monthlyRent: 1_650_000, deposit: 0, paymentDay: 1, tenantName: 'Sofía', propertyAddress: 'Calle 95',
}

describe('mapBackendContract · QA-CONT-95', () => {
  it('🔴 la penalidad propia (Decimal como string) llega como número', () => {
    const c = mapBackendContract({ ...base, penalidadTerminacionCanones: '2.00' } as never)
    expect(c.penalidadTerminacionCanones).toBe(2)
  })
  it('🔴 la fecha de cartera llega como día', () => {
    const c = mapBackendContract({ ...base, fechaDeCartera: '2026-10-04T00:00:00.000Z' } as never)
    expect(c.fechaDeCartera).toBe('2026-10-04')
  })
  it('sin ellas: null (la de la inmobiliaria; desde el inicio)', () => {
    const c = mapBackendContract({ ...base } as never)
    expect(c.penalidadTerminacionCanones).toBeNull()
    expect(c.fechaDeCartera).toBeNull()
  })
})
