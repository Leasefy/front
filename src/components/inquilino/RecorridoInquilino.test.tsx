/**
 * La cabecera del recorrido del inquilino.
 *
 * Lo que se protege no es el markup, son las tres preguntas que la pantalla de
 * pago no contestaba:
 *  · de dónde vengo → un destino declarado, que funciona aunque no haya historial
 *  · dónde estoy    → 7 pasos, no los 11 de la inmobiliaria
 *  · de quién es la pelota → y que no diga "te toca a ti" cuando no hay nada
 *    que hacer
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { RecorridoInquilino } from './RecorridoInquilino'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...props }, children),
}))

let contenedor: HTMLDivElement
let root: Root

function pintar(ui: React.ReactElement) {
  act(() => {
    root.render(ui)
  })
  return contenedor
}

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('de dónde vengo', () => {
  it('el volver apunta al paso anterior, con su nombre', () => {
    const el = pintar(<RecorridoInquilino paso="pago" titulo="Paga y conoce tu tope" />)
    const volver = el.querySelector('[data-testid="recorrido-volver"]')
    expect(volver?.textContent).toContain('Pides tu aprobación')
    expect(volver?.getAttribute('href')).toBe('/inquilino/aprobacion')
  })

  it('el primer paso no ofrece volver a ningún lado', () => {
    const el = pintar(<RecorridoInquilino paso="catalogo" titulo="Explorar" />)
    expect(el.querySelector('[data-testid="recorrido-volver"]')).toBeNull()
  })
})

describe('dónde estoy', () => {
  it('cuenta sobre 7, no sobre los 11 de la inmobiliaria', () => {
    const el = pintar(<RecorridoInquilino paso="pago" titulo="Paga y conoce tu tope" />)
    expect(el.textContent).toContain('Paso 3 de 7')
    expect(el.textContent).not.toContain('de 11')
  })

  it('el título es el h1 de la pantalla', () => {
    const el = pintar(<RecorridoInquilino paso="pago" titulo="Paga y conoce tu tope" />)
    expect(el.querySelectorAll('h1')).toHaveLength(1)
    expect(el.querySelector('h1')?.textContent).toBe('Paga y conoce tu tope')
  })

  it('dice qué sigue, pero no deja saltárselo', () => {
    const el = pintar(<RecorridoInquilino paso="pago" titulo="x" />)
    expect(el.textContent).toContain('Consultamos a las aseguradoras')
    // El único link es el de volver: "después" es el resultado de esta
    // pantalla, no un lugar al que ir todavía.
    expect(el.querySelectorAll('a')).toHaveLength(1)
  })

  it('una clave desconocida no tumba la pantalla que la hospeda', () => {
    // @ts-expect-error a propósito: puede llegar de datos viejos
    const el = pintar(<RecorridoInquilino paso="inventado" titulo="x" />)
    expect(el.textContent).toBe('')
  })
})

describe('de quién es la pelota', () => {
  it('pagar es suyo', () => {
    const el = pintar(<RecorridoInquilino paso="pago" titulo="x" />)
    expect(el.textContent).toContain('Te toca a ti')
  })

  it('esperar la consulta a las aseguradoras no', () => {
    const el = pintar(<RecorridoInquilino paso="aseguradoras" titulo="x" />)
    expect(el.textContent).toContain('Lo hacemos nosotros')
  })

  it('la pantalla puede pisar el turno cuando sabe que no hay nada que hacer', () => {
    // El caso real: el paso 3 es suyo, pero sin cobro del lado del servidor no
    // tiene ningún botón que apretar. "Te toca a ti" ahí es tan falso como un
    // "reintentar" sobre un 404.
    const el = pintar(<RecorridoInquilino paso="pago" titulo="x" turno="nuestro" />)
    expect(el.textContent).toContain('Lo hacemos nosotros')
    expect(el.textContent).not.toContain('Te toca a ti')
  })

  it('el estado nunca se comunica sólo con color: siempre hay texto', () => {
    for (const paso of ['pago', 'aseguradoras', 'decideLaInmobiliaria'] as const) {
      const el = pintar(<RecorridoInquilino paso={paso} titulo="x" />)
      expect(el.textContent).toMatch(/Te toca a ti|Lo hacemos nosotros|Esperas a la inmobiliaria/)
    }
  })
})
