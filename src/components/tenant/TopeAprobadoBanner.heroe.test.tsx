/**
 * El tope en grande (inicio de quien busca, glow up 22-10): la misma información y los mismos destinos que la
 * banda, pero la cifra es la respuesta de la pantalla. La banda de siempre no cambia.
 */
import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { TopeAprobadoBanner } from './TopeAprobadoBanner'
import type { Aprobacion } from '@/lib/api/aprobacion.service'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
function montar(el: React.ReactElement) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(el))
}

const en30dias = new Date(Date.now() + 30 * 86_400_000).toISOString()
const aprobado: Aprobacion = {
  estado: 'aprobado',
  topeAprobadoCop: 2_800_000,
  aseguradoras: [],
  vigenteHasta: en30dias,
  resueltoEn: null,
  condicionada: false,
  canonConsultadoCop: null,
}
const detalle = { href: '/inquilino/para-ti', label: 'Ver inmuebles para mí', variant: 'default' as const }

describe('TopeAprobadoBanner en grande', () => {
  it('aprobado: «Estás aprobado hasta» con la cifra grande, la vigencia y el botón a su catálogo', () => {
    montar(<TopeAprobadoBanner aprobacion={aprobado} vigente tamano="heroe" detalle={detalle} />)
    const heroe = host.querySelector('[data-testid="tope-en-grande"]')
    expect(heroe).toBeTruthy()
    expect(heroe?.textContent).toContain('Estás aprobado hasta')
    expect(heroe?.textContent).toMatch(/2\.800\.000/)
    expect(heroe?.textContent).toMatch(/Vence en \d+ días/)
    expect(heroe?.querySelector('a')?.getAttribute('href')).toBe('/inquilino/para-ti')
  })

  it('sin aprobación: la pregunta como título y «Conoce tu tope» a /aprobacion, como la banda', () => {
    montar(<TopeAprobadoBanner aprobacion={null} vigente={false} tamano="heroe" detalle={detalle} />)
    const heroe = host.querySelector('[data-testid="tope-en-grande"]')
    expect(heroe?.querySelector('h2')?.textContent).toBe('Todavía no sabes hasta cuánto puedes arrendar')
    expect(heroe?.querySelector('a')?.getAttribute('href')).toBe('/aprobacion')
  })

  it('la banda de siempre no cambia (catálogo, marketplace)', () => {
    montar(<TopeAprobadoBanner aprobacion={aprobado} vigente />)
    expect(host.querySelector('[data-testid="tope-en-grande"]')).toBeNull()
    expect(host.textContent).toContain('Estás aprobado hasta')
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/inquilino/aprobacion')
  })
})
