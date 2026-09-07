/**
 * @vitest-environment happy-dom
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@phosphor-icons/react', () => ({
  Flask: (props: Record<string, unknown>) => React.createElement('svg', props),
}))

import { AvisoModoSimulado } from './AvisoModoSimulado'

/**
 * El modo simulado se anuncia o no existe.
 *
 * Mientras estuvo prendido en silencio, cada prueba en desarrollo y en staging
 * terminaba en una conclusión falsa: pantallas que «funcionaban» porque un mock
 * las llenaba, y nombres y montos que se leían como propios. El aviso es lo que
 * convierte eso en algo que se ve.
 */
describe('<AvisoModoSimulado>', () => {
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
  })

  const render = (activo: boolean) =>
    act(() => {
      root.render(React.createElement(AvisoModoSimulado, { activo }))
    })

  it('con el simulado apagado no deja ni un nodo', () => {
    render(false)
    expect(container.innerHTML).toBe('')
  })

  it('con el simulado prendido lo dice en pantalla', () => {
    render(true)
    const aviso = container.querySelector('[data-testid="aviso-modo-simulado"]')
    expect(aviso).not.toBeNull()
    expect(aviso?.textContent).toContain('Modo simulado')
    // No alcanza con rotularlo: tiene que decir QUÉ significa para quien mira.
    expect(aviso?.textContent).toContain('inventados')
  })

  it('nombra la variable que lo apaga, para que se pueda actuar', () => {
    render(true)
    expect(container.textContent).toContain('NEXT_PUBLIC_USE_MOCK_API')
  })

  it('se anuncia a los lectores de pantalla', () => {
    render(true)
    const aviso = container.querySelector('[data-testid="aviso-modo-simulado"]')
    expect(aviso?.getAttribute('role')).toBe('status')
    expect(aviso?.getAttribute('aria-live')).toBe('polite')
  })

  it('no se puede cerrar: la única salida es apagar el simulado', () => {
    render(true)
    expect(container.querySelector('button')).toBeNull()
  })
})
