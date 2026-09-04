/**
 * La zona de subida: soltar o elegir entrega sólo las fotos válidas, ya
 * recortadas al cupo, y avisa de las que no. Nico (2026-09-02): «que se deje
 * de una manera más fácil subirlas y más bonita».
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toastMock } = vi.hoisted(() => ({
  toastMock: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))

import { SubidaDeFotos, filtrarFotos } from './SubidaDeFotos'

function archivo(nombre: string, tipo = 'image/jpeg', bytes = 1024) {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo })
}

let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  vi.clearAllMocks()
})

function montar(props: Partial<React.ComponentProps<typeof SubidaDeFotos>> = {}) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  const onArchivos = vi.fn()
  act(() => {
    r.render(<SubidaDeFotos variante="grande" cupo={5} maximo={40} onArchivos={onArchivos} {...props} />)
  })
  return { onArchivos, container: c }
}

describe('filtrarFotos', () => {
  it('deja pasar las válidas, avisa de las inválidas y recorta al cupo', () => {
    const validas = filtrarFotos(
      [archivo('a.jpg'), archivo('malo.gif', 'image/gif'), archivo('b.png', 'image/png'), archivo('c.webp', 'image/webp')],
      2,
    )
    expect(validas.map((f) => f.name)).toEqual(['a.jpg', 'b.png'])
    expect(toastMock.error).toHaveBeenCalledTimes(1)
    expect(toastMock.warning).toHaveBeenCalledTimes(1)
  })
})

describe('SubidaDeFotos', () => {
  it('soltar archivos entrega las fotos válidas', () => {
    const { onArchivos, container } = montar()
    const zona = container.querySelector<HTMLElement>('[data-testid="subida-fotos-grande"]')!
    const dt = { files: [archivo('a.jpg'), archivo('b.jpg')], types: ['Files'] }
    act(() => {
      const ev = new Event('drop', { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown }
      Object.defineProperty(ev, 'dataTransfer', { value: dt })
      zona.dispatchEvent(ev)
    })
    expect(onArchivos).toHaveBeenCalledTimes(1)
    expect(onArchivos.mock.calls[0][0].map((f: File) => f.name)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('elegir desde el input también, y con cupo 0 no entrega nada', () => {
    const { onArchivos, container } = montar({ cupo: 0 })
    const input = container.querySelector<HTMLInputElement>('[data-testid="subida-fotos-input"]')!
    expect(input.disabled).toBe(true)
    expect(onArchivos).not.toHaveBeenCalled()
  })

  it('la variante «ficha» es un botón chico que dice cuántos lugares quedan', () => {
    const { container } = montar({ variante: 'ficha', cupo: 3 })
    const boton = container.querySelector<HTMLButtonElement>('[data-testid="subida-fotos-ficha"]')
    expect(boton?.textContent).toContain('3 lugares')
  })
})
