import { describe, it, expect } from 'vitest'
import { inicialesDe, marcaDe, respaldanPrimero } from './marca'

describe('inicialesDe', () => {
  it('salta el relleno que llevan casi todas', () => {
    // «Seguros Bolívar» con las iniciales crudas daría «SB», que se lee como
    // otra compañía. La marca es Bolívar.
    expect(inicialesDe('Seguros Bolívar')).toBe('BO')
    expect(inicialesDe('La Previsora')).toBe('PR')
    expect(inicialesDe('La Equidad')).toBe('EQ')
  })

  it('una sola palabra da sus dos primeras letras', () => {
    expect(inicialesDe('Sura')).toBe('SU')
    expect(inicialesDe('Fianli')).toBe('FI')
    expect(inicialesDe('Mapfre')).toBe('MA')
  })

  it('siempre son dos letras', () => {
    // Con una queda un cuadrado anémico; con tres deja de leerse como marca.
    const nombres = [
      'Sura', 'Solidaria', 'Mapfre', 'Bolívar', 'La Previsora',
      'La Equidad', 'Mundial', 'Zurich', 'Sekure', 'Fianli',
      'Seguros Generales Suramericana',
    ]
    for (const n of nombres) {
      expect(inicialesDe(n), n).toHaveLength(2)
    }
  })

  it('distingue las que empiezan igual', () => {
    // Sura, Solidaria y Sekure conviven en el mismo panel.
    const s = ['Sura', 'Solidaria', 'Sekure'].map(inicialesDe)
    expect(new Set(s).size).toBe(3)
  })

  it('con dos palabras útiles toma una inicial de cada una', () => {
    expect(inicialesDe('Seguros Generales Suramericana')).toBe('GS')
  })

  it('no revienta con basura', () => {
    expect(inicialesDe('')).toBe('??')
    expect(inicialesDe('   ')).toBe('??')
    // Un nombre que es puro relleno: se cae al nombre crudo antes que al '??'.
    expect(inicialesDe('Seguros')).toBe('SE')
  })
})

describe('marcaDe', () => {
  it('las que tienen SVG oficial lo traen', () => {
    expect(marcaDe('Sura').logo).toBe('/aseguradoras/sura.svg')
    expect(marcaDe('Mapfre').logo).toBe('/aseguradoras/mapfre.svg')
    expect(marcaDe('La Equidad').logo).toBe('/aseguradoras/equidad.svg')
    expect(marcaDe('Zurich').logo).toBe('/aseguradoras/zurich.svg')
  })

  it('la clave no depende de mayúsculas ni de espacios sueltos', () => {
    expect(marcaDe('  SURA ').logo).toBe('/aseguradoras/sura.svg')
    expect(marcaDe('la equidad').logo).toBe('/aseguradoras/equidad.svg')
  })

  it('reconoce a Bolívar escriba como escriba el agente', () => {
    // `CARRIER_DISPLAY` manda 'Bolívar', pero el respaldo local y los fixtures
    // dicen 'Seguros Bolívar'. Las dos formas tienen que dar el mismo logo.
    for (const n of ['Bolívar', 'Seguros Bolívar', 'seguros bolivar']) {
      expect(marcaDe(n).logo, n).toBe('/aseguradoras/bolivar.png')
    }
  })

  it('«La Previsora» y «Previsora» son la misma', () => {
    expect(marcaDe('La Previsora').logo).toBe('/aseguradoras/previsora.png')
    expect(marcaDe('Previsora').logo).toBe('/aseguradoras/previsora.png')
  })

  it('las que no lo tienen caen al monograma, no a un logo inventado', () => {
    // Aproximar el logo de una empresa real es peor que un monograma limpio.
    // Mundial quedó afuera por su licencia CC BY-SA; Sekure ni siquiera
    // aparece como aseguradora colombiana (ver PROCEDENCIA.md).
    expect(marcaDe('Mundial').logo).toBeUndefined()
    expect(marcaDe('Mundial').iniciales).toBe('MU')
    expect(marcaDe('Sekure').logo).toBeUndefined()
  })

  it('siempre trae iniciales, tenga logo o no', () => {
    // El monograma es el respaldo si el SVG no carga.
    for (const n of ['Sura', 'Mapfre', 'Seguros Bolívar', 'Sekure']) {
      expect(marcaDe(n).iniciales, n).toHaveLength(2)
    }
  })
})

describe('respaldanPrimero', () => {
  it('la buena noticia va adelante', () => {
    const orden = respaldanPrimero([
      { nombre: 'Sura', aprobada: false },
      { nombre: 'Bolívar', aprobada: true },
      { nombre: 'Previsora', aprobada: false },
      { nombre: 'Fianli', aprobada: true },
    ]).map((a) => a.nombre)
    expect(orden).toEqual(['Bolívar', 'Fianli', 'Sura', 'Previsora'])
  })

  it('dentro de cada grupo conserva el orden del agente', () => {
    // No inventamos un ranking entre aseguradoras que aprobaron igual.
    const orden = respaldanPrimero([
      { nombre: 'A', aprobada: true },
      { nombre: 'B', aprobada: true },
      { nombre: 'C', aprobada: true },
    ]).map((a) => a.nombre)
    expect(orden).toEqual(['A', 'B', 'C'])
  })

  it('no muta la lista que recibe', () => {
    const original = [{ nombre: 'X', aprobada: false }, { nombre: 'Y', aprobada: true }]
    respaldanPrimero(original)
    expect(original[0].nombre).toBe('X')
  })
})
