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

import { TestimoniosFlotantes, TESTIMONIOS } from './TestimoniosFlotantes'

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

const agenciaEnPantalla = () => container.querySelector('figcaption')?.textContent ?? ''

describe('TestimoniosFlotantes', () => {
  it('son cuatro y empieza por Portofino', () => {
    expect(TESTIMONIOS).toHaveLength(4)
    act(() => root.render(<TestimoniosFlotantes intervaloMs={1000} />))
    expect(agenciaEnPantalla()).toContain('Portofino')
    expect(container.querySelector('blockquote')?.textContent).toContain(TESTIMONIOS[0].frase)
  })

  it('cada tantos segundos sale el siguiente, y después del cuarto vuelve el primero', () => {
    act(() => root.render(<TestimoniosFlotantes intervaloMs={1000} />))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(agenciaEnPantalla()).toContain(TESTIMONIOS[1].agencia)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(agenciaEnPantalla()).toContain(TESTIMONIOS[3].agencia)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(agenciaEnPantalla()).toContain('Portofino')
  })
})
