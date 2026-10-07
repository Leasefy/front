/**
 * 🔴 ARREGLOS-4 (03-10-2026) · El vacío de una tabla ancha se ve entero a 390 px.
 *
 * PRUEBAS-RESTO, en Documentos a 390 px: la tabla mide 616 px y la celda del
 * vacío (`colSpan`) también, así que «Todavía no generaste ningún documento» y
 * su botón quedaban centrados en 616 px, cortados a la derecha.
 * `AlAnchoVisible` toma el ancho VISIBLE del contenedor que se desplaza y se
 * pega a su borde izquierdo.
 */
import * as React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { AlAnchoVisible } from './al-ancho-visible'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement | null = null
let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

describe('AlAnchoVisible', () => {
  it('mide el contenedor que se desplaza de lado y se pega a la izquierda con ese ancho', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    // El `overflow-auto` de `Table`: visible 340 px de una tabla de 616.
    host.style.overflowX = 'auto'
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 340 })
    const celda = document.createElement('div')
    celda.style.width = '616px'
    host.appendChild(celda)
    root = createRoot(celda)
    act(() =>
      root!.render(
        <AlAnchoVisible>
          <p>Todavía no generaste ningún documento</p>
        </AlAnchoVisible>,
      ),
    )
    const el = celda.querySelector<HTMLElement>('[data-al-ancho-visible]')!
    expect(el.style.width).toBe('340px')
    expect(el.className).toContain('sticky')
    expect(el.className).toContain('left-0')
  })

  it('sin contenedor que se desplace, no impone ningún ancho', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => root!.render(<AlAnchoVisible>hola</AlAnchoVisible>))
    expect(host.querySelector<HTMLElement>('[data-al-ancho-visible]')!.style.width).toBe('')
  })
})

describe('🔴 Documentos usa AlAnchoVisible en los tres vacíos de su tabla', () => {
  it('documentos, plantillas y actas', () => {
    const src = readFileSync('src/app/panel/inmobiliaria/documentos/page.tsx', 'utf8')
    for (const clave of ['vacio-documentos', 'vacio-plantillas', 'vacio-actas']) {
      const desde = src.indexOf(`key="${clave}"`)
      expect(desde, clave).toBeGreaterThan(-1)
      const bloque = src.slice(desde, src.indexOf('</TableRowAnimada>', desde))
      expect(bloque, clave).toContain('<AlAnchoVisible>')
      expect(bloque, clave).toContain('</AlAnchoVisible>')
    }
  })
})
