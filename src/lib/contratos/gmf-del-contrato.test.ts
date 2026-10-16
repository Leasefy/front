import { describe, it, expect } from 'vitest'
import { eleccionDelGmf, opcionesDelGmf, textoDelGmf, valorDeLaEleccion } from './gmf-del-contrato'

const cobraElDueno = { porMil: 4, trasladaAlPropietario: true }
const laCasaLoAsume = { porMil: 4, trasladaAlPropietario: false }
const sinConfigurar = { porMil: null, trasladaAlPropietario: false }

describe('el 4x1000 del contrato (Juan, 15-10-2026)', () => {
  it('tres opciones que van y vuelven: «como la inmobiliaria» es null, no false', () => {
    for (const v of [true, false, null] as const) {
      expect(valorDeLaEleccion(eleccionDelGmf(v))).toBe(v)
    }
    expect(eleccionDelGmf(undefined)).toBe('inmobiliaria-decide')
  })

  it('la ficha dice qué rige hoy cuando el contrato no elige', () => {
    expect(textoDelGmf(null, cobraElDueno)).toBe('Como la inmobiliaria: lo paga el propietario')
    expect(textoDelGmf(null, laCasaLoAsume)).toBe('Como la inmobiliaria: lo asume la inmobiliaria')
    expect(textoDelGmf(true, laCasaLoAsume)).toBe('Lo paga el propietario: se descuenta de su giro')
    expect(textoDelGmf(false, cobraElDueno)).toBe('Lo asume la inmobiliaria')
  })

  it('sin 4x1000 configurado no promete un descuento que no va a pasar', () => {
    expect(textoDelGmf(true, sinConfigurar)).toContain('no se descuenta')
    expect(textoDelGmf(null, sinConfigurar)).toBe('No se descuenta: la inmobiliaria no tiene configurado el 4x1000')
  })

  it('un back anterior sin la configuración: lo que el contrato dice, o nada', () => {
    expect(textoDelGmf(null, undefined)).toBeNull()
    expect(textoDelGmf(true, undefined)).toBe('Lo paga el propietario: se descuenta de su giro')
  })

  it('la primera opción dice lo que rige hoy', () => {
    expect(opcionesDelGmf(cobraElDueno)[0].etiqueta).toBe('Como la inmobiliaria (hoy lo paga el propietario)')
    expect(opcionesDelGmf(undefined)[0].etiqueta).toBe('Como la inmobiliaria')
  })
})
