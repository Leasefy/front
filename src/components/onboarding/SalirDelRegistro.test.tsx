/**
 * Salir del registro tiene que preguntar. Antes no había salida: la única era
 * cerrar la pestaña, y cerrarla no avisa que lo escrito se conserva.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, back: vi.fn() }),
}))

import { SalirDelRegistro } from './SalirDelRegistro'

let container: HTMLDivElement
let root: Root

const clickPorTexto = (texto: string) => {
  const nodo = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto,
  )
  expect(nodo, `no encontré el botón "${texto}"`).toBeTruthy()
  act(() => {
    nodo!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  return nodo!
}

beforeEach(() => {
  replaceMock.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('<SalirDelRegistro>', () => {
  it('no sale de una: primero pregunta', () => {
    act(() => root.render(<SalirDelRegistro />))

    expect(document.body.textContent).not.toContain('¿Salir del registro?')
    clickPorTexto('Salir')
    expect(document.body.textContent).toContain('¿Salir del registro?')
    // Preguntar no es salir.
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('dice que lo escrito no se pierde, que es lo único que importa antes de irse', () => {
    act(() => root.render(<SalirDelRegistro />))
    clickPorTexto('Salir')
    expect(document.body.textContent).toContain('sigues')
  })

  it('«Seguir aquí» cierra el diálogo sin salir', () => {
    act(() => root.render(<SalirDelRegistro />))
    clickPorTexto('Salir')
    clickPorTexto('Seguir aquí')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('confirmar suelta el borrador y manda a /auth', async () => {
    const onAntesDeSalir = vi.fn()
    act(() => root.render(<SalirDelRegistro onAntesDeSalir={onAntesDeSalir} />))
    clickPorTexto('Salir')

    // El segundo «Salir» es el del diálogo.
    const confirmar = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Salir',
    )
    await act(async () => {
      confirmar[confirmar.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onAntesDeSalir).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })

  it('si limpiar el borrador falla, igual deja salir', async () => {
    const onAntesDeSalir = vi.fn(() => {
      throw new Error('localStorage bloqueado')
    })
    act(() => root.render(<SalirDelRegistro onAntesDeSalir={onAntesDeSalir} />))
    clickPorTexto('Salir')

    const confirmar = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Salir',
    )
    await act(async () => {
      confirmar[confirmar.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })
})
