/**
 * Reveal al hidratar con movimiento reducido (MOV-VERIFICA, 03-10-2026).
 *
 * El servidor no sabe de `prefers-reduced-motion` y pinta el `Appear` con
 * `opacity: 0`. Si el cliente pintaba el `div` pelado ya al hidratar, React
 * avisaba «some attributes of the server rendered HTML didn't match» y NO
 * corregía el `style`: la tarjeta del blog quedaba invisible para siempre.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const useReducedMotionMock = vi.fn(() => false)
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => useReducedMotionMock() }
})

import { Reveal } from './Reveal'

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('<Reveal> al hidratar', () => {
  it('con movimiento reducido no deja el style del servidor (opacidad 0) ni avisa de hidratación', async () => {
    const arbol = (
      <Reveal>
        <p data-testid="hijo">hola</p>
      </Reveal>
    )
    // El servidor: sin movimiento reducido (no lo puede saber).
    useReducedMotionMock.mockReturnValue(false)
    const html = renderToString(arbol)
    expect(html).toContain('opacity:0')

    // El navegador de una persona con movimiento reducido.
    useReducedMotionMock.mockReturnValue(true)
    container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errores = vi.spyOn(console, 'error').mockImplementation(() => {})
    const recuperables: unknown[] = []
    await act(async () => {
      root = hydrateRoot(container!, arbol, { onRecoverableError: (e) => recuperables.push(e) })
    })

    const avisos = errores.mock.calls.map((c) => String(c[0])).filter((m) => /hydrat|didn't match/i.test(m))
    expect(avisos).toEqual([])
    expect(recuperables).toEqual([])
    const hijo = container.querySelector('[data-testid="hijo"]')
    expect(hijo?.textContent).toBe('hola')
    // Ya hidratado: el estado final, sin el `style` del servidor.
    expect(hijo?.parentElement?.hasAttribute('style')).toBe(false)
  })
})
