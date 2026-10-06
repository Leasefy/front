/**
 * Los testimonios del acceso rotan solos: uno, otro, otro, el cuarto, y
 * vuelve al primero. La barra se mockea a elementos planos; el cambio de
 * tarjeta es el `CrossFade` de Cadence (con `skipAnimations`): sale el
 * viejo y DESPUÉS entra el nuevo, así que cada avance se espera con
 * `advanceTimersByTimeAsync` dentro de un `act` asíncrono.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

import { TestimoniosFlotantes, TESTIMONIOS, iniciales } from './TestimoniosFlotantes'

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
  it('son cuatro y empieza por Portofino', () => {
    expect(TESTIMONIOS).toHaveLength(4)
    act(() => root.render(<TestimoniosFlotantes intervaloMs={1000} />))
    expect(agenciaEnPantalla()).toContain('Portofino')
    expect(container.querySelector('blockquote')?.textContent).toContain(TESTIMONIOS[0].frase)
    expect(container.querySelector('figcaption')?.textContent).toContain(TESTIMONIOS[0].nombre)
  })

  /**
   * La lista es reemplazable a propósito: la idea es cambiarla por frases
   * reales sin tocar el componente. Este test fija esa puerta — si alguien la
   * cierra, cambiar los testimonios pasa a ser cirugía.
   */
  it('acepta la lista por prop, para poder cambiarla sin tocar la pieza', () => {
    const reales = [
      {
        agencia: 'Otra Inmobiliaria',
        ciudad: 'Pereira',
        frase: 'Una frase de verdad.',
        nombre: 'Nombre Real',
        cargo: 'Cargo',
      },
    ]
    act(() => root.render(<TestimoniosFlotantes intervaloMs={1000} testimonios={reales} />))
    expect(agenciaEnPantalla()).toContain('Otra Inmobiliaria')
    expect(container.textContent).not.toContain('Portofino')
  })

  it('con la lista vacía no pinta nada, ni siquiera el título', () => {
    act(() => root.render(<TestimoniosFlotantes intervaloMs={1000} testimonios={[]} />))
    expect(container.querySelector('[data-testid="testimonios"]')).toBeNull()
    expect(container.textContent).not.toContain('ya operan con Leasefy')
  })

  it('las iniciales del monograma', () => {
    expect(iniciales('Mariana Restrepo')).toBe('MR')
    expect(iniciales('Julián')).toBe('J')
    expect(iniciales('  ana  maría  de la torre ')).toBe('AM')
  })

  it('cada tantos segundos sale el siguiente, y después del cuarto vuelve el primero', async () => {
    act(() =>
      root.render(
        <TestimoniosFlotantes intervaloMs={1000} />,
      ),
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(agenciaEnPantalla()).toContain(TESTIMONIOS[1].agencia)
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(agenciaEnPantalla()).toContain(TESTIMONIOS[3].agencia)
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(agenciaEnPantalla()).toContain('Portofino')
  })

  /**
   * Sólo `transform` y `opacity` (DESIGN.md §8b): el `filter: blur` animado
   * repintaba la tarjeta —con su `backdrop-blur` sobre el video— en cada
   * cuadro, y la barra crecía con `width`. Se mira el fuente porque acá
   * framer está mockeado y el estilo no llega al DOM.
   */
  it('anima sólo transform y opacidad: ni blur ni width', () => {
    const fuente = readFileSync(join(__dirname, 'TestimoniosFlotantes.tsx'), 'utf8')
    expect(fuente).not.toMatch(/filter:\s*['"]blur/)
    expect(fuente).not.toMatch(/(initial|animate)=\{\{[^}]*width/)
    expect(fuente).not.toMatch(/mode="wait"/)
  })
})
