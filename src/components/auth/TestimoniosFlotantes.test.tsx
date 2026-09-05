/**
 * Los testimonios del acceso rotan solos: uno, otro, otro, el cuarto, y
 * vuelve al primero. Sin framer-motion (se mockea a elementos planos).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, initial, animate, exit, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useReducedMotion: () => false,
}))

import {
  TestimoniosFlotantes,
  TESTIMONIOS,
  TESTIMONIOS_DE_MUESTRA,
  iniciales,
} from './TestimoniosFlotantes'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.useFakeTimers()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

const agenciaEnPantalla = () => container.querySelector('[data-testid="testimonio-agencia"]')?.textContent ?? ''

describe('TestimoniosFlotantes', () => {
  /**
   * 🔴 Lo que la app monta no puede ser una lista inventada.
   *
   * En la pantalla de acceso, a la vista de cualquiera, salían cuatro
   * testimonios con nombre, cargo, inmobiliaria y ciudad —todos inventados—
   * bajo el título «Inmobiliarias que ya operan con Leasefy». En Colombia eso
   * es publicidad engañosa (Ley 1480 de 2011, arts. 29-30). El comentario que
   * decía «copy de muestra» no impidió que estuviera montado.
   */
  it('sin testimonios reales no pinta NADA, ni siquiera el título', () => {
    expect(TESTIMONIOS).toHaveLength(0)
    act(() => root.render(<TestimoniosFlotantes intervaloMs={1000} />))
    expect(container.querySelector('[data-testid="testimonios"]')).toBeNull()
    expect(container.textContent).not.toContain('ya operan con Leasefy')
  })

  it('con una lista de verdad sí se pinta (la pieza sigue entera)', () => {
    act(() =>
      root.render(
        <TestimoniosFlotantes intervaloMs={1000} testimonios={TESTIMONIOS_DE_MUESTRA} />,
      ),
    )
    expect(agenciaEnPantalla()).toContain('Portofino')
    expect(container.querySelector('blockquote')?.textContent).toContain(TESTIMONIOS_DE_MUESTRA[0].frase)
    expect(container.querySelector('figcaption')?.textContent).toContain(TESTIMONIOS_DE_MUESTRA[0].nombre)
  })

  it('las iniciales del monograma', () => {
    expect(iniciales('Mariana Restrepo')).toBe('MR')
    expect(iniciales('Julián')).toBe('J')
    expect(iniciales('  ana  maría  de la torre ')).toBe('AM')
  })

  it('cada tantos segundos sale el siguiente, y después del cuarto vuelve el primero', () => {
    act(() =>
      root.render(
        <TestimoniosFlotantes intervaloMs={1000} testimonios={TESTIMONIOS_DE_MUESTRA} />,
      ),
    )
    act(() => { vi.advanceTimersByTime(1000) })
    expect(agenciaEnPantalla()).toContain(TESTIMONIOS_DE_MUESTRA[1].agencia)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(agenciaEnPantalla()).toContain(TESTIMONIOS_DE_MUESTRA[3].agencia)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(agenciaEnPantalla()).toContain('Portofino')
  })
})
