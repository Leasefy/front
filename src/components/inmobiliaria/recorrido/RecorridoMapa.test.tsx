/**
 * RecorridoMapa — los 11 pasos con el corte donde cambia de manos.
 *
 * Lo que se protege:
 *  · están los 11, con su descripción
 *  · el corte aparece UNA sola vez, entre el 6 y el 7
 *  · los pasos de la inmobiliaria que tienen pantalla son navegables, y los
 *    que no la tienen lo dicen en vez de fingir un enlace
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

// El mapa oculta el enlace del paso en cuya pantalla ya estás.
const pathnameMock = vi.fn(() => '/panel/inmobiliaria/otra-cosa')
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock() }))

// Sin esto React avisa en cada render que el entorno no soporta act(). No
// cambia el resultado, pero llena la salida de ruido y tapa avisos reales.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { RecorridoMapa } from './RecorridoMapa'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

function montar(ui: React.ReactElement) {
  act(() => root.render(ui))
  return contenedor
}

describe('RecorridoMapa', () => {
  it('lista los 11 pasos', () => {
    const el = montar(<RecorridoMapa />)
    expect(el.querySelectorAll('li')).toHaveLength(11)
  })

  it('el recorrido cambia de manos una sola vez', () => {
    const el = montar(<RecorridoMapa />)
    const cortes = el.textContent?.match(/Acá cambia de manos/g) ?? []
    expect(cortes).toHaveLength(1)
  })

  it('el corte cae entre el paso del inquilino y el primero de la inmobiliaria', () => {
    const el = montar(<RecorridoMapa />)
    const items = [...el.querySelectorAll('li')]
    // El corte se dibuja dentro del <li> del paso 7 (índice 6).
    expect(items[6].textContent).toContain('Acá cambia de manos')
    expect(items[5].textContent).not.toContain('Acá cambia de manos')
  })

  it('marca de quién es cada paso', () => {
    const el = montar(<RecorridoMapa />)
    const items = [...el.querySelectorAll('li')]
    expect(items[0].textContent).toContain('Inquilino')
    expect(items[10].textContent).toContain('Tú')
  })

  it('sin paso actual NO da ningún paso por hecho', () => {
    // Regresión de un defecto que solo se vio en pantalla: la página del paso 7
    // pasaba `pasoActual="alerta"` siempre, así que con la bandeja vacía —sin
    // un solo candidato— el mapa mostraba los seis primeros pasos con ✓, como
    // si alguien los hubiera cumplido. Sin paso actual, todas las marcas
    // conservan su número.
    const el = montar(<RecorridoMapa />)
    const marcas = [...el.querySelectorAll('[data-paso]')].map((s) => s.textContent)
    expect(marcas).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
    expect(el.textContent).toContain('Explora el catálogo')
  })

  it('con paso actual sí marca como cumplidos los anteriores', () => {
    const el = montar(<RecorridoMapa pasoActual="alerta" />)
    const marcas = [...el.querySelectorAll('[data-paso]')].map((s) => s.textContent)
    // Los seis del inquilino quedaron atrás: el número deja lugar al ✓.
    expect(marcas.slice(0, 6)).toEqual(['', '', '', '', '', ''])
    // El 7 es el actual y conserva el suyo.
    expect(marcas[6]).toBe('7')
    // Y los que faltan siguen numerados.
    expect(marcas.slice(7)).toEqual(['8', '9', '10', '11'])
  })

  it('no ofrece "Ver" hacia la pantalla en la que ya estás', () => {
    pathnameMock.mockReturnValue('/panel/inmobiliaria/postulaciones')
    const el = montar(<RecorridoMapa />)
    const items = [...el.querySelectorAll('li')]
    expect(items[6].querySelector('a')).toBeNull()
    // …y ese paso NO cae en "todavía sin pantalla": la pantalla es esta.
    expect(items[6].textContent).not.toContain('Todavía sin pantalla')
    pathnameMock.mockReturnValue('/panel/inmobiliaria/otra-cosa')
  })

  it('con paso actual, los anteriores quedan atrás y el actual se destaca', () => {
    const el = montar(<RecorridoMapa pasoActual="comparacion" />)
    const items = [...el.querySelectorAll('li')]
    // El 9 es el actual: su marca conserva el número.
    expect(items[8].textContent).toContain('9')
    expect(items[8].textContent).toContain('Comparas los candidatos')
  })

  it('los pasos con pantalla son navegables', () => {
    const el = montar(<RecorridoMapa />)
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/panel/inmobiliaria/postulaciones')
    expect(hrefs).toContain('/panel/inmobiliaria/ai/estudio/cola')
    expect(hrefs).toContain('/panel/inmobiliaria/contratos')
  })

  it('ningún paso lleva a una pantalla que exige un parámetro', () => {
    // `/contratos/nuevo` lee `?applicationId=` y sin él muestra "Falta el
    // parámetro applicationId". Desde un mapa no hay de dónde sacar ese id.
    const el = montar(<RecorridoMapa />)
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).not.toContain('/panel/inmobiliaria/contratos/nuevo')
  })

  it('ya no hay pasos suyos sin pantalla', () => {
    // Comparar (9) y decidir (10) eran pasos muertos en el mapa: no existía
    // dónde hacerlos. Desde que la comparación vive en
    // `/propiedades/:id/candidatos/comparar` y elegir abre el aviso a los no
    // elegidos, los 11 pasos llevan a algún lado.
    const el = montar(<RecorridoMapa />)
    expect(el.textContent).not.toContain('Todavía sin pantalla')
    const items = [...el.querySelectorAll('li')]
    expect(items[8].querySelector('a')).not.toBeNull()
    expect(items[9].querySelector('a')).not.toBeNull()
  })

  it('una ruta de contexto manda esos pasos al inmueble concreto', () => {
    const el = montar(
      <RecorridoMapa
        hrefs={{
          comparacion: '/panel/inmobiliaria/propiedades/p-9/candidatos',
          decision: '/panel/inmobiliaria/propiedades/p-9/candidatos',
        }}
      />,
    )
    const items = [...el.querySelectorAll('li')]
    expect(items[8].querySelector('a')?.getAttribute('href'))
      .toBe('/panel/inmobiliaria/propiedades/p-9/candidatos')
  })

  it('los pasos del inquilino nunca dicen "sin pantalla" — no son suyos', () => {
    const el = montar(<RecorridoMapa />)
    const items = [...el.querySelectorAll('li')]
    for (const i of [0, 1, 2, 3, 4, 5]) {
      expect(items[i].textContent).not.toContain('Todavía sin pantalla')
    }
  })

  it('no deja escapar claves i18n sin resolver', () => {
    const el = montar(<RecorridoMapa pasoActual="alerta" />)
    expect(el.textContent).not.toContain('inmobiliaria.recorrido')
  })
})
