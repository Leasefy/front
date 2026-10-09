/**
 * Cuándo sale la ventana de la política y los términos (Nico, 08-10-2026: «en
 * el home luego de que ya tenga todo check»).
 */
import { describe, expect, it } from 'vitest'

import { esElHome, hayAlgoAntesDeLaVentanaLegal } from './cuando-sale-la-ventana-legal'

const hay = (...selectores: string[]) => (sel: string) => selectores.includes(sel)

describe('esElHome', () => {
  it('el home exacto, sin la query ni la barra final', () => {
    expect(esElHome('/panel/inmobiliaria/piloto', '/panel/inmobiliaria/piloto')).toBe(true)
    expect(esElHome('/panel/inmobiliaria/piloto/', '/panel/inmobiliaria/piloto')).toBe(true)
    expect(esElHome('/inquilino?tab=pagos', '/inquilino')).toBe(true)
  })

  it('ni las subpáginas, ni el onboarding, ni otra raíz', () => {
    expect(esElHome('/panel/inmobiliaria/piloto/bandeja', '/panel/inmobiliaria/piloto')).toBe(false)
    expect(esElHome('/onboarding/seleccionar-rol', '/inquilino')).toBe(false)
    expect(esElHome('/panel/inmobiliaria', '/panel/inmobiliaria/piloto')).toBe(false)
    expect(esElHome(null, '/inquilino')).toBe(false)
  })
})

describe('hayAlgoAntesDeLaVentanaLegal', () => {
  it('🔴 la puesta en marcha, otro diálogo y el recorrido van antes', () => {
    expect(hayAlgoAntesDeLaVentanaLegal(hay('[data-testid="decision-de-migracion"]'))).toBe(true)
    expect(hayAlgoAntesDeLaVentanaLegal(hay('[data-testid="muro-migracion"]'))).toBe(true)
    expect(hayAlgoAntesDeLaVentanaLegal(hay('[role="dialog"][data-state="open"]'))).toBe(true)
    expect(hayAlgoAntesDeLaVentanaLegal(hay('[data-testid="tour-del-panel"]'))).toBe(true)
    expect(hayAlgoAntesDeLaVentanaLegal(hay('html[data-recorrido-pendiente]'))).toBe(true)
  })

  it('con todo hecho, nada', () => {
    expect(hayAlgoAntesDeLaVentanaLegal(hay())).toBe(false)
  })

  it('un selector que revienta no frena la ventana para siempre', () => {
    expect(hayAlgoAntesDeLaVentanaLegal(() => { throw new Error('x') })).toBe(false)
  })
})
