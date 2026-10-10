import { describe, expect, it } from 'vitest'

import type { Contract } from '@/lib/types/contract'
import { hojaDeContratos, inquilinosDeLosContratos } from './exportar-contratos'

const c = (o: Partial<Contract>): Contract => ({ id: 'x', tenantId: null, tenantName: '', tenantDocument: '', ...o }) as Contract

describe('inquilinosDeLosContratos', () => {
  it('uno por persona: dos contratos del mismo inquilino mandan UN estado de cuenta', () => {
    const r = inquilinosDeLosContratos([
      c({ id: 'a', tenantId: 'u1', tenantName: 'Ana' }),
      c({ id: 'b', tenantId: 'u1', tenantName: 'Ana' }),
      c({ id: 'c', tenantId: null, tenantDocument: '1020', tenantName: 'Luis' }),
      c({ id: 'd', tenantId: null, tenantDocument: ' ', tenantName: 'Nadie' }),
    ])
    expect(r.clientes).toEqual([
      { id: 'u1', nombre: 'Ana', documento: null },
      { id: '1020', nombre: 'Luis', documento: '1020' },
    ])
    expect(r.sinInquilino).toBe(1)
  })
})

describe('hojaDeContratos', () => {
  it('una fila por contrato, «Sin inmueble» cuando no tiene', () => {
    const filas = hojaDeContratos(
      [c({ id: 'a', code: 7, tenantName: 'Ana', propertyId: null, monthlyRent: 1500000, startDate: '2026-01-01T00:00:00Z' })],
      () => 'Activo',
    )
    expect(filas[1]).toEqual(['7', 'Ana', '', '', 'Sin inmueble', '', 1500000, '2026-01-01', '', 'Activo'])
  })
})
