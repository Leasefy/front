/**
 * LandingFooterV2 — el pie de la landing, montado tambien fuera del home.
 *
 * Lo que fija este archivo es una sola cosa, y es la que se rompio: el pie
 * depende de `initLandingFx` para VERSE. La marca y las dos columnas de
 * enlaces llevan `[data-reveal]` (arrancan en `opacity:0`) y el wordmark
 * gigante lo construia el script letra por letra. Fuera del home ese script
 * no corre, asi que el pie servia su markup completo y en pantalla quedaba
 * solo el copyright: presente en el HTML, invisible para el que mira.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/font/google', () => {
  const fuente = (opts: { variable?: string }) => ({
    className: 'mock-font',
    variable: opts.variable ?? '--font-mock',
    style: { fontFamily: 'mock-font' },
  })
  return { Inter: fuente, Inter_Tight: fuente, IBM_Plex_Mono: fuente }
})

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false, activeContext: null }),
}))

import { LandingFooterV2 } from './LandingFooterV2'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function montar(props: { fxExterno?: boolean } = {}) {
  act(() => {
    root.render(<LandingFooterV2 {...props} />)
  })
}

describe('<LandingFooterV2>', () => {
  it('sin fx externo, la marca y las columnas vienen ya reveladas', () => {
    montar()
    const bloques = [...container.querySelectorAll('[data-reveal]')]
    expect(bloques.length).toBe(3)
    bloques.forEach((b) => expect(b.className).toContain('in'))
  })

  it('con fx externo las deja sin revelar — las anima el observador del home', () => {
    montar({ fxExterno: true })
    const bloques = [...container.querySelectorAll('[data-reveal]')]
    expect(bloques.length).toBe(3)
    bloques.forEach((b) => expect(b.className).not.toContain('in'))
  })

  it('el wordmark trae sus letras en el markup, con el punto en gradiente', () => {
    montar()
    const wm = container.querySelector('#wm')
    const letras = [...(wm?.querySelectorAll('span') ?? [])]
    expect(letras.map((l) => l.textContent).join('')).toBe('Leasefy.')
    // `initLandingFx` construye las letras solo `if(!wm.childElementCount)`,
    // asi que traerlas armadas no las duplica en el home.
    expect(letras.at(-1)?.className).toBe('bd')
    expect(letras[0].getAttribute('style')).toContain('--d')
  })

  it('el wordmark se ve quieto sin fx y espera al scroll con fx', () => {
    montar()
    expect(container.querySelector('#wm')?.className).toContain('in')
    act(() => {
      root.render(<LandingFooterV2 fxExterno />)
    })
    expect(container.querySelector('#wm')?.className).not.toContain('in')
  })

  it('los enlaces de producto van a rutas reales, no a anclas del home', () => {
    montar()
    const hrefs = [...container.querySelectorAll('.fcol a')].map((a) => a.getAttribute('href'))
    // Un `#producto` desde /blog no lleva a ningun lado: esa seccion vive en
    // el home. El pie viejo que este reemplaza si llevaba a las rutas.
    expect(hrefs.every((h) => !h?.startsWith('#'))).toBe(true)
    expect(hrefs).toContain('/productos/crm')
    expect(hrefs).toContain('/blog')
  })

  it('cierra con los enlaces legales', () => {
    montar()
    const hrefs = [...container.querySelectorAll('.fbot a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/terminos')
    expect(hrefs).toContain('/privacidad')
  })
})
