/**
 * RecorridoHilo — la tira que dice en qué paso está una pantalla.
 *
 * Lo que se protege acá es lo único que la tira tiene que acertar:
 *  · el número del paso y el total
 *  · **de quién es la pelota** — que es la razón de existir del componente
 *  · qué sigue, y que solo sea enlace cuando hay a dónde ir
 *
 * Las claves se resuelven contra el es.json REAL (no un `t: k => k`), así que
 * si alguien renombra una clave el test lo ve: la cadena esperada deja de
 * aparecer y en su lugar sale la ruta de la clave.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

// Sin esto React avisa en cada render que el entorno no soporta act(). No
// cambia el resultado, pero llena la salida de ruido y tapa avisos reales.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { RecorridoHilo } from './RecorridoHilo'

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

describe('RecorridoHilo', () => {
  it('ubica el paso dentro del total', () => {
    const el = montar(<RecorridoHilo paso="alerta" />)
    expect(el.textContent).toContain('Paso 7 de 11')
    expect(el.textContent).toContain('Te llega la postulación')
  })

  it('en un paso de la inmobiliaria dice que le toca', () => {
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    expect(el.textContent).toContain('Te toca')
    expect(el.textContent).not.toContain('Lo hace el inquilino')
  })

  it('en un paso del inquilino dice que está esperando', () => {
    const el = montar(<RecorridoHilo paso="postulacion" />)
    expect(el.textContent).toContain('Lo hace el inquilino')
    expect(el.textContent).not.toContain('Te toca')
  })

  it('anuncia el paso siguiente', () => {
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    // 8 → 9
    expect(el.textContent).toContain('Comparas los candidatos')
  })

  it('el paso siguiente es enlace solo cuando hay a dónde ir', () => {
    // El 6 (postulación) precede al 7, que se atiende en `/postulaciones`.
    const conRuta = montar(<RecorridoHilo paso="postulacion" />)
    expect(conRuta.querySelector('a[href="/panel/inmobiliaria/postulaciones"]')).not.toBeNull()
  })

  it('sin ruta declarada, el paso siguiente es texto y no un enlace muerto', () => {
    // 8 → 9 (comparación) no tiene ruta estática: depende de la propiedad.
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    const enlaces = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(enlaces).not.toContain(null)
    expect(enlaces.some((h) => h?.includes('[id]'))).toBe(false)
  })

  it('acepta una ruta de contexto para los pasos que dependen de una propiedad', () => {
    const el = montar(
      <RecorridoHilo
        paso="comparacion"
        hrefs={{ decision: '/panel/inmobiliaria/propiedades/p-1/candidatos' }}
      />,
    )
    expect(
      el.querySelector('a[href="/panel/inmobiliaria/propiedades/p-1/candidatos"]'),
    ).not.toBeNull()
  })

  it('en el último paso no promete un siguiente', () => {
    const el = montar(<RecorridoHilo paso="contrato" />)
    expect(el.textContent).toContain('Paso 11 de 11')
    expect(el.textContent).not.toContain('Sigue:')
  })

  it('una clave desconocida no tumba la pantalla que la hospeda', () => {
    // @ts-expect-error — el borde se prueba en runtime a propósito
    const el = montar(<RecorridoHilo paso="inventado" />)
    expect(el.textContent).toBe('')
  })

  it('no deja escapar claves i18n sin resolver', () => {
    const el = montar(<RecorridoHilo paso="alerta" />)
    expect(el.textContent).not.toContain('inmobiliaria.recorrido')
  })
})
