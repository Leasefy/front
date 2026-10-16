import { describe, expect, it } from 'vitest'
import { construirPrefillWA, prefillDeLaCuotaVencida } from './wa-prefill'

describe('prefillDeLaCuotaVencida', () => {
  // QA-AGENTES 16-10 (MORI-7, lab): el recordatorio pedía escribir a mano el
  // mes, la fecha y el monto aunque el caso ya los tiene (contrato #1894,
  // agosto vencido el 1 por $1.400.000).
  it('mes, vencimiento y saldo de la cuota más vieja, como los pide la plantilla', () => {
    expect(prefillDeLaCuotaVencida({ periodo: '2026-08', vence: '2026-08-01', saldoCop: 1_400_000 })).toEqual({
      overdue_month: 'agosto',
      due_date: '1 de agosto',
      amount_cop: '1.400.000',
    })
  })

  it('sin período, el mes sale del vencimiento; un saldo con centavos los conserva', () => {
    expect(prefillDeLaCuotaVencida({ periodo: null, vence: '2026-12-05', saldoCop: 1_234_567.5 })).toEqual({
      overdue_month: 'diciembre',
      due_date: '5 de diciembre',
      amount_cop: '1.234.567,5',
    })
  })

  it('sin cuota, nada (los campos quedan para escribir)', () => {
    expect(prefillDeLaCuotaVencida(null)).toEqual({})
    expect(prefillDeLaCuotaVencida({ periodo: 'x', vence: 'roto', saldoCop: 0 })).toEqual({})
  })
})

describe('construirPrefillWA', () => {
  it('nombre del deudor e inmobiliaria en las dos familias de nombres', () => {
    expect(construirPrefillWA({ debtorName: 'Prueba Mori Mora', agencyName: 'Portofino' })).toEqual({
      debtor_first_name: 'Prueba',
      deudor: 'Prueba',
      agency_name: 'Portofino',
      nombre_inmobiliaria: 'Portofino',
    })
  })
})
