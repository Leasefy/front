/**
 * @vitest-environment happy-dom
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@phosphor-icons/react', () => ({
  Warning: (props: Record<string, unknown>) => React.createElement('svg', props),
}))

import { AvisoDatosDeEjemplo } from './AvisoDatosDeEjemplo'

/**
 * Una pantalla de vitrina que no se rotula se lee como propia. El daño de
 * `/pagos/propietarios` no era el mock: era que la bandeja decía «María
 * Restrepo · $6.420.000» con la misma cara que las pantallas que sí traen
 * datos del back.
 */
describe('<AvisoDatosDeEjemplo>', () => {
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

  const render = (props: React.ComponentProps<typeof AvisoDatosDeEjemplo>) =>
    act(() => {
      root.render(React.createElement(AvisoDatosDeEjemplo, props))
    })

  it('dice que los datos son de ejemplo', () => {
    render({ queEsInventado: 'Los propietarios y los montos' })
    expect(container.textContent).toContain('datos de ejemplo')
  })

  /**
   * Un «datos de ejemplo» genérico no alcanza: quien mira necesita saber DE QUÉ
   * número desconfiar, porque la pantalla mezcla lo inventado con lo real.
   */
  it('nombra en concreto qué está inventado', () => {
    render({ queEsInventado: 'Los propietarios y los montos a transferir' })
    expect(container.textContent).toContain('Los propietarios y los montos a transferir')
  })

  it('cuenta qué falta cuando se sabe', () => {
    render({
      queEsInventado: 'La bandeja',
      queFalta: 'Falta cablear fetchOwnerInbox().',
    })
    expect(container.textContent).toContain('Falta cablear fetchOwnerInbox().')
  })

  it('omite la línea de qué falta si no se pasa', () => {
    render({ queEsInventado: 'La bandeja' })
    const aviso = container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')
    expect(aviso?.querySelectorAll('p')).toHaveLength(1)
  })

  it('no se puede cerrar: la salida es cablear la pantalla, no tapar el cartel', () => {
    render({ queEsInventado: 'La bandeja' })
    expect(container.querySelector('button')).toBeNull()
  })

  /**
   * C11 (Fase 13, plan 13-02; UI-SPEC §5): `text-warning` sobre
   * `bg-warning-soft` da 3.2:1 y falla AA para texto. El tono de precaución
   * vive en el icono (componente no textual, pasa 3:1); el texto va en
   * `text-fg`, también la línea de qué falta.
   */
  it('[N13:aviso-contraste] el texto va en text-fg y text-warning queda solo en el icono', () => {
    render({ queEsInventado: 'La bandeja', queFalta: 'Falta cablear fetchOwnerInbox().' })
    const aviso = container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')
    const clases = (aviso?.getAttribute('class') ?? '').split(/\s+/)
    expect(clases).toContain('text-fg')
    expect(clases.filter((c) => c === 'text-warning' || c.startsWith('text-warning/'))).toEqual([])
    const icono = aviso?.querySelector('svg')
    expect((icono?.getAttribute('class') ?? '').split(/\s+/)).toContain('text-warning')
    const parrafos = aviso?.querySelectorAll('p') ?? []
    expect(parrafos).toHaveLength(2)
    const clasesDeQueFalta = (parrafos[1]?.getAttribute('class') ?? '').split(/\s+/)
    expect(clasesDeQueFalta).toContain('text-fg')
    expect(clasesDeQueFalta.filter((c) => c.startsWith('text-warning'))).toEqual([])
  })

  it('[N13:control-positivo] con qué es inventado y qué falta, los dos textos se ven y el aviso es un status', () => {
    render({ queEsInventado: 'Los propietarios (prueba)', queFalta: 'Falta el endpoint (prueba).' })
    const aviso = container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')
    expect(aviso?.getAttribute('role')).toBe('status')
    expect(aviso?.textContent).toContain('Los propietarios (prueba)')
    expect(aviso?.textContent).toContain('Falta el endpoint (prueba).')
  })
})
