/**
 * @vitest-environment happy-dom
 *
 * MATCH-3 (QA de agentes 18-10, Nico «Sí, con su puesto»): la lista corta de
 * Matching se veía en Postulaciones pero no en Candidatos del inmueble, que es
 * donde la inmobiliaria escoge. La marca es UNA para las dos pantallas.
 */
import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { MarcaDeListaCorta } from './MarcaDeListaCorta'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let contenedor: HTMLDivElement
function pintar(el: React.ReactElement) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() => root.render(el))
}
afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('MarcaDeListaCorta', () => {
  it('dice el puesto y deja las razones a la mano', () => {
    pintar(
      <MarcaDeListaCorta
        puesto={{ applicationId: 'a-1', nombre: 'John', puesto: 1, razones: ['Le quedan 2,9 veces.', 'Subió 2 documentos.'], fuera: null }}
      />,
    )
    const marca = contenedor.querySelector('[data-testid="lista-corta-a-1"]') as HTMLElement
    expect(marca.textContent).toBe('Lista corta · 1.º')
    expect(marca.getAttribute('title')).toBe('Le quedan 2,9 veces. Subió 2 documentos.')
  })

  it('sin puesto no pinta nada', () => {
    pintar(<MarcaDeListaCorta puesto={undefined} />)
    expect(contenedor.innerHTML).toBe('')
  })
})
