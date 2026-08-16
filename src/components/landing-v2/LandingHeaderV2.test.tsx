/**
 * LandingHeaderV2 — el header de la landing, uno solo.
 *
 * Vivía embebido en el JSX de `LandingHome`, así que `/propiedades` terminó
 * con OTRO header (el mega-menú viejo): otras rutas, otra tipografía, otra
 * forma. Estos tests fijan lo que hace que sea el mismo header en los dos
 * lados, y que diga dónde estás.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null }),
}))

import { LandingHeaderV2 } from './LandingHeaderV2'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(props: Parameters<typeof LandingHeaderV2>[0] = {}) {
  act(() => {
    root.render(<LandingHeaderV2 {...props} />)
  })
}

describe('LandingHeaderV2', () => {
  it('trae los mismos enlaces del nav de la landing', () => {
    montar({ fxExterno: true })
    const rutas = [...container.querySelectorAll('nav.main a')].map((a) => a.getAttribute('href'))
    expect(rutas).toEqual(['#producto', '/propiedades', '/avaluo', '/blog', '/contacto'])
  })

  describe('dónde estás', () => {
    it('marca el enlace activo con aria-current', () => {
      // `aria-current="page"` y no una clase: es lo que los lectores de
      // pantalla ya anuncian, así que el estado se declara una sola vez.
      montar({ activo: 'inmuebles', fxExterno: true })
      const activo = container.querySelector('nav.main a[aria-current="page"]')
      expect(activo?.getAttribute('href')).toBe('/propiedades')
      expect(activo?.textContent).toContain('Buscar inmueble')
    })

    it('marca uno solo POR NAVEGACIÓN', () => {
      // Hay dos navs en el DOM —el de escritorio y el del menú móvil— y cada
      // uno marca el suyo. Contarlos juntos daría dos y parecería un error;
      // lo que sería un error es que un nav marcara dos enlaces.
      montar({ activo: 'inmuebles', fxExterno: true })
      expect(container.querySelectorAll('nav.main a[aria-current="page"]')).toHaveLength(1)
      expect(container.querySelectorAll('#mmenu nav a[aria-current="page"]')).toHaveLength(1)
    })

    it('sin `activo` no marca ninguno — en la landing no estás "dentro" de nada', () => {
      montar({ fxExterno: true })
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
    })
  })

  describe('quién maneja el comportamiento', () => {
    it('con fxExterno no toca el header: lo monta initLandingFx', () => {
      // En la landing, `initLandingFx` ya engancha scroll, menú y reveals.
      // Dos dueños del mismo nodo se pisan.
      montar({ fxExterno: true })
      const hdr = container.querySelector('#hdr')
      expect(hdr?.className).toBe('')
    })

    it('solo, se pone en su estado claro — no hay hero oscuro detrás', () => {
      // Sin esto el nav sale blanco sobre blanco: `header:not(.scrolled)`
      // pinta los enlaces en #fff porque asume el hero de la home.
      montar({ activo: 'inmuebles' })
      const hdr = container.querySelector('#hdr')
      expect(hdr?.classList.contains('scrolled')).toBe(true)
      expect(hdr?.classList.contains('on')).toBe(true)
    })
  })

  describe('el menú móvil', () => {
    it('lleva Buscar inmueble', () => {
      montar({ activo: 'inmuebles', fxExterno: true })
      const enMovil = [...container.querySelectorAll('#mmenu nav a')].map((a) =>
        a.getAttribute('href'),
      )
      expect(enMovil).toContain('/propiedades')
    })

    it('también marca dónde estás', () => {
      // La regla `.lv2 .mmenu nav a[aria-current="page"] .t` existía y no
      // pintaba nada: el atributo sólo se había puesto en el nav de escritorio.
      // En un teléfono, el menú ES el nav.
      montar({ activo: 'inmuebles', fxExterno: true })
      const activo = container.querySelector('#mmenu nav a[aria-current="page"]')
      expect(activo?.getAttribute('href')).toBe('/propiedades')
    })
  })
})
