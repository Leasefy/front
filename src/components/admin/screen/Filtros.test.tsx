/**
 * Los filtros del admin en UNA línea (Nico, 21-10-2026: «mira esos selects por
 * ahí tirados»): el desplegable lleva su rótulo ADENTRO y el de arriba queda
 * sólo para el lector de pantalla; una fecha o un texto lo lleva a la izquierda.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { Desplegable, Filtro } from './Filtros'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
function montar(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
}
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.innerHTML = ''
})

const opciones = [{ valor: 'pendiente', nombre: 'Pendiente' }]

describe('Filtro + Desplegable', () => {
  it('el rótulo va adentro del desplegable, marcado para esconder el de afuera', () => {
    montar(
      <Filtro etiqueta="Migración">
        <Desplegable value="" onChange={() => {}} opciones={opciones} data-testid="f" />
      </Filtro>,
    )
    const disparador = document.querySelector('[data-testid="f"]')!
    expect(disparador.textContent).toContain('Migración:')
    expect(disparador.hasAttribute('data-etiqueta-adentro')).toBe(true)
    expect(disparador.getAttribute('aria-label')).toBe('Migración')
    expect(disparador.hasAttribute('data-activo')).toBe(false)
  })

  it('un filtro puesto se marca sin abrirlo', () => {
    montar(
      <Filtro etiqueta="Migración">
        <Desplegable value="pendiente" onChange={() => {}} opciones={opciones} data-testid="f" />
      </Filtro>,
    )
    expect(document.querySelector('[data-testid="f"]')!.hasAttribute('data-activo')).toBe(true)
  })

  it('fuera de un Filtro, el desplegable es el de siempre (sin rótulo adentro)', () => {
    montar(<Desplegable value="" onChange={() => {}} opciones={opciones} data-testid="f" />)
    const disparador = document.querySelector('[data-testid="f"]')!
    expect(disparador.hasAttribute('data-etiqueta-adentro')).toBe(false)
    expect(disparador.textContent).not.toContain(':')
  })

  it('una fecha o un texto conserva su rótulo visible, a la izquierda', () => {
    montar(
      <Filtro etiqueta="Desde" htmlFor="desde">
        <input id="desde" type="date" />
      </Filtro>,
    )
    const label = document.querySelector('label')!
    expect(label.textContent).toBe('Desde')
    expect(document.querySelector('[data-etiqueta-adentro]')).toBeNull()
  })
})
