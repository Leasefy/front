/**
 * Lo que se protege acá es que el botón **haga algo** siempre.
 *
 * Un CTA de opinión es justo la clase de cosa que se rompe en silencio: si el
 * script de terceros no carga —bloqueador, red, dominio caído— nadie se entera,
 * porque no hay error visible, solo un botón que no reacciona. Y este repo ya
 * tuvo cuatro acciones que fingían funcionar sin hacer nada.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

import { FeedbackCta } from './FeedbackCta'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let contenedor: HTMLDivElement | null = null
let root: Root | null = null

function pintar(props: Parameters<typeof FeedbackCta>[0] = {}) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() => root!.render(<FeedbackCta {...props} />))
  return contenedor.querySelector('button')!
}

/** El script real nunca se descarga en los tests: se simula su resultado. */
function simularCargaDelScript(exito: boolean) {
  const original = document.head.appendChild.bind(document.head)
  vi.spyOn(document.head, 'appendChild').mockImplementation(((nodo: Node) => {
    if (nodo instanceof HTMLScriptElement && nodo.src.includes('tally.so')) {
      queueMicrotask(() => nodo.dispatchEvent(new Event(exito ? 'load' : 'error')))
      return nodo
    }
    return original(nodo as never)
  }) as typeof document.head.appendChild)
}

beforeEach(() => {
  delete (window as { Tally?: unknown }).Tally
  document.querySelectorAll('script[src*="tally.so"]').forEach((s) => s.remove())
})

afterEach(() => {
  act(() => root?.unmount())
  contenedor?.remove()
  contenedor = null
  root = null
  vi.restoreAllMocks()
})

describe('FeedbackCta', () => {
  it('se lee: es el único con texto del grupo de iconos', () => {
    const boton = pintar()
    expect(boton.textContent).toContain('Ayúdanos a mejorar')
  })

  it('en inglés cambia la etiqueta', () => {
    const boton = pintar({ locale: 'en' })
    expect(boton.textContent).toContain('Help us improve')
  })

  it('abre el popup de Tally con el formulario correcto', async () => {
    const openPopup = vi.fn()
    simularCargaDelScript(true)
    // El script real define `window.Tally` al cargar; acá se hace a mano.
    vi.spyOn(document.head, 'appendChild')
    ;(window as { Tally?: unknown }).Tally = { openPopup }

    const boton = pintar({ hiddenFields: { panel: 'inmobiliaria' } })
    await act(async () => {
      boton.click()
      await Promise.resolve()
    })

    expect(openPopup).toHaveBeenCalledTimes(1)
    const [formId, opts] = openPopup.mock.calls[0]
    expect(formId).toBe('pbN2q8')
    expect(opts.hiddenFields).toEqual({ panel: 'inmobiliaria' })
    expect(opts.overlay).toBe(true)
  })

  it('si el script no carga, abre el formulario en una pestaña en vez de quedarse mudo', async () => {
    simularCargaDelScript(false)
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    const boton = pintar()
    await act(async () => {
      boton.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(open).toHaveBeenCalledTimes(1)
    expect(String(open.mock.calls[0][0])).toContain('pbN2q8')
  })
})
