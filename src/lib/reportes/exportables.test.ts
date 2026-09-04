import { describe, it, expect } from 'vitest'
import { comoSeBaja, nombreDelArchivo, rutaDeExport, sePuedeBajar } from './exportables'

describe('exportables — rentabilidad por inmueble', () => {
  it('se puede bajar y mapea a su propio tipo, no a otro reporte', () => {
    const como = comoSeBaja('rentabilidad-inmueble')
    expect(como.disponible).toBe(true)
    if (como.disponible) expect(como.tipo).toBe('rentabilidad-inmueble')
    expect(sePuedeBajar('rentabilidad-inmueble')).toBe(true)
  })

  it('los que no existen en el back siguen sin prometer', () => {
    expect(sePuedeBajar('rendimiento-agentes')).toBe(false)
    expect(sePuedeBajar('extractos-propietarios')).toBe(false)
  })
})

describe('rutaDeExport', () => {
  it('sin parámetros es el default del back', () => {
    expect(rutaDeExport('cartera-edades')).toBe('/inmobiliaria/reports/export?type=cartera-edades')
  })

  it('manda sólo los parámetros con valor', () => {
    expect(rutaDeExport('rentabilidad-inmueble', { desde: '2026-01', hasta: '2026-06' })).toBe(
      '/inmobiliaria/reports/export?type=rentabilidad-inmueble&desde=2026-01&hasta=2026-06',
    )
    expect(rutaDeExport('rentabilidad-inmueble', { desde: undefined, hasta: '' })).toBe(
      '/inmobiliaria/reports/export?type=rentabilidad-inmueble',
    )
  })
})

describe('nombreDelArchivo', () => {
  it('tipo-fecha.csv', () => {
    expect(nombreDelArchivo('rentabilidad-inmueble', '2026-09-02')).toBe('rentabilidad-inmueble-2026-09-02.csv')
  })
})
