/**
 * Las cuatro lecturas de la cartera son rutas hermanas, no un control de
 * estado: cada una se puede compartir y volver a abrir.
 *
 * Lo que se protege: que sólo UNA quede marcada y que la marca sea EXACTA —
 * con prefijo, «Por edad» (la raíz) quedaría activa estando en «Por concepto»,
 * que es justo el defecto que hace que una barra de pestañas deje de servir.
 * Y que «Cobros emitidos» sea una de ellas: desde el 2026-09-15 la lista de
 * cobros no es un módulo, es una lectura de la cartera que los justifica.
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
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
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
  it('las cuatro lecturas cuelgan de la misma ruta de Cartera', () => {
    montarEn('/panel/inmobiliaria/pagos/cartera')
    expect(PESTANAS_DE_CARTERA.map((p) => p.href)).toEqual([
      '/panel/inmobiliaria/pagos/cartera',
      '/panel/inmobiliaria/pagos/cartera/conceptos',
      '/panel/inmobiliaria/pagos/cartera/por-pagar',
      '/panel/inmobiliaria/pagos/cartera/cobros',
    ])
    expect(host.querySelectorAll('a')).toHaveLength(4)
  })

  it('«Cobros emitidos» es una lectura de la cartera, con su texto traducido', () => {
    montarEn('/panel/inmobiliaria/pagos/cartera/cobros')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cartera/cobros')
    // El stub resuelve contra el es.json REAL: si faltara la clave saldría
    // `cartera.pestanas.cobrosEmitidos` en pantalla.
    expect(marcadas[0]!.textContent).toContain('Cobros emitidos')
  })

  it('en «Por concepto» la marcada es esa, no la raíz', () => {
    montarEn('/panel/inmobiliaria/pagos/cartera/conceptos')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cartera/conceptos')
  })

  it('en la raíz la marcada es «Por edad»', () => {
    montarEn('/panel/inmobiliaria/pagos/cartera')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.textContent).toContain('Por edad')
  })
})
