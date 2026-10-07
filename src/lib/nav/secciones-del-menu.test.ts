import { describe, it, expect, vi } from 'vitest'
import {
  agruparEnSecciones,
  resumenDeSeccion,
  estaAbierta,
  seccionAbiertaAlEntrar,
  olvidarSeccionesGuardadas,
  SECCION_ABIERTA_AL_ENTRAR,
} from './secciones-del-menu'
import { ARQUITECTURA_DEL_PANEL } from './arquitectura-del-panel'
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

describe('resumen', () => {
  it('suma sólo contadores positivos; undefined no suma', () => {
    expect(resumenDeSeccion([f('/a', { badge: 3 }), f('/b'), f('/c', { badge: 0, ai: true })])).toEqual({ pendientes: 3, conIa: true })
  })
})

describe('al entrar, una sola sección abierta: «Operación» (Nico, 02-10)', () => {
  it('la sección de entrada existe en el panel de la inmobiliaria y se llama «Operación»', () => {
    const grupo = ARQUITECTURA_DEL_PANEL.find((g) => `sec-${g.key}` === SECCION_ABIERTA_AL_ENTRAR)
    expect(grupo?.labelKey).toBe('inmobiliaria.nav.secOperacionDelContrato')
  })

  it('elige «Operación» si está; si no, la primera sección del panel', () => {
    expect(seccionAbiertaAlEntrar(['sec-agentes', 'sec-captacion', 'sec-operacion', 'sec-dinero'])).toBe('sec-operacion')
    expect(seccionAbiertaAlEntrar(['sec-mi-arriendo'])).toBe('sec-mi-arriendo')
    expect(seccionAbiertaAlEntrar([])).toBeNull()
  })

  it('sin decisiones de la persona: abiertas la de entrada y la de la página actual, nada más', () => {
    const regla = { deEntrada: 'sec-operacion', activa: 'sec-dinero' }
    expect(estaAbierta({}, 'sec-operacion', regla)).toBe(true)
    expect(estaAbierta({}, 'sec-dinero', regla)).toBe(true)
    expect(estaAbierta({}, 'sec-agentes', regla)).toBe(false)
    expect(estaAbierta({}, 'sec-directorio', regla)).toBe(false)
  })

  it('lo que la persona decidió en esta visita manda sobre la regla', () => {
    const regla = { deEntrada: 'sec-operacion', activa: null }
    expect(estaAbierta({ 'sec-operacion': false }, 'sec-operacion', regla)).toBe(false)
    expect(estaAbierta({ 'sec-agentes': true }, 'sec-agentes', regla)).toBe(true)
  })

  it('borra lo que se guardaba antes en el navegador, sin quejarse si no se puede', () => {
    const removeItem = vi.fn()
    olvidarSeccionesGuardadas('u-1', { removeItem })
    expect(removeItem).toHaveBeenCalledWith('leasefy-sidebar-secciones:u-1')
    expect(() => olvidarSeccionesGuardadas('u-1', { removeItem: () => { throw new Error('bloqueado') } })).not.toThrow()
    expect(() => olvidarSeccionesGuardadas(null, null)).not.toThrow()
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
