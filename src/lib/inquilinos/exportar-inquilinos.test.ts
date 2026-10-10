import { describe, expect, it } from 'vitest'

import { referenciaDelEstadoDeCuenta, type Inquilino } from '@/lib/api/inquilinos.service'
import { hojaDeInquilinos } from './exportar-inquilinos'

const p = (o: Partial<Inquilino>): Inquilino =>
  ({ tenantId: 'u1', nombre: 'Ana', email: null, telefono: null, documento: null, arriendos: [], ...o }) as Inquilino

describe('referenciaDelEstadoDeCuenta (I-12)', () => {
  it('la cuenta tal cual; una identidad sintética usa el documento; sin documento, null', () => {
    expect(referenciaDelEstadoDeCuenta(p({ tenantId: 'u1' }))).toBe('u1')
    expect(referenciaDelEstadoDeCuenta(p({ tenantId: 'doc:1020', documento: '1020' }))).toBe('1020')
    expect(referenciaDelEstadoDeCuenta(p({ tenantId: 'correo:a@b.co', documento: null }))).toBeNull()
  })
})

describe('hojaDeInquilinos', () => {
  it('una fila por arriendo, y una sola para quien no tiene contrato', () => {
    const filas = hojaDeInquilinos(
      [
        p({ tenantId: 'u1', tieneCuentaDelPortal: true, arriendos: [] }),
        p({
          tenantId: 'doc:9',
          nombre: 'Luis',
          documento: '9',
          tieneCuentaDelPortal: false,
          arriendos: [
            { leaseId: null, contractId: 'c1', estado: 'ACTIVE', desde: '2026-01-01', hasta: null, canonCop: 2000000, inmueble: { id: 'i', title: 'Apto', address: 'Cra 1', city: 'Medellín' } },
          ],
        }),
      ],
      '2026-10-10',
    )
    expect(filas).toHaveLength(3)
    expect(filas[1]).toEqual(['Ana', '', '', '', 'Sí', 'Sin contrato', '', '', '', '', ''])
    expect(filas[2]).toEqual(['Luis', '9', '', '', 'No', 'Cra 1', 'Medellín', 'Activo', 2000000, '2026-01-01', ''])
  })
})
