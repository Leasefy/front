import { describe, it, expect } from 'vitest'

import type { GiroDelPropietario } from '@/lib/api/portal-del-propietario.service'
import {
  avanceDelContrato,
  fraseDelGiroDelMes,
  fraseDelMesDelInquilino,
  giradoEnElAnio,
  teGiraronAunqueNoPago,
} from './el-mes-del-contrato'

const giro = (mes: string, estado: GiroDelPropietario['estado'], valorCop = 1_000_000): GiroDelPropietario => ({
  id: mes,
  inmobiliaria: 'Portofino',
  mes,
  valorCop,
  estado,
  giradoEl: null,
  banco: null,
  cuenta: null,
  referencia: null,
  devolucion: null,
})

describe('en qué mes del contrato va', () => {
  it('un año del 1 de marzo al 28 de febrero, a 21 de octubre: mes 8 de 12', () => {
    expect(avanceDelContrato('2026-03-01', '2027-02-28', '2026-10-21')).toEqual({ mes: 8, de: 12 })
  })
  it('a mitad de mes cuenta el mes del contrato, no el del calendario', () => {
    expect(avanceDelContrato('2026-03-15', '2027-03-14', '2026-04-10')).toEqual({ mes: 1, de: 12 })
    expect(avanceDelContrato('2026-03-15', '2027-03-14', '2026-04-15')).toEqual({ mes: 2, de: 12 })
  })
  it('sin fechas, por empezar o ya terminado: no inventa un avance', () => {
    expect(avanceDelContrato(null, '2027-02-28', '2026-10-21')).toBeNull()
    expect(avanceDelContrato('2026-11-01', '2027-10-31', '2026-10-21')).toBeNull()
    expect(avanceDelContrato('2025-01-01', '2025-12-31', '2026-10-21')).toBeNull()
  })
})

describe('el mes del inquilino y el giro', () => {
  it('vencido sin pagar, en rojo', () => {
    const f = fraseDelMesDelInquilino({ mes: '2026-10', estado: 'VENCIDO', pagadoEl: null, vence: '2026-10-05', pagadoCop: 0, pendienteCop: 1_850_000 })
    expect(f.tono).toBe('peligro')
    expect(f.texto).toContain('No ha pagado octubre')
  })
  it('el giro del mes: ya te giró, en camino, devuelto o todavía no', () => {
    expect(fraseDelGiroDelMes([giro('2026-10', 'GIRADO')], '2026-10')?.texto).toBe('Ya te giró octubre de 2026')
    expect(fraseDelGiroDelMes([giro('2026-10', 'EN_CAMINO')], '2026-10')?.texto).toContain('va en camino')
    expect(fraseDelGiroDelMes([giro('2026-10', 'DEVUELTO')], '2026-10')?.tono).toBe('peligro')
    expect(fraseDelGiroDelMes([giro('2026-09', 'GIRADO')], '2026-10')?.texto).toBe('Todavía no te gira octubre de 2026')
  })
  it('sin poder leer los giros no se dice nada del giro', () => {
    expect(fraseDelGiroDelMes(null, '2026-10')).toBeNull()
  })
  it('«no ha pagado pero ya te giraron» sólo cuando pasan las dos cosas', () => {
    const vencido = { mes: '2026-10', estado: 'VENCIDO' as const, pagadoEl: null, vence: '2026-10-05', pagadoCop: 0, pendienteCop: 1 }
    expect(teGiraronAunqueNoPago(vencido, [giro('2026-10', 'GIRADO')])).toBe(true)
    expect(teGiraronAunqueNoPago(vencido, [giro('2026-10', 'EN_CAMINO')])).toBe(false)
    expect(teGiraronAunqueNoPago({ ...vencido, estado: 'PAGADO' }, [giro('2026-10', 'GIRADO')])).toBe(false)
  })
  it('lo girado en el año suma girados y vueltos a girar; el devuelto no cuenta', () => {
    const giros = [giro('2026-01', 'GIRADO'), giro('2026-02', 'REGIRADO'), giro('2026-03', 'DEVUELTO'), giro('2025-12', 'GIRADO')]
    expect(giradoEnElAnio(giros, '2026-10-21')).toBe(2_000_000)
  })
})
