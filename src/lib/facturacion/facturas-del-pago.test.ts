/**
 * T-0163: con la factura dividida entre los inquilinos, un recibo trae UNA
 * entrada por inquilino para el mismo contrato y mes (distinto `facturaId`).
 * El resumen del pago habla de MESES, no de entradas: «octubre quedó pagado»,
 * «a octubre le quedan $ X», nunca el mismo mes dos veces.
 */
import { describe, expect, it } from 'vitest'
import type { FacturaDelPago } from '@/lib/api/recibos-de-caja.types'
import { resumenDeLasFacturasDelPago } from './facturas-del-pago'

const f = (over: Partial<FacturaDelPago> = {}): FacturaDelPago => ({
  facturaId: 'f-1',
  contractId: 'c-1',
  mes: '2026-10',
  estado: 'GENERADA',
  numero: null,
  totalCop: 1_000_000,
  netoCop: 1_000_000,
  abonadoCop: 1_000_000,
  saldoCop: 0,
  generadaAhora: true,
  ...over,
})

describe('resumenDeLasFacturasDelPago', () => {
  it('un mes normal: una entrada, como siempre', () => {
    expect(resumenDeLasFacturasDelPago([f()])).toEqual({ pagados: ['2026-10'], conSaldo: [] })
  })

  it('un mes dividido y pagado: octubre UNA vez, no dos', () => {
    const r = resumenDeLasFacturasDelPago([
      f({ facturaId: 'a', participacionBps: 5000 }),
      f({ facturaId: 'b', participacionBps: 5000, contratoInquilinoId: 'ci-1' }),
    ])
    expect(r.pagados).toEqual(['2026-10'])
    expect(r.conSaldo).toEqual([])
  })

  it('un mes dividido con saldo: se suma lo que falta de las dos partes', () => {
    const r = resumenDeLasFacturasDelPago([
      f({ facturaId: 'a', saldoCop: 300_000, abonadoCop: 200_000 }),
      f({ facturaId: 'b', saldoCop: 200_000, abonadoCop: 300_000, contratoInquilinoId: 'ci-1' }),
    ])
    expect(r.pagados).toEqual([])
    expect(r.conSaldo).toEqual([{ mes: '2026-10', saldoCop: 500_000 }])
  })

  it('una parte pagada y otra con saldo: el mes NO está pagado', () => {
    const r = resumenDeLasFacturasDelPago([
      f({ facturaId: 'a', saldoCop: 0 }),
      f({ facturaId: 'b', saldoCop: 100_000, contratoInquilinoId: 'ci-1' }),
    ])
    expect(r.pagados).toEqual([])
    expect(r.conSaldo).toEqual([{ mes: '2026-10', saldoCop: 100_000 }])
  })

  it('meses distintos conservan el orden de aparición', () => {
    const r = resumenDeLasFacturasDelPago([
      f({ facturaId: 'a', mes: '2026-09' }),
      f({ facturaId: 'b', mes: '2026-10', saldoCop: 50_000 }),
      f({ facturaId: 'c', mes: '2026-09', contratoInquilinoId: 'ci-1' }),
    ])
    expect(r.pagados).toEqual(['2026-09'])
    expect(r.conSaldo).toEqual([{ mes: '2026-10', saldoCop: 50_000 }])
  })

  it('dos contratos con el mismo mes siguen siendo UN mes en el texto (se habla de meses)', () => {
    const r = resumenDeLasFacturasDelPago([
      f({ facturaId: 'a', contractId: 'c-1' }),
      f({ facturaId: 'b', contractId: 'c-2' }),
    ])
    expect(r.pagados).toEqual(['2026-10'])
  })
})
