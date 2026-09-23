import { describe, it, expect } from 'vitest'
import {
  lineaDelInmueble,
  mensajeDeUnaOpcion,
  primerNombre,
} from './el-mensaje-para-el-interesado'

describe('el mensaje para el interesado', () => {
  it('🔴 el puntaje NUNCA sale en el mensaje', () => {
    const texto = mensajeDeUnaOpcion('Ana Pérez', {
      titulo: 'Apto 301',
      barrio: 'Laureles',
      ciudad: 'Medellín',
      canonCop: 2_500_000,
      administracionCop: 320_000,
      porQue: ['Le cabe en el presupuesto', 'Está en la zona que pidió'],
    })
    expect(texto).not.toMatch(/\d+\s*%/)
    expect(texto).not.toMatch(/puntaje|calza \d/i)
  })

  it('saluda por el primer nombre, no por el nombre de la cédula', () => {
    expect(primerNombre('ANA MARÍA PÉREZ GÓMEZ')).toBe('Ana')
    expect(primerNombre('  juan  ')).toBe('Juan')
    expect(primerNombre('')).toBe('')
    expect(mensajeDeUnaOpcion('ANA MARÍA PÉREZ', { titulo: 'X', porQue: [] })).toContain(
      'Hola, Ana.',
    )
  })

  it('sin canon no escribe una línea de plata: nada de «$0»', () => {
    const linea = lineaDelInmueble({ titulo: 'Apto 301', canonCop: null, porQue: [] })
    expect(linea).toBe('Apto 301')
    expect(linea).not.toContain('$')
  })

  it('una administración en cero no se nombra', () => {
    const linea = lineaDelInmueble({
      titulo: 'Apto 301',
      canonCop: 2_000_000,
      administracionCop: 0,
      porQue: [],
    })
    expect(linea).toContain('$2.000.000 al mes')
    expect(linea).not.toContain('administración')
  })

  it('la zona sale sólo con lo que se sabe', () => {
    expect(lineaDelInmueble({ titulo: 'A', barrio: null, ciudad: 'Medellín', porQue: [] })).toBe(
      'A · Medellín',
    )
    expect(lineaDelInmueble({ titulo: 'A', barrio: 'Laureles', ciudad: null, porQue: [] })).toBe(
      'A · Laureles',
    )
  })

  it('las razones van literales, una por línea', () => {
    const texto = mensajeDeUnaOpcion('Ana', {
      titulo: 'Apto 301',
      canonCop: 1_000_000,
      porQue: ['Le cabe en el presupuesto', 'Queda en Laureles, que fue lo que pidió'],
    })
    expect(texto).toContain('· Le cabe en el presupuesto')
    expect(texto).toContain('· Queda en Laureles, que fue lo que pidió')
  })

  it('sin nombre de la agencia no firma con uno inventado', () => {
    const sinFirma = mensajeDeUnaOpcion('Ana', { titulo: 'A', porQue: [] })
    expect(sinFirma.trimEnd().endsWith('cuando puedas.')).toBe(true)
    const conFirma = mensajeDeUnaOpcion('Ana', { titulo: 'A', porQue: [] }, 'Portofino')
    expect(conFirma).toContain('— Portofino')
  })
})
