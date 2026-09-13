/**
 * Las tres lecturas de la cartera son tres rutas hermanas, no un control de
 * estado: cada una se puede compartir y volver a abrir.
 *
 * Lo que se protege: que sólo UNA quede marcada y que la marca sea EXACTA —
 * con prefijo, «Por edad» (la raíz) quedaría activa estando en «Por concepto»,
 * que es justo el defecto que hace que una barra de pestañas deje de servir.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const rutaMock = vi.fn<() => string>()

vi.mock('next/navigation', () => ({
  usePathname: () => rutaMock(),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { PESTANAS_DE_CARTERA, PestanasDeCartera } from './PestanasDeCartera'

let host: HTMLDivElement
let root: Root

function montarEn(ruta: string) {
  rutaMock.mockReturnValue(ruta)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<PestanasDeCartera />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('PestanasDeCartera', () => {
  it('las tres lecturas cuelgan de la misma ruta de Cartera', () => {
    montarEn('/panel/inmobiliaria/cobros/cartera')
    expect(PESTANAS_DE_CARTERA.map((p) => p.href)).toEqual([
      '/panel/inmobiliaria/cobros/cartera',
      '/panel/inmobiliaria/cobros/cartera/conceptos',
      '/panel/inmobiliaria/cobros/cartera/por-pagar',
    ])
    expect(host.querySelectorAll('a')).toHaveLength(3)
  })

  it('en «Por concepto» la marcada es esa, no la raíz', () => {
    montarEn('/panel/inmobiliaria/cobros/cartera/conceptos')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.getAttribute('href')).toBe('/panel/inmobiliaria/cobros/cartera/conceptos')
  })

  it('en la raíz la marcada es «Por edad»', () => {
    montarEn('/panel/inmobiliaria/cobros/cartera')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.textContent).toContain('Por edad')
  })
})
