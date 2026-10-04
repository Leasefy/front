/**
 * «Por facturar»: qué se puede emitir hoy, qué no y por qué (QA-FACT,
 * 03-10-2026, con las decisiones de Nico de ese día).
 */
import { describe, it, expect } from 'vitest'

import type { FacturaDelMes } from '@/lib/api/facturacion-por-mes.service'
import {
  aQuienSeFactura,
  avisosDeLaFila,
  escenarioSinConfirmar,
  esperaElGiro,
  estadoDeLaFila,
  faltaEnLaBase,
  moraDelMes,
  numerosQueSalen,
  sePuedeEmitirHoy,
  seSugiere,
  sinLaRutaDeFacturacion,
  cuantos,
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
    terceroNombre: 'Juliana Sin Correo Patiño',
    terceroDocumento: null,
    lineas: [{ tipo: 'CANON', nombre: 'Canon', valorCop: 4_100_000, resta: false }],
    subtotalCop: 4_100_000,
    descuentoCop: 0,
    baseCop: 4_100_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 4_100_000,
    netoCop: 4_100_000,
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

const MORA = (dias: number) =>
  `Esta cuota está en mora hace ${dias} días y la factura NO lleva intereses. La inmobiliaria no tiene reglas de mora activas: no hay con qué liquidar el interés de esta cuota. Configúralas en Pagos → Cartera → Reglas de mora.`

describe('qué se puede emitir hoy', () => {
  it('🔴 Q5: sin escenario confirmado NO se emite (con el código del back o sin él)', () => {
    expect(sePuedeEmitirHoy(fila({ impuestosSinConfirmar: true }))).toBe(false)
    expect(
      sePuedeEmitirHoy(fila({ codigoNoEmitible: 'ESCENARIO_SIN_CONFIRMAR', emitible: false })),
    ).toBe(false)
    expect(estadoDeLaFila(fila({ impuestosSinConfirmar: true }))).toBe('sin-escenario')
    // La comisión depende del perfil de la inmobiliaria, no del escenario (como el back).
    expect(escenarioSinConfirmar(fila({ destinatario: 'PROPIETARIO', impuestosSinConfirmar: true }))).toBe(false)
  })

  it('🔴 FA-R13: la comisión que espera su giro no se emite ni se sugiere', () => {
    const giro = fila({
      destinatario: 'PROPIETARIO',
      emitible: false,
      codigoNoEmitible: 'GIRO_SIN_PAGAR',
      motivoNoEmitible: 'Se factura cuando se le gire.',
    })
    expect(esperaElGiro(giro)).toBe(true)
    expect(sePuedeEmitirHoy(giro)).toBe(false)
    expect(estadoDeLaFila(giro)).toBe('espera-el-giro')
    // Con un back que todavía no manda el código, por su frase.
    expect(
      esperaElGiro(fila({ destinatario: 'PROPIETARIO', emitible: false, motivoNoEmitible: 'Se factura cuando se le gire.' })),
    ).toBe(true)
  })

  it('🔴 FA-R13: sólo se sugiere lo de inquilinos; la comisión emitible se marca a mano', () => {
    expect(seSugiere(fila(), '2026-10')).toBe(true)
    expect(seSugiere(fila({ destinatario: 'PROPIETARIO' }), '2026-10')).toBe(false)
    expect(sePuedeEmitirHoy(fila({ destinatario: 'PROPIETARIO' }))).toBe(true)
    expect(seSugiere(fila({ mes: '2026-11' }), '2026-10')).toBe(false)
  })

  it('una GENERADA que una nota crédito dejó sin efecto se ve «anulada» y no se emite', () => {
    const f = fila({ estado: 'GENERADA', emitible: false, codigoNoEmitible: 'ANULADA_POR_NOTA_CREDITO' })
    expect(estadoDeLaFila(f)).toBe('anulada')
    expect(sePuedeEmitirHoy(f)).toBe(false)
  })

  it('la emitida es emitida, aunque el escenario dijera otra cosa', () => {
    expect(estadoDeLaFila(fila({ estado: 'EMITIDA', impuestosSinConfirmar: true }))).toBe('emitida')
  })
})

describe('copropiedad', () => {
  it('🔴 «Jorge · 70 %»; el 100 % no se dice', () => {
    expect(aQuienSeFactura(fila({ terceroNombre: 'Jorge', participacionBps: 7000 }))).toBe('Jorge · 70 %')
    expect(aQuienSeFactura(fila({ terceroNombre: 'Ana', participacionBps: 3333 }))).toBe('Ana · 33,33 %')
    expect(aQuienSeFactura(fila({ terceroNombre: 'Paula', participacionBps: 10_000 }))).toBe('Paula')
    expect(aQuienSeFactura(fila({ terceroNombre: 'Paula', participacionBps: null }))).toBe('Paula')
  })
})

describe('🔴 FA-03: la mora sin intereses, una vez', () => {
  it('saca el aviso de la fila y junta los motivos sin repetir', () => {
    const filas = [
      fila({ clave: 'a', avisos: [MORA(3)], mora: { esCartera: true, diasDeMora: 3, recargosCop: 0, origen: null, motivo: null } }),
      fila({ clave: 'b', avisos: [MORA(40), 'Otro aviso de la fila.'] }),
      fila({ clave: 'c', estado: 'EMITIDA', avisos: [MORA(10)] }),
    ]
    expect(avisosDeLaFila(filas[1])).toEqual(['Otro aviso de la fila.'])
    const mora = moraDelMes(filas)
    expect(mora.enMora).toBe(2)
    expect(mora.motivos).toHaveLength(1)
    expect(mora.motivos[0]).toContain('no tiene reglas de mora activas')
  })
})

describe('🔴 FA-08: sin «Cárgala en Facturación → Resolución» estando ahí', () => {
  it('quita esa oración y deja lo demás', () => {
    expect(
      sinLaRutaDeFacturacion(
        'La inmobiliaria no tiene ninguna resolución de facturación que numere «Canon del inquilino». Cárgala en Facturación → Resolución, eligiendo ese tipo de documento (o una resolución sin tipo, que numera todo).',
      ),
    ).toBe('La inmobiliaria no tiene ninguna resolución de facturación que numere «Canon del inquilino».')
    expect(sinLaRutaDeFacturacion('La resolución 999 venció.')).toBe('La resolución 999 venció.')
    expect(sinLaRutaDeFacturacion(null)).toBe('')
  })
})

describe('FA-09: los números que van a salir', () => {
  it('«LABQA-2» o «LABQA-2 a LABQA-31»', () => {
    expect(numerosQueSalen({ siguiente: 'LABQA-2' }, 1)).toBe('LABQA-2')
    expect(numerosQueSalen({ siguiente: 'LABQA-2' }, 30)).toBe('LABQA-2 a LABQA-31')
    expect(numerosQueSalen({ siguiente: null }, 3)).toBeNull()
  })
})

describe('textos', () => {
  it('FA-R27: lo que falta en la base, sin el id de la migración', () => {
    expect(faltaEnLaBase('La cola')).not.toMatch(/\d{8,}/)
  })
  it('plurales reales', () => {
    expect(cuantos(1, 'documento', 'documentos')).toBe('1 documento')
    expect(cuantos(1200, 'documento', 'documentos')).toBe('1.200 documentos')
  })
})
