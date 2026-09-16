/**
 * fila-activa-del-menu — una sola fila marcada, la más específica.
 *
 * El defecto que fija: con los agentes en «Agentes IA» y sus URLs intactas,
 * `/pagos/cobranza/deudores/1` calzaba por prefijo con «Pagos» y con
 * «Cobranza», y el menú marcaba las dos. La sala se veía en los dos lugares.
 */

import { describe, it, expect } from 'vitest'

import { calzaConLaRuta, hrefDeLaFilaActiva, type FilaDelMenu } from './fila-activa-del-menu'

const P = '/panel/inmobiliaria'

const MENU: FilaDelMenu[] = [
  { href: `${P}/piloto` },
  { href: P, exact: true },
  { href: '#sec-agentes', kind: 'section' },
  { href: `${P}/pagos/cobranza` },
  { href: `${P}/reportes/ia`, exact: true },
  { href: '#sec-dinero', kind: 'section' },
  { href: `${P}/pagos` },
  { href: `${P}/reportes` },
]

describe('calzaConLaRuta', () => {
  it('por prefijo respeta el borde de segmento', () => {
    expect(calzaConLaRuta({ href: `${P}/pagos` }, `${P}/pagos/cartera`)).toBe(true)
    expect(calzaConLaRuta({ href: `${P}/pagos` }, `${P}/pagosx`)).toBe(false)
  })

  it('exacta sólo en la ruta misma', () => {
    expect(calzaConLaRuta({ href: P, exact: true }, P)).toBe(true)
    expect(calzaConLaRuta({ href: P, exact: true }, `${P}/pagos`)).toBe(false)
  })
})

describe('hrefDeLaFilaActiva', () => {
  it('🔴 dentro de una sala gana la fila del agente, no la del módulo que la hospedaba', () => {
    expect(hrefDeLaFilaActiva(MENU, `${P}/pagos/cobranza/deudores/1`)).toBe(`${P}/pagos/cobranza`)
  })

  it('fuera de la sala, la fila del módulo sigue marcándose', () => {
    expect(hrefDeLaFilaActiva(MENU, `${P}/pagos/cartera`)).toBe(`${P}/pagos`)
    expect(hrefDeLaFilaActiva(MENU, `${P}/reportes/rentabilidad`)).toBe(`${P}/reportes`)
  })

  it('una fila exacta más larga gana en su ruta y no se come a sus hijas', () => {
    expect(hrefDeLaFilaActiva(MENU, `${P}/reportes/ia`)).toBe(`${P}/reportes/ia`)
    expect(hrefDeLaFilaActiva(MENU, `${P}/reportes/ia/detalle`)).toBe(`${P}/reportes`)
  })

  it('ignora la query', () => {
    expect(hrefDeLaFilaActiva(MENU, `${P}/pagos/cobranza?tab=casos`)).toBe(`${P}/pagos/cobranza`)
  })

  it('las cabeceras y las filas deshabilitadas nunca se marcan', () => {
    const conDeshabilitada: FilaDelMenu[] = [...MENU, { href: `${P}/pagos/cobranza/deudores`, disabled: true }]
    expect(hrefDeLaFilaActiva(conDeshabilitada, `${P}/pagos/cobranza/deudores`)).toBe(`${P}/pagos/cobranza`)
    expect(hrefDeLaFilaActiva(MENU, '#sec-agentes')).toBeNull()
  })

  it('null cuando nada calza, o sin ruta', () => {
    expect(hrefDeLaFilaActiva(MENU, '/otra-cosa')).toBeNull()
    expect(hrefDeLaFilaActiva(MENU, null)).toBeNull()
  })
})
