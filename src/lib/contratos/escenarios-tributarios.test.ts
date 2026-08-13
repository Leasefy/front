/**
 * Los impuestos no dan error cuando están mal: dan una factura equivocada, y
 * eso no se ve hasta la declaración. Estos tests fijan las cuatro reglas que
 * deciden el número, incluidas las que hacen que NO haya impuesto.
 */

import { describe, it, expect } from 'vitest'

import {
  liquidar,
  perfilPorDefecto,
  TARIFAS_2026,
  type PerfilTributario,
} from './escenarios-tributarios'
import { CONCEPTOS, CONCEPTOS_FRECUENTES, conceptoPorId } from './conceptos'

const natural = perfilPorDefecto('NATURAL')
const inmobiliaria: PerfilTributario = {
  tipoPersona: 'JURIDICA',
  responsableIva: true,
  agenteRetenedorRenta: true,
  agenteRetenedorIva: true,
  agenteRetenedorIca: true,
}

const CANON = 2_000_000

describe('quién paga decide la retención', () => {
  // La regla que contó Juan, y la razón de ser de todo esto.
  it('entre dos personas naturales NO hay retención', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: natural,
      recibe: natural,
    })
    expect(r.renglones.find((x) => x.concepto === 'RETENCION_RENTA')).toBeUndefined()
    expect(r.netoQueRecibeCop).toBe(CANON)
    expect(r.motivos.join(' ')).toContain('no es agente retenedor')
  })

  it('si el que paga es una empresa, sí hay retención del 3,5%', () => {
    // Empresa que retiene renta pero NO ICA: así el neto aísla la regla que se
    // está probando en vez de arrastrar el ReteICA municipal.
    const empresaSoloRenta: PerfilTributario = { ...inmobiliaria, agenteRetenedorIca: false }
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: empresaSoloRenta,
      recibe: natural,
    })
    const rf = r.renglones.find((x) => x.concepto === 'RETENCION_RENTA')
    expect(rf?.valorCop).toBe(-70_000) // 3,5% de 2.000.000
    expect(r.netoQueRecibeCop).toBe(CANON - 70_000)
  })

  // Depende de QUIEN PAGA, no de quién recibe: es el error fácil de cometer
  // al leer la regla al revés.
  it('no depende de quién recibe: empresa que cobra a persona natural no lleva retención', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: natural,
      recibe: inmobiliaria,
    })
    expect(r.renglones.find((x) => x.concepto === 'RETENCION_RENTA')).toBeUndefined()
  })

  it('no retiene por debajo de la base mínima de 10 UVT', () => {
    const chico = 400_000 // < 10 UVT (523.740)
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: chico,
      uso: 'VIVIENDA',
      paga: inmobiliaria,
      recibe: natural,
    })
    expect(r.renglones.find((x) => x.concepto === 'RETENCION_RENTA')).toBeUndefined()
    expect(r.motivos.join(' ')).toContain('no llega al mínimo')
  })
})

describe('el uso del inmueble decide el IVA', () => {
  // Art. 476 num. 5 ET. Es la regla que más plata mueve del módulo.
  it('vivienda va sin IVA', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: inmobiliaria,
      recibe: inmobiliaria,
    })
    expect(r.renglones.find((x) => x.concepto === 'IVA')).toBeUndefined()
    expect(r.motivos.join(' ')).toContain('excluido')
  })

  it('el mismo canon, comercial, lleva IVA del 19%', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'COMERCIAL',
      paga: natural,
      recibe: inmobiliaria,
    })
    expect(r.renglones.find((x) => x.concepto === 'IVA')?.valorCop).toBe(380_000)
    expect(r.totalAPagarCop).toBe(2_380_000)
  })

  it('sin IVA si quien cobra no es responsable, aunque sea comercial', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'COMERCIAL',
      paga: inmobiliaria,
      recibe: natural,
    })
    expect(r.renglones.find((x) => x.concepto === 'IVA')).toBeUndefined()
  })
})

describe('ReteIVA', () => {
  it('se calcula sobre el IVA, no sobre la base', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'COMERCIAL',
      paga: inmobiliaria,
      recibe: inmobiliaria,
    })
    const reteIva = r.renglones.find((x) => x.concepto === 'RETE_IVA')
    // 15% de 380.000 (el IVA) = 57.000. Sobre la base daría 300.000.
    expect(reteIva?.valorCop).toBe(-57_000)
    expect(reteIva?.sobreCop).toBe(380_000)
  })

  it('no existe cuando no hay IVA', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: inmobiliaria,
      recibe: inmobiliaria,
    })
    expect(r.renglones.find((x) => x.concepto === 'RETE_IVA')).toBeUndefined()
  })
})

describe('comisiones', () => {
  it('retienen al 11%, no al 3,5% del arrendamiento', () => {
    const r = liquidar({
      base: 'COMISION',
      baseCop: 1_000_000,
      uso: 'VIVIENDA',
      paga: inmobiliaria,
      recibe: inmobiliaria,
    })
    expect(r.renglones.find((x) => x.concepto === 'RETENCION_RENTA')?.porcentaje).toBe(11)
    // Y una comisión SÍ lleva IVA aunque el inmueble sea de vivienda: lo
    // excluido es el arrendamiento, no el servicio inmobiliario.
    expect(r.renglones.find((x) => x.concepto === 'IVA')?.valorCop).toBe(190_000)
  })
})

describe('la cuenta cierra', () => {
  it('las retenciones no las paga quien paga: las descuenta de lo que entrega', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'COMERCIAL',
      paga: inmobiliaria,
      recibe: inmobiliaria,
    })
    const iva = 380_000
    const rf = 70_000
    const reteIva = 57_000
    const reteIca = 16_000 // 0,8% de 2.000.000
    expect(r.totalAPagarCop).toBe(CANON + iva)
    expect(r.netoQueRecibeCop).toBe(CANON + iva - rf - reteIva - reteIca)
  })

  it('un concepto no gravado no mueve ningún impuesto', () => {
    const r = liquidar({
      base: 'NO_GRAVADO',
      baseCop: 500_000,
      uso: 'COMERCIAL',
      paga: inmobiliaria,
      recibe: inmobiliaria,
    })
    expect(r.renglones).toEqual([])
    expect(r.totalAPagarCop).toBe(500_000)
    expect(r.netoQueRecibeCop).toBe(500_000)
  })

  it('siempre explica por qué, incluso cuando no hay impuesto', () => {
    const r = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: natural,
      recibe: natural,
    })
    // Un cobro sin IVA y un cobro al que se le olvidó el IVA se ven igual en la
    // factura: la diferencia sólo existe si está escrita.
    expect(r.motivos.length).toBeGreaterThan(0)
    expect(r.renglones).toEqual([])
  })
})

describe('una persona natural no se asume agente retenedor', () => {
  it('el perfil por defecto de una natural no retiene ni cobra IVA', () => {
    const p = perfilPorDefecto('NATURAL')
    expect(p.agenteRetenedorRenta).toBe(false)
    expect(p.responsableIva).toBe(false)
  })

  it('asumir lo contrario descontaría plata que nadie puede consignar', () => {
    const conElDefecto = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: CANON,
      uso: 'VIVIENDA',
      paga: perfilPorDefecto('NATURAL'),
      recibe: natural,
    })
    expect(conElDefecto.netoQueRecibeCop).toBe(CANON)
  })
})

describe('el catálogo de conceptos', () => {
  it('no arrastra las lápidas del catálogo viejo', () => {
    const muertos = CONCEPTOS.filter((c) => /no utilizar/i.test(c.nombre))
    expect(muertos).toEqual([])
  })

  it('tiene un solo canon de arrendamiento, no nueve', () => {
    const canones = CONCEPTOS.filter((c) => /^canon de arrendamiento/i.test(c.nombre))
    expect(canones).toHaveLength(1)
    // Y no lleva el combo tributario en el nombre.
    expect(canones[0].nombre).not.toMatch(/iva|reten|retei/i)
  })

  it('no repite ids', () => {
    const ids = CONCEPTOS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('los frecuentes existen de verdad', () => {
    for (const id of CONCEPTOS_FRECUENTES) {
      expect(conceptoPorId(id), `falta el concepto "${id}"`).toBeDefined()
    }
  })

  it('las tarifas por defecto son las que la inmobiliaria ya tenía', () => {
    // Salen de su propio catálogo: migrar no puede cambiar ni un peso.
    expect(TARIFAS_2026.ivaPorcentaje).toBe(19)
    expect(TARIFAS_2026.rfArrendamientoPorcentaje).toBe(3.5)
    expect(TARIFAS_2026.rfComisionPorcentaje).toBe(11)
    expect(TARIFAS_2026.reteIvaPorcentaje).toBe(15)
    expect(TARIFAS_2026.reteIcaPorcentaje).toBe(0.8)
  })
})
