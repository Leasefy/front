/**
 * El guion del recorrido: qué pasos sobreviven a la pantalla que hay delante,
 * y cómo se arma la secuencia completa (bienvenida → pasos → cierre).
 *
 * Se prueba sin DOM a propósito: el filtro por elemento se inyecta, así que
 * acá se puede simular «este rol no ve Pagos» sin montar medio panel.
 */

import { describe, it, expect } from 'vitest'
import {
  PASOS_DEL_TOUR,
  elPanelEstaBloqueado,
  pantallasDelTour,
  pasosVisibles,
} from './pasos-del-tour'

describe('pasosVisibles', () => {
  it('sin ningún elemento en la página no queda ningún paso', () => {
    expect(pasosVisibles(() => false)).toEqual([])
  })

  it('deja pasar sólo los pasos cuyo elemento existe, en orden', () => {
    const presentes = new Set([
      '[data-testid="piloto-modo-header"]',
      '[data-tour-target="buscador"]',
    ])
    const pasos = pasosVisibles((sel) => presentes.has(sel))
    expect(pasos.map((p) => p.id)).toEqual(['buscador', 'piloto'])
  })

  it('mantiene el orden declarado', () => {
    const ids = pasosVisibles(() => true).map((p) => p.id)
    expect(ids).toEqual(PASOS_DEL_TOUR.map((p) => p.id))
  })

  it('un selector que revienta no tumba el recorrido', () => {
    const pasos = pasosVisibles((sel) => {
      if (sel.includes('piloto')) throw new Error('selector inválido')
      return true
    })
    expect(pasos.map((p) => p.id)).not.toContain('piloto')
    expect(pasos).toHaveLength(PASOS_DEL_TOUR.length - 1)
  })

  it('a quien no ve Pagos ni Reportes se le caen esos dos pasos, y sólo esos', () => {
    const sinFinanzas = pasosVisibles(
      (sel) => !sel.includes('sidebar-pagos') && !sel.includes('sidebar-reportes'),
    )
    expect(sinFinanzas.map((p) => p.id)).toEqual(
      PASOS_DEL_TOUR.filter((p) => p.id !== 'pagos' && p.id !== 'reportes').map((p) => p.id),
    )
  })

  it('el recorrido recorre el ciclo de vida: captar → arrendar → cobrar → pagar', () => {
    const ids = PASOS_DEL_TOUR.map((p) => p.id)
    const antes = (a: string, b: string) => ids.indexOf(a) < ids.indexOf(b)
    expect(antes('nuevo', 'inmuebles')).toBe(true)
    expect(antes('inmuebles', 'postulaciones')).toBe(true)
    expect(antes('postulaciones', 'contratos')).toBe(true)
    expect(antes('contratos', 'cobros')).toBe(true)
    expect(antes('cobros', 'pagos')).toBe(true)
  })

  it('cada paso tiene su selector y sus claves de texto', () => {
    for (const p of PASOS_DEL_TOUR) {
      expect(p.selector).toMatch(/^\[data-/)
      expect(p.tituloKey).toBe(`inmobiliaria.tour.pasos.${p.id}.titulo`)
      expect(p.cuerpoKey).toBe(`inmobiliaria.tour.pasos.${p.id}.cuerpo`)
      if (p.datoKey) expect(p.datoKey).toBe(`inmobiliaria.tour.pasos.${p.id}.dato`)
    }
  })

  it('ningún id ni selector está repetido', () => {
    expect(new Set(PASOS_DEL_TOUR.map((p) => p.id)).size).toBe(PASOS_DEL_TOUR.length)
    expect(new Set(PASOS_DEL_TOUR.map((p) => p.selector)).size).toBe(PASOS_DEL_TOUR.length)
  })

  it('es un recorrido de verdad, no dos burbujas', () => {
    // Lo que pidió Nico. Si alguien vuelve a dejarlo en tres, que salte acá.
    expect(PASOS_DEL_TOUR.length).toBeGreaterThanOrEqual(8)
  })
})

describe('pantallasDelTour', () => {
  it('sin pasos no hay recorrido: ni bienvenida ni cierre', () => {
    expect(pantallasDelTour([])).toEqual([])
  })

  it('abre con la bienvenida y cierra con el cierre', () => {
    const p = pantallasDelTour(PASOS_DEL_TOUR)
    expect(p[0]!.tipo).toBe('bienvenida')
    expect(p[p.length - 1]!.tipo).toBe('cierre')
    expect(p).toHaveLength(PASOS_DEL_TOUR.length + 2)
  })

  it('el número del paso cuenta sólo los pasos anclados', () => {
    const p = pantallasDelTour(PASOS_DEL_TOUR.slice(0, 3))
    const pasos = p.filter((x) => x.tipo === 'paso')
    expect(pasos.map((x) => (x.tipo === 'paso' ? x.indiceDelPaso : -1))).toEqual([0, 1, 2])
    expect(pasos.every((x) => x.tipo === 'paso' && x.totalDePasos === 3)).toBe(true)
  })

  it('el total se recalcula cuando se cae un paso', () => {
    const dos = pantallasDelTour(PASOS_DEL_TOUR.slice(0, 2))
    expect(dos.filter((x) => x.tipo === 'paso').every((x) => x.tipo === 'paso' && x.totalDePasos === 2)).toBe(true)
  })
})

describe('elPanelEstaBloqueado', () => {
  it('con el muro de migración arriba, el panel está bloqueado', () => {
    expect(elPanelEstaBloqueado((s) => s.includes('muro-migracion'))).toBe(true)
  })

  it('con un modal abierto, tampoco arranca encima', () => {
    expect(elPanelEstaBloqueado((s) => s.includes('role="dialog"'))).toBe(true)
    expect(elPanelEstaBloqueado((s) => s.includes('alertdialog'))).toBe(true)
  })

  it('sin capas bloqueantes, no', () => {
    expect(elPanelEstaBloqueado(() => false)).toBe(false)
  })

  it('un selector que revienta no cuenta como bloqueo', () => {
    expect(
      elPanelEstaBloqueado(() => {
        throw new Error('selector inválido')
      }),
    ).toBe(false)
  })
})
