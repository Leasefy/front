import { describe, it, expect } from 'vitest'
import { PASOS_DEL_TOUR, elPanelEstaBloqueado, pasosVisibles } from './pasos-del-tour'

describe('pasosVisibles', () => {
  it('sin ningún elemento en la página no queda ningún paso', () => {
    expect(pasosVisibles(() => false)).toEqual([])
  })

  it('deja pasar sólo los pasos cuyo elemento existe, en orden', () => {
    const presentes = new Set(['[data-testid="piloto-modo-header"]'])
    const pasos = pasosVisibles((sel) => presentes.has(sel))
    expect(pasos.map((p) => p.id)).toEqual(['piloto'])
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
    expect(pasos.map((p) => p.id)).toEqual(['buscador', 'agentes'])
  })

  it('cada paso tiene su selector y sus dos claves de texto', () => {
    for (const p of PASOS_DEL_TOUR) {
      expect(p.selector).toMatch(/^\[data-/)
      expect(p.tituloKey).toContain('inmobiliaria.tour.')
      expect(p.cuerpoKey).toContain('inmobiliaria.tour.')
    }
  })
})

describe('elPanelEstaBloqueado', () => {
  it('con el muro de migración arriba, el panel está bloqueado', () => {
    expect(elPanelEstaBloqueado((s) => s.includes('muro-migracion'))).toBe(true)
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
