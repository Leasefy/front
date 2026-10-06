/**
 * QA-CONT-95 I-09 (ronda 3): las pastillas y alertas de éxito y advertencia
 * pintan el texto con el tono de TEXTO de la casa (-700 en claro, -100 en
 * oscuro), no con el color de relleno: axe medía 4,36:1 y 3,23:1 en claro y
 * 3,28:1 en oscuro sobre su fondo suave.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Badge } from './badge'
import { AlertaAccionable } from './alerta-accionable'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let raiz: Root
let contenedor: HTMLDivElement
beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})
afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})
const pintar = (n: React.ReactElement) => {
  act(() => raiz.render(n))
  return contenedor.firstElementChild as HTMLElement
}

describe('I-09: tinta legible', () => {
  it('la pastilla de éxito («Activo») usa success-700 / success-100 y ya no el relleno', () => {
    const c = pintar(<Badge variant="success">Activo</Badge>).className.split(/\s+/)
    expect(c).toContain('text-success-700')
    expect(c).toContain('dark:text-success-100')
    expect(c).not.toContain('text-success')
  })

  it('la de advertencia usa warning-700 / warning-100', () => {
    const c = pintar(<Badge variant="warning">Pendiente</Badge>).className.split(/\s+/)
    expect(c).toContain('text-warning-700')
    expect(c).toContain('dark:text-warning-100')
    expect(c).not.toContain('text-warning')
  })

  it('la alerta de advertencia pinta título y texto con warning-700 / warning-100', () => {
    const c = pintar(<AlertaAccionable titulo="Tu inmobiliaria no ha fijado los días de plazo">x</AlertaAccionable>).className.split(/\s+/)
    expect(c).toContain('text-warning-700')
    expect(c).toContain('dark:text-warning-100')
    expect(c).not.toContain('text-warning')
  })

  it('la de información no cambia (ya traía su título oscuro)', () => {
    const c = pintar(<AlertaAccionable severidad="info" titulo="x" />).className.split(/\s+/)
    expect(c).not.toContain('text-warning-700')
    expect(c).toContain('text-info')
  })
})
