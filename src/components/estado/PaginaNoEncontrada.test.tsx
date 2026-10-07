/**
 * La 404 (Nico, 01-10: «esto debemos hacer un glow up… hay que ayudar al
 * usuario de una manera más bonita»). Se prueba que AYUDA: dice qué ruta se
 * buscó y lleva a donde la persona puede seguir, con su panel si tiene sesión.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({
  usePathname: () => '/panel/inmobiliaria/esto-no-existe',
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))
vi.mock('@/components/brand/AuroraDeMarca', () => ({ AuroraDeMarca: () => <div data-testid="aurora" /> }))

import { AuthContext } from '@/lib/auth/auth-context'
import { PaginaNoEncontrada } from './PaginaNoEncontrada'

let root: Root | null = null
let host: HTMLDivElement

function pintar(conSesion: boolean) {
  host = document.createElement('div')
  document.body.appendChild(host)
  act(() => {
    root = createRoot(host)
    root.render(
      <AuthContext.Provider value={(conSesion ? { user: { id: 'u-1' } } : { user: null }) as never}>
        <PaginaNoEncontrada />
      </AuthContext.Provider>,
    )
  })
}

const destinos = () =>
  Array.from(host.querySelectorAll('[data-testid="no-encontrada-destinos"] a')).map((a) => a.getAttribute('href'))

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
})

describe('404', () => {
  it('dice qué ruta se buscó', () => {
    pintar(false)
    expect(host.querySelector('h1')?.textContent).toBe('Esta dirección no existe')
    expect(host.querySelector('[data-testid="no-encontrada-ruta"]')?.textContent).toBe('/panel/inmobiliaria/esto-no-existe')
  })

  it('sin sesión: inicio, arriendos, entrar y ayuda', () => {
    pintar(false)
    expect(destinos()).toEqual(['/', '/propiedades', '/auth', '/ayuda'])
  })

  it('con sesión, lo primero es su panel', () => {
    pintar(true)
    expect(destinos()[0]).toBe('/auth/post-login')
    expect(destinos()).not.toContain('/auth')
  })

  it('«Error 404» se dice una sola vez', () => {
    pintar(false)
    expect(host.textContent?.match(/Error 404/gi)).toHaveLength(1)
  })
})
