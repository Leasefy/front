/**
 * T-0163 (Anexo B4): el reparto de la factura entre los inquilinos de un
 * contrato. Lógica pura: el cálculo del reparto lo hace el back; acá sólo se
 * valida lo que la persona escribe. Datos inventados.
 */
import { describe, expect, it } from 'vitest'
import type { InquilinoDelContrato } from '@/lib/types/contract'
import {
  bpsDelTitular,
  hayRepartoDeLaFactura,
  motivoDelReparto,
  partesIguales,
  porcentajeDeTexto,
  repartoEstaDefinido,
  textoDelPorcentaje,
} from './reparto-de-la-factura'

const persona = (over: Partial<InquilinoDelContrato> = {}): InquilinoDelContrato => ({
  id: null,
  userId: null,
  nombre: 'Persona',
  documento: '1',
  email: null,
  telefono: null,
  esPrincipal: true,
  ...over,
})

describe('hayRepartoDeLaFactura (detección de un back nuevo)', () => {
  it('con un solo inquilino no hay nada que repartir', () => {
    expect(hayRepartoDeLaFactura([persona({ participacionBps: null })])).toBe(false)
  })
  it('un back viejo no manda la clave: se esconde la sección', () => {
    expect(hayRepartoDeLaFactura([persona(), persona({ id: 'ci-1', esPrincipal: false })])).toBe(false)
  })
  it('la clave presente, aun en null, la prende', () => {
    expect(
      hayRepartoDeLaFactura([
        persona({ participacionBps: null }),
        persona({ id: 'ci-1', esPrincipal: false, participacionBps: null }),
      ]),
    ).toBe(true)
  })
})

describe('repartoEstaDefinido', () => {
  it('todas null = sin reparto', () => {
    expect(
      repartoEstaDefinido([persona({ participacionBps: null }), persona({ id: 'a', participacionBps: null })]),
    ).toBe(false)
  })
  it('alguna con valor = definido', () => {
    expect(
      repartoEstaDefinido([persona({ participacionBps: 5000 }), persona({ id: 'a', participacionBps: 5000 })]),
    ).toBe(true)
  })
  it('un back viejo (sin la clave) nunca está definido', () => {
    expect(repartoEstaDefinido([persona(), persona({ id: 'a' })])).toBe(false)
  })
})

describe('partesIguales: el resto se lo lleva el titular', () => {
  it('2 -> 5000/5000', () => expect(partesIguales(2)).toEqual({ titular: 5000, otros: [5000] }))
  it('3 -> 3334 + 3333 + 3333', () =>
    expect(partesIguales(3)).toEqual({ titular: 3334, otros: [3333, 3333] }))
  it('7 suma 10000 exacto', () => {
    const r = partesIguales(7)
    expect(r.titular + r.otros.reduce((a, b) => a + b, 0)).toBe(10000)
    expect(r.titular).toBeGreaterThanOrEqual(r.otros[0])
  })
})

describe('bpsDelTitular', () => {
  it('es lo que queda de 100 %', () => expect(bpsDelTitular([3000, 2500])).toBe(4500))
  it('puede dar negativo, para poder decir por cuánto se pasó', () =>
    expect(bpsDelTitular([6000, 5000])).toBe(-1000))
})

describe('porcentajeDeTexto / textoDelPorcentaje (coma decimal)', () => {
  it('33,33 -> 3333', () => expect(porcentajeDeTexto('33,33')).toBe(3333))
  it('33.5 -> 3350', () => expect(porcentajeDeTexto('33.5')).toBe(3350))
  it('vacío o basura -> 0', () => {
    expect(porcentajeDeTexto('')).toBe(0)
    expect(porcentajeDeTexto('abc')).toBe(0)
    expect(porcentajeDeTexto('-5')).toBe(0)
  })
  it('3333 -> "33,33" y 5000 -> "50"', () => {
    expect(textoDelPorcentaje(3333)).toBe('33,33')
    expect(textoDelPorcentaje(5000)).toBe('50')
  })
})

describe('motivoDelReparto', () => {
  it('listo = null', () => expect(motivoDelReparto([5000])).toBeNull())
  it('un 0 pide un porcentaje', () =>
    expect(motivoDelReparto([0])).toBe('Cada inquilino necesita un porcentaje mayor a 0.'))
  it('si el titular se queda sin nada, dice cuánto suman los demás', () =>
    expect(motivoDelReparto([6000, 4000])).toBe(
      'Los demás inquilinos suman 100 %: al titular le tiene que quedar algo.',
    ))
  it('con 33,33 % repetido y el titular al resto, está bien', () =>
    expect(motivoDelReparto([3333, 3333])).toBeNull())
})
