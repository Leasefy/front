/**
 * AgentHeaderBreadcrumb — que una ficha tenga cómo volver a su tabla.
 *
 * El defecto: `current` sale de un match por PREFIJO, así que en
 * `…/cobranza/deudores/<id>` la pestaña que gana es «Casos», y se pintaba como
 * página actual: texto plano, sin enlace. La ficha quedaba sin salida.
 *
 * El breadcrumb decía «estás en Casos» estando en un caso, y la pestaña de
 * arriba —el único otro camino de vuelta— se veía activa y con
 * `aria-current="page"`, o sea «ya estás acá». Nadie la leía como salida.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ruta = { actual: '/panel/inmobiliaria/cobros/cobranza' }

vi.mock('next/navigation', () => ({
  usePathname: () => ruta.actual,
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => React.createElement('a', { href }, children),
}))

vi.mock('@/lib/i18n', () => ({
  // Devuelve la última parte de la clave: alcanza para distinguir escalones.
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))

import { AgentHeaderBreadcrumb } from './AgentHeaderBreadcrumb'

let container: HTMLDivElement
let root: Root

function render(pathname: string) {
  ruta.actual = pathname
  act(() => {
    root.render(React.createElement(AgentHeaderBreadcrumb))
  })
}

/** Texto → href (null si no es enlace) de cada escalón. */
function escalones(): Array<{ texto: string; href: string | null }> {
  return [...container.querySelectorAll('li')].map((li) => ({
    texto: (li.textContent ?? '').trim(),
    href: li.querySelector('a')?.getAttribute('href') ?? null,
  }))
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('AgentHeaderBreadcrumb — la ficha tiene cómo volver', () => {
  it('en la TABLA, la pestaña es la página actual y no lleva enlace', () => {
    render('/panel/inmobiliaria/cobros/cobranza/deudores')

    const casos = escalones().find((e) => e.texto === 'cobranzaCasos')
    expect(casos, 'debería estar el escalón de la pestaña').toBeTruthy()
    expect(casos?.href, 'la página actual no se enlaza a sí misma').toBeNull()
  })

  it('en la FICHA, la pestaña SÍ lleva enlace de vuelta a la tabla', () => {
    render('/panel/inmobiliaria/cobros/cobranza/deudores/abc-123')

    const casos = escalones().find((e) => e.texto === 'cobranzaCasos')
    expect(casos?.href).toBe('/panel/inmobiliaria/cobros/cobranza/deudores')
  })

  it('la ficha agrega su propio escalón, para no terminar en un enlace', () => {
    render('/panel/inmobiliaria/cobros/cobranza/deudores/abc-123')

    const items = escalones()
    expect(items[items.length - 1].texto).toContain('detalle')
    expect(
      items[items.length - 1].href,
      'el último escalón nunca es enlace',
    ).toBeNull()
  })

  it('«Cobranza» sigue llevando a su resumen desde la ficha', () => {
    render('/panel/inmobiliaria/cobros/cobranza/deudores/abc-123')

    const cobranza = escalones().find((e) => e.texto === 'cobranza')
    expect(cobranza?.href).toBe('/panel/inmobiliaria/cobros/cobranza')
  })

  it('en el resumen del agente no se inventa un escalón de más', () => {
    render('/panel/inmobiliaria/cobros/cobranza')
    expect(escalones().some((e) => e.texto.includes('detalle'))).toBe(false)
  })

  it('arranca en el MÓDULO dueño, no en «Agentes IA»: Cobros › Cobranza › Casos › Detalle', () => {
    render('/panel/inmobiliaria/cobros/cobranza/deudores/abc-123')

    const items = escalones().filter((e) => e.texto !== '') // sin el icono de casa
    expect(items[0].texto).toBe('cobros')
    expect(items[0].href).toBe('/panel/inmobiliaria/cobros')
    expect(items.map((e) => e.texto)).toEqual(['cobros', 'cobranza', 'cobranzaCasos', 'detalle'])
  })

  it('cuando el agente ES la raíz del módulo (Pagos) no repite el nombre', () => {
    render('/panel/inmobiliaria/pagos/cola')

    const items = escalones().filter((e) => e.texto !== '')
    expect(items[0].texto).toBe('pagos')
    expect(items.filter((e) => e.texto === 'pagos')).toHaveLength(1)
  })

  it('en Pagos, las pantallas hermanas (Dispersiones) no son del agente: no se renderiza', () => {
    render('/panel/inmobiliaria/pagos/dispersiones/lotes/1')
    expect(container.textContent).toBe('')
  })

  it('una ficha que no cuelga de ninguna pestaña igual tiene camino de vuelta (Conciliación)', () => {
    render('/panel/inmobiliaria/conciliacion/caso-9')

    const items = escalones().filter((e) => e.texto !== '')
    expect(items[0].texto).toBe('conciliacion')
    expect(items[0].href).toBe('/panel/inmobiliaria/conciliacion')
    expect(items[items.length - 1].texto).toContain('detalle')
  })

  it('fuera de un workspace de agente no se renderiza nada', () => {
    render('/panel/inmobiliaria/inmuebles')
    expect(container.textContent).toBe('')
  })
})
