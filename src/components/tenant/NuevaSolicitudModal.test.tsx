/**
 * NuevaSolicitudModal — la cáscara es el `Dialog` canónico (DESIGN.md §17).
 *
 * Antes era una capa `fixed inset-0` hecha a mano: el clic en el fondo cerraba
 * salvo mientras enviaba, y la ✕ y Cancelar se apagaban mientras enviaba. Ese
 * bloqueo ahora vive en el `onOpenChange` (Esc, el velo y la ✕ pasan por ahí):
 * acá se prueba que siga en pie.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  create: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/api/pqrs.service', () => ({
  pqrsApi: { create: h.create },
  PqrsUnavailableError: class PqrsUnavailableError extends Error {},
}))

import { NuevaSolicitudModal } from './NuevaSolicitudModal'

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
  vi.clearAllMocks()
})

function montar(onClose = vi.fn()) {
  act(() => {
    raiz.render(<NuevaSolicitudModal open onClose={onClose} />)
  })
  return onClose
}

/** Radix pinta el diálogo en un portal sobre `document.body`. */
function dialogo(): HTMLElement {
  const d = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!d) throw new Error('El diálogo no está abierto')
  return d
}

const boton = (texto: string) => {
  const b = Array.from(dialogo().querySelectorAll('button')).find(
    (el) => el.textContent?.trim() === texto,
  )
  if (!b) throw new Error(`No está el botón «${texto}»`)
  return b as HTMLButtonElement
}

function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function esc() {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
}

describe('<NuevaSolicitudModal>', () => {
  it('es el Dialog canónico: título en la cabecera, una sola ✕ y las acciones en el pie', () => {
    montar()
    expect(dialogo().querySelector('h2')?.textContent).toBe('Nueva solicitud')
    expect(document.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1)
    expect(boton('Cancelar')).toBeTruthy()
    expect(boton('Enviar solicitud')).toBeTruthy()
  })

  it('sin envío en curso, Esc cierra', () => {
    const onClose = montar()
    esc()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('🔴 mientras envía no se sale: ni Esc ni la ✕ cierran, y Cancelar queda apagado', async () => {
    // El back nunca responde: el formulario se queda enviando.
    h.create.mockReturnValue(new Promise(() => {}))
    const onClose = montar()

    act(() => {
      escribir(dialogo().querySelector('#solicitud-asunto') as HTMLInputElement, 'Fuga en el baño')
      escribir(
        dialogo().querySelector('#solicitud-descripcion') as HTMLTextAreaElement,
        'Gotea el lavamanos',
      )
    })
    await act(async () => {
      boton('Enviar solicitud').click()
      await Promise.resolve()
    })

    expect(h.create).toHaveBeenCalledTimes(1)
    esc()
    act(() => (document.querySelector('[aria-label="Cerrar"]') as HTMLElement).click())
    expect(onClose).not.toHaveBeenCalled()
    expect(boton('Cancelar').disabled).toBe(true)
  })
})
