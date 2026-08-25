/**
 * Un modal abierto muestra UNA sola ✕.
 *
 * El test estático hermano (`modales-alineados.test.ts`) mira el código de la
 * primitiva. No alcanzó: «Agendar una cita» salía con dos aspas y ese test
 * pasaba en verde, porque la primitiva estaba bien y lo que fallaba era el
 * RECONOCIMIENTO de la cabecera. `DialogContent` buscaba `hijo.type ===
 * DialogHeader` y `ResponsiveDialogHeader` —que adentro renderiza justamente
 * un `DialogHeader`— es otro componente: no calificaba, la cabecera se iba al
 * cuerpo con scroll y el Content encendía la ✕ del DS encima de la del chip.
 *
 * Por eso este test monta de verdad y CUENTA los botones de cierre.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './dialog'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from './responsive-dialog'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

function montar(ui: React.ReactElement) {
  act(() => raiz.render(ui))
}

/**
 * Toda ✕ del producto se anuncia igual, así que contarlas por su nombre
 * accesible es a la vez el test del defecto y el de accesibilidad: si alguien
 * deja el aspa sin `aria-label`, este contador da 0 y el test falla.
 *
 * Radix portalea a `document.body`, no al contenedor: se busca en todo el
 * documento a propósito.
 */
const aspas = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Cerrar"]'))

/** El chip gris redondo es el único dibujo permitido. */
const esChipGris = (el: HTMLElement) =>
  el.className.includes('rounded-full') && el.className.includes('bg-surface-muted')

const texto = (t: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('*')).find(
    (el) => el.children.length === 0 && el.textContent?.trim() === t,
  )

describe('un modal abierto tiene UNA sola ✕', () => {
  it('Dialog con cabecera: una, con el chip gris', () => {
    montar(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar una cita</DialogTitle>
          </DialogHeader>
          <p>cuerpo</p>
          <DialogFooter>
            <button type="button">Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    expect(aspas()).toHaveLength(1)
    expect(esChipGris(aspas()[0])).toBe(true)
    expect(aspas()[0].tagName).toBe('BUTTON')
  })

  // El caso del defecto: el call site escribe `ResponsiveDialogHeader`, que NO
  // es `DialogHeader`. Antes de arreglarlo, acá salían DOS.
  it('ResponsiveDialog con cabecera: una, no dos', () => {
    montar(
      <ResponsiveDialog open>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Agendar una cita</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <p>cuerpo</p>
          <ResponsiveDialogFooter>
            <button type="button">Agendar</button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )

    expect(aspas()).toHaveLength(1)
    expect(esChipGris(aspas()[0])).toBe(true)
  })

  it('sin cabecera: sigue habiendo una, flotando, y con el mismo dibujo', () => {
    montar(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="sr-only">Sin cabecera</DialogTitle>
          <p>cuerpo</p>
        </DialogContent>
      </Dialog>,
    )

    expect(aspas()).toHaveLength(1)
    expect(esChipGris(aspas()[0])).toBe(true)
    expect(aspas()[0].className).toContain('absolute')
  })

  it('`hideClose` en el Content la apaga entera: cero, no una tapada por otra', () => {
    montar(
      <Dialog open>
        <DialogContent hideClose>
          <DialogHeader hideClose>
            <DialogTitle>Firma en curso</DialogTitle>
          </DialogHeader>
          <p>cuerpo</p>
        </DialogContent>
      </Dialog>,
    )

    expect(aspas()).toHaveLength(0)
  })
})

describe('el reparto de bandas sobrevive a los envoltorios', () => {
  // Si la cabecera no se reconoce, además de las dos ✕ se va al cuerpo con
  // scroll: el título desaparece al bajar en un modal alto. Es el mismo
  // defecto visto desde el layout.
  it('la cabecera y el pie del ResponsiveDialog quedan FUERA del cuerpo que scrollea', () => {
    montar(
      <ResponsiveDialog open>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Agendar una cita</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <p>cuerpo</p>
          <ResponsiveDialogFooter>
            <button type="button">Agendar</button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )

    expect(texto('Agendar una cita')?.closest('.overflow-y-auto')).toBeFalsy()
    expect(texto('Agendar')?.closest('.overflow-y-auto')).toBeFalsy()
    // El cuerpo sí scrollea, que es de lo que se trata todo esto.
    expect(texto('cuerpo')?.closest('.overflow-y-auto')).toBeTruthy()
  })
})
