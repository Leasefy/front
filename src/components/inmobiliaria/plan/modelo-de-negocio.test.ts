import { describe, expect, it } from 'vitest'

import { renglonesDeLaCuenta } from './CuentaDelPlan'
import { preciosDeLeasefy } from './PreciosDeLeasefy'
import type { CotizacionDelPlan } from '@/lib/conversion/acceso'
import type { TarifasDeLeasefy } from '@/lib/api/tarifas.service'

/** Las tarifas tal como las manda el back (`GET /config/tarifas`, 30-10-2026). */
const TARIFAS: TarifasDeLeasefy = {
  vigente: true,
  estudioDelInquilinoGratis: true,
  cobroDelRecaudo: true,
  ejemplos: [],
  tarifas: {
    plan: { porInmueble: 2_100, minimoMensual: 99_000, usuariosIncluidos: 2, usuarioAdicional: 20_000, preguntasIncluidas: 50 },
    cuentaGratis: { preguntas: 5 },
    recargas: [
      { preguntas: 50, precio: 29_000 },
      { preguntas: 200, precio: 99_000 },
      { preguntas: 500, precio: 199_000 },
    ],
    recargaDuraMeses: 12,
    pilotoAutomatico: { porInmueble: 900, pruebaDias: 30 },
    laura: { exitoBps: 800 },
    estudioDelInquilino: { precio: 21_000 },
    avaluo: { precioConIva: 50_000 },
    recaudo: { porPago: 1_250 },
    propietariosSinInmobiliaria: { gestionBps: 500 },
    implementacion: { conLeasefy: 1_000_000 },
    facturacionElectronica: {
      paquetes: [
        { documentos: 100, precio: 35_000 },
        { documentos: 500, precio: 99_000 },
        { documentos: 1_000, precio: 169_000 },
        { documentos: 5_000, precio: 650_000 },
      ],
      duranMeses: 12,
    },
    firmas: {
      porDocumento: 3_900,
      firmantesPorDocumento: 5,
      gratisAlCrearLaCuenta: 3,
      paquetes: [
        { firmas: 10, precio: 29_000 },
        { firmas: 50, precio: 119_000 },
        { firmas: 200, precio: 399_000 },
      ],
      duranMeses: 12,
    },
    ivaBps: 1_900,
  },
}

const sinEspacioDuro = (s: string) => s.replace(/ /g, ' ')

function cotizacion(o: Partial<CotizacionDelPlan>): CotizacionDelPlan {
  return { tier: 'pro', nombre: 'Pro', monto: 690_000, porInmueble: true, inmuebles: 300, usuarios: 5, desglose: { plan: 630_000, usuariosDeMas: 3, usuariosAdicionales: 60_000, piloto: 0, conPilotoAutomatico: false }, ...o }
}

describe('la cuenta del mes (Nico, 30-10-2026: «cobramos por inmueble gestionado y con todas sus condiciones»)', () => {
  it('300 inmuebles y 5 usuarios: el plan por inmueble, los 3 usuarios de más y las 50 preguntas incluidas', () => {
    const r = renglonesDeLaCuenta(cotizacion({}), TARIFAS.tarifas)
    expect(r.map((x) => [x.id, x.valor])).toEqual([
      ['plan', 630_000],
      ['usuarios', 60_000],
      ['preguntas', 0],
    ])
    expect(r[0]!.que).toBe('300 inmuebles activos')
    expect(sinEspacioDuro(r[0]!.detalle!)).toBe('$ 2.100 cada uno al mes')
    expect(sinEspacioDuro(r[1]!.detalle!)).toBe('Tienes 5 y el plan trae 2; $ 20.000 cada uno al mes')
  })

  it('con pocos inmuebles: el mínimo, con la cuenta de por qué', () => {
    const r = renglonesDeLaCuenta(
      cotizacion({ monto: 99_000, inmuebles: 20, usuarios: 2, desglose: { plan: 99_000, usuariosDeMas: 0, usuariosAdicionales: 0, piloto: 0, conPilotoAutomatico: false } }),
      TARIFAS.tarifas,
    )
    expect(r[0]).toMatchObject({ id: 'plan', que: 'El mínimo del plan', valor: 99_000 })
    expect(sinEspacioDuro(r[0]!.detalle!)).toContain('hasta 47 inmuebles pagas $ 99.000')
    expect(r[1]).toMatchObject({ id: 'usuarios', que: '2 usuarios', valor: 0 })
  })

  it('con el piloto automático contratado, su línea de $900 por inmueble', () => {
    const r = renglonesDeLaCuenta(
      cotizacion({ monto: 900_000, desglose: { plan: 630_000, usuariosDeMas: 0, usuariosAdicionales: 0, piloto: 270_000, conPilotoAutomatico: true } }),
      TARIFAS.tarifas,
    )
    expect(r.find((x) => x.id === 'piloto')).toMatchObject({ que: 'Piloto automático', valor: 270_000 })
  })

  it('con precio fijo (sin desglose) no inventa líneas', () => {
    expect(renglonesDeLaCuenta(cotizacion({ porInmueble: false, desglose: null }), TARIFAS.tarifas)).toEqual([])
  })
})

describe('lo que se cobra aparte: TODO el modelo de negocio, desde las tarifas del back', () => {
  const grupos = preciosDeLeasefy(TARIFAS)
  const precio = (id: string) => sinEspacioDuro(grupos.flatMap((g) => g.precios).find((p) => p.id === id)?.precio ?? '')
  const detalle = (id: string) => sinEspacioDuro(grupos.flatMap((g) => g.precios).find((p) => p.id === id)?.detalle ?? '')

  it('trae cada cosa que se cobra, con su precio', () => {
    expect(grupos.map((g) => g.id)).toEqual(['equipo', 'plata', 'documentos', 'captar', 'una-vez'])
    expect(precio('usuario-adicional')).toBe('$ 20.000 al mes')
    expect(precio('recargas')).toBe('Desde $ 29.000')
    expect(detalle('recargas')).toContain('50 por $ 29.000 · 200 por $ 99.000 · 500 por $ 199.000')
    expect(precio('piloto')).toBe('+ $ 900 por inmueble al mes')
    expect(detalle('piloto')).toContain('30 días gratis')
    expect(precio('mori')).toBe('8 % de lo recuperado')
    // Nico 31-10: $1.250 + IVA por pago, descontado del pago; sin Wompi y sin giros.
    expect(precio('recaudo')).toBe('$ 1.250 + IVA por pago')
    expect(detalle('recaudo')).toContain('Se descuenta del mismo pago')
    expect(detalle('recaudo')).not.toContain('Wompi')
    expect(grupos.flatMap((x) => x.precios).find((p) => p.id === 'giro')).toBeUndefined()
    expect(precio('firmas')).toBe('$ 3.900 por documento')
    expect(detalle('firmas')).toContain('Tu cuenta trae 3 gratis')
    expect(precio('facturacion')).toBe('Desde $ 35.000')
    expect(detalle('facturacion')).toContain('5.000 por $ 650.000')
    expect(precio('avaluo')).toBe('$ 50.000 con IVA')
    expect(precio('estudio')).toBe('Gratis por ahora')
    expect(precio('implementacion')).toBe('$ 1.000.000')
  })

  it('el estudio con precio cuando se vuelve a cobrar', () => {
    const g = preciosDeLeasefy({ ...TARIFAS, estudioDelInquilinoGratis: false })
    expect(sinEspacioDuro(g.flatMap((x) => x.precios).find((p) => p.id === 'estudio')!.precio)).toBe('$ 21.000 cada uno')
  })

  it('un back anterior (sin firmas, facturación ni lo de Wompi) no inventa nada', () => {
    const { firmas: _f, facturacionElectronica: _fe, ...resto } = TARIFAS.tarifas
    const g = preciosDeLeasefy({ ...TARIFAS, tarifas: { ...resto, recaudo: { porPago: 1_250 } } })
    expect(g.map((x) => x.id)).toEqual(['equipo', 'plata', 'captar', 'una-vez'])
    expect(g.flatMap((x) => x.precios).find((p) => p.id === 'recaudo')!.detalle).not.toContain('Wompi')
  })
})
