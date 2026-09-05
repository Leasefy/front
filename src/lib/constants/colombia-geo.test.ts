import { describe, it, expect } from 'vitest'
import {
  CIUDADES_DE_COLOMBIA,
  COLOMBIA_DEPARTAMENTOS,
  DEPARTAMENTO_NOMBRES,
  etiquetaDeCiudad,
  municipiosDe,
} from './colombia-geo'

describe('colombia-geo dataset', () => {
  it('has 33 departamentos (32 official + Bogotá D.C.)', () => {
    expect(COLOMBIA_DEPARTAMENTOS).toHaveLength(33)
  })

  it('includes Bogotá D.C. as its own departamento with itself as the only municipio', () => {
    const bogota = COLOMBIA_DEPARTAMENTOS.find((d) => d.nombre === 'Bogotá D.C.')
    expect(bogota).toBeDefined()
    expect(bogota?.municipios).toEqual(['Bogotá D.C.'])
  })

  it('does NOT list Bogotá as a municipio of Cundinamarca (it is a separate capital district)', () => {
    const cundinamarca = municipiosDe('Cundinamarca')
    expect(cundinamarca).not.toContain('Bogotá')
    expect(cundinamarca).not.toContain('Bogotá D.C.')
  })

  it('resolves known municipios by exact departamento name', () => {
    expect(municipiosDe('Antioquia')).toContain('Medellín')
    expect(municipiosDe('Valle del Cauca')).toContain('Cali')
    expect(municipiosDe('Atlántico')).toContain('Barranquilla')
  })

  it('returns an empty array for an unknown/empty departamento', () => {
    expect(municipiosDe('Narnia')).toEqual([])
    expect(municipiosDe('')).toEqual([])
  })

  it('has no duplicate municipios within any departamento', () => {
    for (const d of COLOMBIA_DEPARTAMENTOS) {
      const unique = new Set(d.municipios)
      expect(unique.size, `duplicate municipio in ${d.nombre}`).toBe(d.municipios.length)
    }
  })

  it('every departamento has at least one municipio', () => {
    for (const d of COLOMBIA_DEPARTAMENTOS) {
      expect(d.municipios.length, `${d.nombre} has no municipios`).toBeGreaterThan(0)
    }
  })

  it('exposes departamento names sorted alphabetically (es-CO)', () => {
    const collator = new Intl.Collator('es-CO', { sensitivity: 'base' })
    const sorted = [...DEPARTAMENTO_NOMBRES].sort((a, b) => collator.compare(a, b))
    expect(DEPARTAMENTO_NOMBRES).toEqual(sorted)
  })
})

describe("CIUDADES_DE_COLOMBIA", () => {
  it("no repite un nombre de ciudad: el valor del selector tiene que ser único", () => {
    const nombres = CIUDADES_DE_COLOMBIA.map((c) => c.ciudad)
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  it("sale de COLOMBIA_DEPARTAMENTOS y no de una segunda lista escrita a mano", () => {
    const delOrigen = new Set(COLOMBIA_DEPARTAMENTOS.flatMap((d) => d.municipios))
    expect(CIUDADES_DE_COLOMBIA.length).toBe(delOrigen.size)
    for (const c of CIUDADES_DE_COLOMBIA) expect(delOrigen.has(c.ciudad)).toBe(true)
  })

  it("guarda TODOS los departamentos de un nombre repetido", () => {
    // Albania existe en La Guajira, Caquetá y Santander: una sola fila, tres deptos.
    const albania = CIUDADES_DE_COLOMBIA.find((c) => c.ciudad === "Albania")!
    expect(albania.departamentos.length).toBeGreaterThan(1)
    expect(albania.departamentos).toContain("La Guajira")
  })

  it("trae las ciudades grandes y va ordenada es-CO", () => {
    const nombres = CIUDADES_DE_COLOMBIA.map((c) => c.ciudad)
    for (const ciudad of ["Bogotá D.C.", "Medellín", "Cali", "Barranquilla", "Envigado"]) {
      expect(nombres).toContain(ciudad)
    }
    expect([...nombres].sort((a, b) => a.localeCompare(b, "es-CO"))).toEqual(nombres)
  })

  it("la etiqueta lleva el departamento, que es por donde el Combobox busca", () => {
    const envigado = CIUDADES_DE_COLOMBIA.find((c) => c.ciudad === "Envigado")!
    expect(etiquetaDeCiudad(envigado)).toBe("Envigado · Antioquia")
  })
})
