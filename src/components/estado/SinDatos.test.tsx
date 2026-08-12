/**
 * @vitest-environment happy-dom
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
    asChild
      ? React.createElement('span', props, children)
      : React.createElement('button', props, children),
}))

import { SinDatos } from './SinDatos'

/**
 * Una lista sin filas significa DOS cosas opuestas, y la pantalla las decía
 * igual. Decirle «no tenés inmuebles» a quien tiene 200 y filtró mal es
 * afirmar algo falso, y además lo deja sin salida: el botón que necesita
 * —quitar el filtro— no estaba.
 */
describe('<SinDatos>', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  const pintar = (props: React.ComponentProps<typeof SinDatos>) => {
    act(() => {
      root.render(React.createElement(SinDatos, props))
    })
  }

  const caso = () => container.querySelector('[data-testid="sin-datos"]')?.getAttribute('data-caso')

  it('sin filtros: invita a crear el primero', () => {
    pintar({
      queSon: 'inmuebles',
      crear: { label: 'Importar inmuebles', href: '/importar' },
      onLimpiarFiltros: () => {},
    })

    expect(caso()).toBe('vacio')
    expect(container.textContent).toContain('Importar inmuebles')
    // Ofrecer «quitar los filtros» a quien no puso ninguno no tiene sentido.
    expect(container.querySelector('[data-testid="limpiar-filtros"]')).toBeNull()
  })

  it('con filtros: ofrece quitarlos y NO afirma que no tenés nada', () => {
    pintar({
      hayFiltros: true,
      queSon: 'inmuebles',
      crear: { label: 'Importar inmuebles', href: '/importar' },
      onLimpiarFiltros: () => {},
    })

    expect(caso()).toBe('filtros')
    expect(container.querySelector('[data-testid="limpiar-filtros"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Todavía no tenés inmuebles')
    // Y tampoco se ofrece crear: quien tiene 200 no necesita «el primero».
    expect(container.textContent).not.toContain('Importar inmuebles')
  })

  it('sin acción declarada no dibuja botón', () => {
    // Un botón que no lleva a ningún lado es peor que no tener botón.
    pintar({ queSon: 'contratos' })
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('el texto por defecto habla del dominio, no de «datos»', () => {
    pintar({ queSon: 'propietarios' })
    expect(container.textContent).toContain('Todavía no tenés propietarios')
  })

  it('el mensaje con filtros nombra lo que se buscaba en singular', () => {
    pintar({ hayFiltros: true, queSon: 'contratos' })
    expect(container.textContent).toContain('Ningún contrato coincide')
  })
})
