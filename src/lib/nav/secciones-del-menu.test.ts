import { describe, it, expect } from 'vitest'
import { agruparEnSecciones, leerSecciones, resumenDeSeccion, estaAbierta } from './secciones-del-menu'
import { filterAgencyNav } from './agency-nav-filter'

const f = (href: string, extra: Record<string, unknown> = {}) => ({ href, label: href, ...extra })

describe('agruparEnSecciones', () => {
  it('lo de antes de la primera cabecera queda suelto; cada cabecera se lleva sus filas', () => {
    const b = agruparEnSecciones([f('/a'), f('#sec-x', { kind: 'section' }), f('/b'), f('/c')])
    expect(b.map((x) => [x.tipo, x.filas.map((r) => r.href)])).toEqual([
      ['sueltas', ['/a']],
      ['seccion', ['/b', '/c']],
    ])
  })
  it('una fila `suelta` corta la sección (el pie: Reportes no cuelga de Directorio)', () => {
    const b = agruparEnSecciones([f('#sec-d', { kind: 'section' }), f('/p'), f('/reportes', { suelta: true })])
    expect(b.map((x) => x.tipo)).toEqual(['seccion', 'sueltas'])
    expect(b[1]!.filas[0]!.href).toBe('/reportes')
  })
  it('una cabecera sin filas no se pinta', () => {
    const b = agruparEnSecciones([f('#sec-a', { kind: 'section' }), f('#sec-b', { kind: 'section' }), f('/x')])
    expect(b).toHaveLength(1)
    expect(b[0]!.tipo === 'seccion' && b[0]!.clave).toBe('sec-b')
  })
})

describe('resumen y almacenamiento', () => {
  it('suma sólo contadores positivos; undefined no suma', () => {
    expect(resumenDeSeccion([f('/a', { badge: 3 }), f('/b'), f('/c', { badge: 0, ai: true })])).toEqual({ pendientes: 3, conIa: true })
  })
  it('lee lo guardado y descarta basura', () => {
    const almacen = (v: string | null) => ({ getItem: () => v })
    expect(leerSecciones('k', almacen('{"a":false,"b":"x"}'))).toEqual({ a: false })
    expect(leerSecciones('k', almacen('[1]'))).toEqual({})
    expect(leerSecciones('k', almacen('roto'))).toEqual({})
    expect(leerSecciones('k', { getItem: () => { throw new Error('x') } })).toEqual({})
    expect(estaAbierta({}, 'nueva')).toBe(true)
  })
})

describe('filterAgencyNav con filas sueltas', () => {
  it('borra la cabecera que queda sin filas aunque la siga una fila suelta', () => {
    const icon = (() => null) as never
    const salida = filterAgencyNav(
      [
        { kind: 'section', label: 'Directorio', href: '#sec-directorio', icon, module: null },
        { label: 'Reportes', href: '/r', icon, module: null, suelta: true },
      ],
      { canAccess: () => true, isAdmin: true, agencyRole: 'ADMIN' } as never,
    )
    expect(salida.map((i) => i.href)).toEqual(['/r'])
  })
})
