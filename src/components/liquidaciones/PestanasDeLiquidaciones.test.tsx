/**
 * Liquidaciones y su cola de aprobaciones son rutas hermanas.
 *
 * Lo que se protege: que «Por aprobar» —la antigua `/pagos/cola`, una pestaña
 * del tercer renglón que se retiró el 2026-09-16— tenga su puerta DENTRO de la
 * cara propietarios, y que la marca sea exacta: con prefijo, «Liquidaciones»
 * (la raíz) quedaría activa también estando en «Por aprobar».
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

import { PESTANAS_DE_LIQUIDACIONES, PestanasDeLiquidaciones } from './PestanasDeLiquidaciones'

let host: HTMLDivElement
let root: Root

function montarEn(ruta: string) {
  rutaMock.mockReturnValue(ruta)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<PestanasDeLiquidaciones />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('PestanasDeLiquidaciones', () => {
  it('las dos lecturas cuelgan de Liquidaciones', () => {
    montarEn('/panel/inmobiliaria/pagos/liquidaciones')
    expect(PESTANAS_DE_LIQUIDACIONES.map((p) => p.href)).toEqual([
      '/panel/inmobiliaria/pagos/liquidaciones',
      '/panel/inmobiliaria/pagos/liquidaciones/por-aprobar',
    ])
    expect(host.querySelectorAll('a')).toHaveLength(2)
  })

  it('en «Por aprobar» la marcada es esa, no la raíz', () => {
    montarEn('/panel/inmobiliaria/pagos/liquidaciones/por-aprobar')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/liquidaciones/por-aprobar')
    // El stub resuelve contra el es.json REAL: si faltara la clave saldría la
    // clave cruda en pantalla.
    expect(marcadas[0]!.textContent).toContain('Por aprobar')
  })

  it('en la raíz la marcada es «Liquidaciones»', () => {
    montarEn('/panel/inmobiliaria/pagos/liquidaciones')
    const marcadas = Array.from(host.querySelectorAll('a[aria-current="page"]'))
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]!.textContent).toContain('Liquidaciones')
  })
})
