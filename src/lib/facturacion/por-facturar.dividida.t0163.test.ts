/**
 * T-0163 (Anexo B5): un mes de un contrato con varios inquilinos sale en N
 * facturas, una por inquilino, cada una por su parte. Cómo se agrupan, qué se
 * selecciona junto y cómo se lee un back que no sabe de esto. Datos inventados.
 */
import { describe, it, expect } from 'vitest'

import type { FacturaDelMes } from '@/lib/api/facturacion-por-mes.service'
import {
  aQuienSeFactura,
  estadoDeLaFila,
  expandirALasHermanas,
  hermanasDeLaFila,
  motivoCorto,
  porQueNoSeEmite,
  rutaDeLasPartesDelContrato,
  sePuedeEmitirHoy,
} from './por-facturar'

function fila(over: Partial<FacturaDelMes> = {}): FacturaDelMes {
  return {
    clave: 'ct-1|2026-10|INQUILINO',
    cuotaId: 'cu-1',
    contractId: 'ct-1',
    codigo: 1,
    numeroExterno: null,
    inmueble: 'Apto 302',
    mes: '2026-10',
    destinatario: 'INQUILINO',
    terceroId: null,
    terceroNombre: 'Titular Uno',
    terceroDocumento: '111',
    lineas: [{ tipo: 'CANON', nombre: 'Canon', valorCop: 1_260_504, resta: false }],
    subtotalCop: 1_260_504,
    descuentoCop: 0,
    baseCop: 1_260_504,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 1_260_504,
    netoCop: 1_260_504,
    impuestos: [],
    impuestosSinConfirmar: false,
    notasTributarias: [],
    escenario: null,
    estado: 'POR_EMITIR',
    numero: null,
    numeroDian: null,
    diasFacturados: 31,
    diasDelMes: 31,
    deduccionAlEgresoCop: 0,
    emitible: true,
    motivoNoEmitible: null,
    avisos: [],
    ...over,
  }
}

const titular = (over: Partial<FacturaDelMes> = {}) =>
  fila({ contratoInquilinoId: null, participacionBps: 5000, ...over })
const coarrendatario = (over: Partial<FacturaDelMes> = {}) =>
  fila({
    clave: 'ct-1|2026-10|INQUILINO|ci-1',
    contratoInquilinoId: 'ci-1',
    participacionBps: 5000,
    terceroNombre: 'Coarrendatario Dos',
    terceroDocumento: '222',
    ...over,
  })
const otroContrato = () =>
  fila({ clave: 'ct-9|2026-10|INQUILINO', contractId: 'ct-9', cuotaId: 'cu-9', terceroNombre: 'Otra Persona' })
const comision = () =>
  fila({ clave: 'ct-1|2026-10|PROPIETARIO', destinatario: 'PROPIETARIO', terceroNombre: 'Dueño' })

describe('aQuienSeFactura con una parte', () => {
  it('«nombre · pct %» también en el lado del inquilino', () => {
    expect(aQuienSeFactura(titular({ participacionBps: 3334 }))).toBe('Titular Uno · 33,34 %')
    expect(aQuienSeFactura(coarrendatario({ participacionBps: 3333 }))).toBe('Coarrendatario Dos · 33,33 %')
  })
  it('sin reparto (null) o con un back anterior (ausente) es sólo el nombre', () => {
    expect(aQuienSeFactura(fila({ participacionBps: null }))).toBe('Titular Uno')
    expect(aQuienSeFactura(fila())).toBe('Titular Uno')
  })
})

describe('hermanasDeLaFila', () => {
  const todas = [titular(), coarrendatario(), otroContrato(), comision()]

  it('las del mismo contrato, mes y lado inquilino, la propia incluida y en el orden de la lista', () => {
    expect(hermanasDeLaFila(todas[1], todas).map((f) => f.clave)).toEqual([
      'ct-1|2026-10|INQUILINO',
      'ct-1|2026-10|INQUILINO|ci-1',
    ])
  })
  it('una fila sola no tiene hermanas (sólo ella misma)', () => {
    expect(hermanasDeLaFila(todas[2], todas)).toEqual([todas[2]])
  })
  it('la comisión del propietario no entra: es otro lado', () => {
    expect(hermanasDeLaFila(todas[3], todas)).toEqual([todas[3]])
  })
  it('otro mes del mismo contrato no es hermana', () => {
    const otroMes = fila({ clave: 'ct-1|2026-11|INQUILINO', mes: '2026-11', cuotaId: 'cu-2' })
    expect(hermanasDeLaFila(todas[0], [...todas, otroMes]).map((f) => f.clave)).not.toContain(otroMes.clave)
  })
  it('un back anterior (un solo inquilino por mes) deja todo como hoy', () => {
    const viejo = [fila(), otroContrato()]
    expect(hermanasDeLaFila(viejo[0], viejo)).toEqual([viejo[0]])
  })
})

describe('expandirALasHermanas: marcar una marca a las demás', () => {
  const todas = [titular(), coarrendatario(), otroContrato()]

  it('elegir la del coarrendatario suma al titular', () => {
    const r = expandirALasHermanas(['ct-1|2026-10|INQUILINO|ci-1'], todas)
    expect([...r].sort()).toEqual(['ct-1|2026-10|INQUILINO', 'ct-1|2026-10|INQUILINO|ci-1'])
  })
  it('no toca otros contratos', () => {
    const r = expandirALasHermanas(['ct-9|2026-10|INQUILINO'], todas)
    expect([...r]).toEqual(['ct-9|2026-10|INQUILINO'])
  })
  it('una hermana que no se puede emitir NO se mete a la selección', () => {
    const bloqueada = coarrendatario({ emitible: false, codigoNoEmitible: 'DIVISION_NO_CUADRA' })
    const r = expandirALasHermanas(['ct-1|2026-10|INQUILINO'], [titular(), bloqueada])
    expect([...r]).toEqual(['ct-1|2026-10|INQUILINO'])
  })
  it('una clave desconocida se conserva tal cual', () => {
    expect([...expandirALasHermanas(['x'], todas)]).toEqual(['x'])
  })
})

describe('códigos nuevos del back: nunca una pantalla muda', () => {
  const NUEVOS = [
    'INQUILINOS_PERFIL_TRIBUTARIO_DISTINTO',
    'DIVISION_BLOQUEADA_POR_OTRO_INQUILINO',
    'DIVISION_SIN_MIGRACION',
    'DIVISION_CON_CESION_DEL_INQUILINO',
    'DIVISION_NO_CUADRA',
  ] as const

  it.each(NUEVOS)('%s no se emite y muestra el texto del back tal cual', (codigo) => {
    const f = coarrendatario({
      emitible: false,
      codigoNoEmitible: codigo,
      motivoNoEmitible: `Texto del back para ${codigo}`,
    })
    expect(sePuedeEmitirHoy(f)).toBe(false)
    expect(estadoDeLaFila(f)).toBe('todavia-no')
    expect(porQueNoSeEmite(f)).toBe(`Texto del back para ${codigo}`)
    expect(motivoCorto(f)).toBeTruthy()
  })

  it('un código que esta versión no conoce igual muestra el texto del back', () => {
    const f = coarrendatario({
      emitible: false,
      codigoNoEmitible: 'ALGO_NUEVO' as never,
      motivoNoEmitible: 'Porque sí, dice el back.',
    })
    expect(sePuedeEmitirHoy(f)).toBe(false)
    expect(porQueNoSeEmite(f)).toBe('Porque sí, dice el back.')
  })
})

describe('rutaDeLasPartesDelContrato (INQUILINO_SIN_TIPO_DE_DOCUMENTO de un coarrendatario)', () => {
  it('lleva a las partes del contrato', () => {
    expect(rutaDeLasPartesDelContrato(coarrendatario())).toBe(
      '/panel/inmobiliaria/contratos/ct-1#partes-del-contrato',
    )
  })
})
