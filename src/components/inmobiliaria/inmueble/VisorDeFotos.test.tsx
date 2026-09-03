/**
 * El visor muestra la foto abierta, pasa con flechas (circular), tiene tira
 * de miniaturas y cierra con Escape. Nico (2026-09-02): «me debería dejar
 * ver todas las imágenes que tenga el inmueble».
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { VisorDeFotos } from './VisorDeFotos'

const FOTOS = ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg', 'https://cdn.test/c.jpg']

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(indice: number | null) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onCerrar = vi.fn()
  const onCambiar = vi.fn()
  act(() => {
    root.render(<VisorDeFotos fotos={FOTOS} indice={indice} onCerrar={onCerrar} onCambiar={onCambiar} titulo="Apto Chapinero" />)
  })
  return { onCerrar, onCambiar }
}

const visor = () => document.querySelector<HTMLElement>('[data-testid="visor-de-fotos"]')

describe('VisorDeFotos', () => {
  it('cerrado no pinta nada', () => {
    montar(null)
    expect(visor()).toBeNull()
  })

  it('abierto muestra la foto pedida, el contador y una miniatura por foto', () => {
    montar(1)
    expect(visor()).not.toBeNull()
    expect(document.querySelector<HTMLImageElement>('[data-testid="visor-foto"]')?.getAttribute('src')).toBe(FOTOS[1])
    expect(document.querySelector('[data-testid="visor-contador"]')?.textContent).toBe('2 / 3')
    expect(document.querySelectorAll('[data-testid="visor-tira"] button')).toHaveLength(3)
  })

  it('las flechas pasan de foto y dan la vuelta al llegar al final', () => {
    const { onCambiar } = montar(2)
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="visor-siguiente"]')!.click())
    expect(onCambiar).toHaveBeenLastCalledWith(0)
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="visor-anterior"]')!.click())
    expect(onCambiar).toHaveBeenLastCalledWith(1)
  })

  it('las teclas ← → también, y una miniatura salta directo', () => {
    const { onCambiar } = montar(0)
    act(() => {
      visor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(onCambiar).toHaveBeenLastCalledWith(1)
    act(() => {
      visor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(onCambiar).toHaveBeenLastCalledWith(2)
    act(() => document.querySelectorAll<HTMLButtonElement>('[data-testid="visor-tira"] button')[2].click())
    expect(onCambiar).toHaveBeenLastCalledWith(2)
  })

  it('Escape cierra', () => {
    const { onCerrar } = montar(0)
    act(() => {
      visor()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onCerrar).toHaveBeenCalled()
  })
})
