/**
 * El `Badge` de la casa y el tinte que el DS dejó hardcodeado.
 *
 * 🔴 19-09-2026 · Visto en el navegador, en TEMA OSCURO, en tres pantallas
 * distintas el mismo día: los oficios de un proveedor, el «Inactivo» de su
 * fila y los ámbitos de una cláusula propia salían como pastillas casi
 * blancas sobre el fondo negro — más brillantes que el nombre del proveedor o
 * el título de la cláusula, que son el dato por el que uno busca. La jerarquía
 * quedaba al revés: gritaba el atributo y susurraba el sujeto.
 *
 * La causa no estaba en ninguna de esas pantallas: el `Badge` del DS define su
 * variante `neutral` con colores literales (`bg-[#F1EFEB] text-[#4D4A45]`) en
 * vez de tokens, así que pinta igual en los dos temas. Se corrige en el shim,
 * como la casa ya había hecho con el tinte del `THead` (ver `table.tsx`).
 *
 * Lo que este archivo sostiene es la DECISIÓN, no el hex: que la variante
 * neutra traiga su corrección de oscuro y que el tema claro no se toque.
 */

import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { Badge } from './badge'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let contenedor: HTMLDivElement
let raiz: Root

function pintar(nodo: React.ReactNode) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  act(() => raiz.render(nodo))
  return contenedor.firstElementChild as HTMLElement
}

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('<Badge>', () => {
  it('🔴 la variante neutra se adapta a oscuro: el DS la dejó en un hex fijo', () => {
    const el = pintar(<Badge variant="secondary">Vivienda urbana</Badge>)
    expect(el.className).toContain('dark:bg-surface-muted')
    expect(el.className).toContain('dark:text-fg-muted')
  })

  it('el tema claro NO se toca: sigue el tinte del DS', () => {
    // #F1EFEB sobre blanco es discreto y no era el problema. Si esta clase
    // desapareciera, el arreglo de oscuro se habría llevado el claro por
    // delante.
    const el = pintar(<Badge variant="secondary">Vivienda urbana</Badge>)
    expect(el.className).toContain('bg-[#F1EFEB]')
  })

  it('las variantes con color propio no reciben la corrección', () => {
    // `danger`, `success` y `warning` del DS ya usan tokens adaptativos:
    // meterles el gris de oscuro las apagaría.
    for (const variante of ['destructive', 'success', 'warning'] as const) {
      const el = pintar(<Badge variant={variante}>x</Badge>)
      expect(el.className, variante).not.toContain('dark:bg-surface-muted')
      act(() => raiz.unmount())
      contenedor.remove()
    }
  })

  it('los variants de riesgo conservan sus clases propias', () => {
    const el = pintar(<Badge variant="risk-a">A</Badge>)
    expect(el.className).toContain('--risk-a')
  })
})
